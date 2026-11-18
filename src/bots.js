'use strict'

const { EventEmitter } = require('node:events')

function rng(seed) {
  let n = (Number(seed) || 1) >>> 0
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296 }
}
function pattern(value, fallback) {
  if (value instanceof RegExp) return value
  return new RegExp(value || fallback, 'i')
}
function renderCommand(template, password) {
  return template.replace(/\{password\}/g, () => password)
}

/** A rate-limited group of offline Mineflayer clients. Server auth must be confirmed by a configured success message. */
class BotManager extends EventEmitter {
  constructor(config, emit = () => {}, botFactory) {
    super()
    this.config = config
    this.notify = emit
    this.botFactory = botFactory || (options => require(config.protocolAdapter === 'experimental-26.3' ? '@wp2508/mineflayer' : 'mineflayer').createBot(options))
    this.random = rng(config.seed)
    this.bots = new Map()
    this.target = 0
    this.behavior = 'idle'
    this.stopped = false
    this.counter = 0
    this.nextAttempt = new Map()
    this.failures = new Map()
    this.botStates = new Map()
    this.lastSpawn = 0
    this.stats = { attempts: 0, connectedTotal: 0, registrations: 0, authSuccess: 0, authFailures: 0, failedConnections: 0, disconnects: 0, reconnects: 0, chatTestSent: 0, packetsIn: 0, packetsOut: 0, connectTimeMsTotal: 0, authTimeMsTotal: 0 }
    this.timer = setInterval(() => this.reconcile(), 100)
    this.timer.unref?.()
  }
  event(type, details = {}) {
    const item = { time: new Date().toISOString(), type, ...details }
    if (item.username) {
      const match = item.username.match(/(\d+)$/)
      if (match) {
        const id = Number(match[1]) - 1
        const previous = this.botStates.get(id) || { id, username: item.username, attempts: 0, reconnects: 0, chatTestSent: false }
        const state = { ...previous, username: item.username, lastEvent: type, updatedAt: item.time }
        if (type === 'connecting') { state.status = 'connecting'; state.attempts = item.attempt || state.attempts + 1; state.reconnects = Math.max(0, state.attempts - 1) }
        else if (type === 'connected') state.status = 'connected'
        else if (type === 'spawned') state.status = 'spawned'
        else if (type === 'auth_command') { state.status = 'authenticating'; state.authMode = item.command }
        else if (type === 'authenticated') state.status = 'authenticated'
        else if (type === 'auth_failure') { state.status = 'auth failed'; state.reason = item.reason }
        else if (type === 'chat_test_sent') { state.chatTestSent = true; if (state.status !== 'authenticated') state.status = 'chat sent'; this.stats.chatTestSent++ }
        else if (type === 'chat_test_error') state.reason = 'chat test could not be sent'
        else if (type === 'kicked') { state.status = 'kicked'; state.reason = item.reason || 'server kick' }
        else if (type === 'error') { state.status = 'connection error'; state.reason = item.reason || 'client error' }
        else if (type === 'disconnected') {
          state.reason = item.reason
          const failures = this.failures.get(id) || 0
          state.status = item.intentional ? (this.stopped ? 'stopped' : 'disconnected') : failures <= (this.config.maxReconnects ?? 2) ? 'reconnecting' : 'failed'
          state.reconnects = Math.max(0, failures)
        }
        this.botStates.set(id, state)
      }
    }
    this.emit('event', item)
    this.notify(item)
  }
  setTarget(count, behavior = this.behavior) {
    if (!Number.isInteger(count) || count < 0 || count > this.config.maxBots) throw new Error('target exceeds maxBots or is invalid')
    this.target = count
    this.behavior = behavior
    for (const [id, rec] of this.bots) {
      rec.mode = this.modeFor(id)
      if (id >= count) this.close(rec, 'stage reduction')
    }
    this.reconcile()
  }
  modeFor(id) {
    const b = this.behavior
    if (typeof b === 'string') return b
    if (b && typeof b.mode === 'string') return b.mode
    if (b && typeof b === 'object') {
      const entries = Object.entries(b).filter(([, w]) => Number.isFinite(w) && w > 0)
      const total = entries.reduce((sum, [, w]) => sum + w, 0)
      if (total) { let x = (rng((Number(this.config.seed) || 1) + id + 1)()) * total; for (const [mode, weight] of entries) { x -= weight; if (x < 0) return mode } }
    }
    return 'idle'
  }
  reconcile() {
    if (this.stopped) return
    const interval = 1000 / (this.config.spawnRate || 1)
    if (Date.now() - this.lastSpawn < interval) return
    for (let id = 0; id < this.target; id++) {
      if (this.bots.has(id) || (this.nextAttempt.get(id) || 0) > Date.now()) continue
      const maxRetries = this.config.maxReconnects ?? 2
      if ((this.failures.get(id) || 0) > maxRetries) continue
      this.lastSpawn = Date.now()
      this.connect(id)
      return
    }
  }
  connect(id) {
    const username = `${this.config.usernamePrefix || 'LoadBot'}${String(id + 1).padStart(3, '0')}`
    const failures = this.failures.get(id) || 0
    if (failures) this.stats.reconnects++
    this.stats.attempts++
    const rec = { id, username, mode: this.modeFor(id), started: Date.now(), authStarted: 0, authenticated: false, connected: false, spawned: false, registered: false, closed: false, intentional: false, commandSent: false, timers: [] }
    this.bots.set(id, rec)
    this.event('connecting', { username, attempt: failures + 1 })
    let bot
    try {
      bot = this.botFactory({ host: this.config.host, port: this.config.port, version: this.config.version, username, auth: 'offline', hideErrors: true })
      rec.bot = bot
    } catch (_) { this.finish(rec, 'connection setup failed'); return }
    const timeout = setTimeout(() => { if (!rec.connected) this.close(rec, 'connection timeout', false) }, this.config.connectTimeoutMs || 30000)
    rec.timers.push(timeout)
    bot.on('login', () => {
      if (rec.closed) return
      rec.connected = true
      this.stats.connectedTotal++
      this.stats.connectTimeMsTotal += Date.now() - rec.started
      this.event('connected', { username })
      const spawnTimeout = setTimeout(() => { if (!rec.spawned) this.close(rec, 'spawn timeout', false) }, this.config.spawnTimeoutMs || 45000)
      rec.spawnTimer = spawnTimeout
      rec.timers.push(spawnTimeout)
    })
    bot.on('spawn', () => {
      if (rec.closed || rec.authStarted) return
      rec.spawned = true
      if (rec.spawnTimer) clearTimeout(rec.spawnTimer)
      this.event('spawned', { username })
      rec.authStarted = Date.now()
      const auth = this.config.auth || {}
      if (auth.chatTestOnly) {
        const delay = setTimeout(() => {
          if (rec.closed) return
          const message = String(auth.chatTestMessage || 'LoadTest: {username} chat test').replace(/\{username\}/g, () => rec.username)
          try { rec.bot.chat(message); this.event('chat_test_sent', { username: rec.username }) }
          catch (_) { this.event('chat_test_error', { username: rec.username }) }
          this.startMovement(rec)
        }, auth.chatTestDelayMs ?? 3000)
        rec.timers.push(delay)
        return
      }
      if (auth.enabled === false) return this.authenticate(rec)
      const wait = setTimeout(() => {
        if (!rec.authenticated) { this.stats.authFailures++; this.event('auth_failure', { username: rec.username, reason: 'authentication timeout' }); this.close(rec, 'authentication timeout', false) }
      }, auth.timeoutMs || 30000)
      rec.timers.push(wait)
      for (const message of rec.pendingMessages || []) this.authMessage(rec, message)
      rec.pendingMessages = []
      if (auth.initialCommand === 'register' || auth.initialCommand === 'login') {
        const delay = setTimeout(() => this.sendAuth(rec, auth.initialCommand), auth.initialDelayMs ?? 1500)
        rec.timers.push(delay)
      }
    })
    bot.on('messagestr', message => {
      const text = this.redact(String(message))
      this.event('chat_message', { username, message: text })
      this.authMessage(rec, String(message))
    })
    bot.on('error', () => {
      if (rec.closed) return
      this.event('error', { username, reason: 'client error' })
      this.close(rec, 'client error', false)
    })
    bot.on('kicked', reason => {
      if (rec.closed) return
      const safeReason = this.redact(typeof reason === 'string' ? reason : JSON.stringify(reason || 'server kick'))
      this.event('kicked', { username, reason: safeReason })
      this.close(rec, 'server kick', false)
    })
    bot.on('end', () => this.finish(rec, 'disconnected'))
    if (bot._client?.on) {
      bot._client.on('packet', () => { this.stats.packetsIn++ })
      // Count packets using the public write entry point without inspecting payloads.
      const write = bot._client.write
      if (typeof write === 'function') bot._client.write = (...args) => { this.stats.packetsOut++; return write.apply(bot._client, args) }
    }
  }
  redact(text) {
    const password = this.config.auth?.password
    return password ? String(text).split(password).join('[hidden]') : String(text)
  }
  authMessage(rec, text) {
    if (rec.closed || rec.authenticated) return
    const a = this.config.auth || {}
    if (a.chatTestOnly) return
    // A plugin can send its prompt before spawn; never send before the client is in play.
    if (!rec.authStarted) { (rec.pendingMessages ||= []).push(text); if (rec.pendingMessages.length > 10) rec.pendingMessages.shift(); return }
    if (pattern(a.success, '(successfully (logged in|registered)|login successful|registration successful)').test(text)) return this.authenticate(rec)
    if (pattern(a.failure, '(incorrect password|wrong password|authentication failed)').test(text)) {
      this.stats.authFailures++; this.event('auth_failure', { username: rec.username, reason: 'authentication rejected' }); return this.close(rec, 'authentication rejected', false)
    }
    if (a.fixedMode) return
    if (pattern(a.registerPrompt, '(?:/register|please register)').test(text)) this.sendAuth(rec, 'register')
    else if (pattern(a.loginPrompt, '(?:/login|please log ?in)').test(text)) this.sendAuth(rec, 'login')
  }
  sendAuth(rec, type) {
    if (rec.closed || rec.authenticated || rec.commandSent) return
    const a = this.config.auth || {}
    if (!a.password) { this.stats.authFailures++; return this.close(rec, 'missing authentication password', false) }
    const template = type === 'register' ? (a.registerCommand || '/register {password} {password}') : (a.loginCommand || '/login {password}')
    rec.commandSent = true
    rec.registered = type === 'register'
    try { rec.bot.chat(renderCommand(template, a.password)); this.event('auth_command', { username: rec.username, command: type }) }
    catch (_) { this.stats.authFailures++; this.close(rec, 'authentication command failed', false) }
  }
  authenticate(rec) {
    if (rec.closed || rec.authenticated) return
    rec.authenticated = true
    this.stats.authSuccess++
    if (rec.registered) this.stats.registrations++
    this.stats.authTimeMsTotal += Date.now() - rec.authStarted
    this.event('authenticated', { username: rec.username })
    const auth = this.config.auth || {}
    if (auth.chatTestMessage) {
      const delay = setTimeout(() => this.sendChatTest(rec, auth.chatTestMessage), auth.chatAfterSuccessDelayMs ?? 500)
      rec.timers.push(delay)
    }
    this.startMovement(rec)
  }
  sendChatTest(rec, template) {
    if (rec.closed) return
    const message = String(template).replace(/\{username\}/g, () => rec.username)
    try { rec.bot.chat(message); this.event('chat_test_sent', { username: rec.username }) }
    catch (_) { this.event('chat_test_error', { username: rec.username }) }
  }
  startMovement(rec) {
    const movement = this.config.movement || {}
    const interval = Math.max(250, movement.intervalMs || 1500)
    let previous = null
    const update = () => {
      const bot = rec.bot
      if (rec.closed || (!rec.authenticated && !this.config.auth?.chatTestOnly) || !bot.entity?.position) return
      const mode = rec.mode
      if (mode === 'idle') { this.clearControls(bot); return }
      const p = bot.entity.position
      const areas = movement.areas || movement.locations || []
      const center = (['distributed', 'farm'].includes(mode) && areas.length ? areas[rec.id % areas.length] : movement.center) || rec.origin || { x: p.x, y: p.y, z: p.z }
      if (!rec.origin) rec.origin = { x: p.x, y: p.y, z: p.z }
      const radius = center.radius || movement.radius || 32
      const dx = center.x - p.x, dz = center.z - p.z
      const bounds = movement.bounds
      const out = bounds && (p.x < bounds.minX || p.x > bounds.maxX || p.z < bounds.minZ || p.z > bounds.maxZ)
      let angle = this.random() * Math.PI * 2
      if (out || Math.hypot(dx, dz) > radius) angle = Math.atan2(-dx, -dz)
      // Avoid walking into solid blocks or off an obvious ledge when terrain is loaded.
      let blocked = false
      if (typeof bot.blockAt === 'function' && typeof p.offset === 'function') {
        const x = -Math.sin(angle), z = -Math.cos(angle)
        const ahead = bot.blockAt(p.offset(x, 0, z))
        const below = bot.blockAt(p.offset(x, -1, z))
        blocked = !!(ahead && ahead.boundingBox === 'block') || !!(below && (below.name === 'lava' || below.name === 'water' || below.boundingBox === 'empty'))
        if (blocked) angle += Math.PI / 2 + this.random() * Math.PI
      }
      // Mineflayer yaw zero points toward negative Z.
      if (typeof bot.look === 'function') Promise.resolve(bot.look(angle, (this.random() - .5) * .3, true)).catch(() => {})
      const stuck = previous && Math.hypot(p.x - previous.x, p.z - previous.z) < .3
      previous = { x: p.x, z: p.z }
      const stop = mode !== 'high' && this.random() < .15
      bot.setControlState('forward', !stop)
      bot.setControlState('sprint', !stop && this.random() < (mode === 'high' ? .6 : .15))
      bot.setControlState('jump', !stop && (stuck || (blocked && this.random() < .5) || this.random() < .12))
      if (stuck) bot.setControlState('forward', false)
    }
    const timer = setInterval(() => { try { update() } catch (_) { this.event('behavior_error', { username: rec.username }) } }, interval)
    rec.timers.push(timer)
    update()
  }
  clearControls(bot) {
    if (typeof bot.clearControlStates === 'function') bot.clearControlStates()
    else if (typeof bot.setControlState === 'function') for (const key of ['forward', 'sprint', 'jump']) bot.setControlState(key, false)
  }
  close(rec, reason, intentional = true) {
    if (rec.closed) return
    rec.intentional = intentional
    try { this.clearControls(rec.bot); rec.bot?.quit(reason) } catch (_) {}
    this.finish(rec, reason)
  }
  finish(rec, reason) {
    if (rec.closed) return
    rec.closed = true
    for (const timer of rec.timers) { clearTimeout(timer); clearInterval(timer) }
    this.bots.delete(rec.id)
    if (!rec.intentional) {
      if (rec.connected) this.stats.disconnects++; else this.stats.failedConnections++
      const failures = (this.failures.get(rec.id) || 0) + 1
      this.failures.set(rec.id, failures)
      this.nextAttempt.set(rec.id, Date.now() + Math.min(30000, (this.config.reconnectDelayMs || 3000) * 2 ** (failures - 1)))
    }
    this.event('disconnected', { username: rec.username, reason, intentional: rec.intentional })
  }
  snapshot() {
    const clients = [...this.bots.values()]
    const latencies = clients.map(r => r.bot?.player?.ping).filter(Number.isFinite)
    const activeById = new Map(clients.map(rec => [rec.id, rec]))
    const bots = [...this.botStates.values()].map(bot => ({ ...bot, ping: activeById.get(bot.id)?.bot?.player?.ping ?? null })).sort((a, b) => a.id - b.id)
    return { ...this.stats, target: this.target, connected: clients.filter(r => r.connected).length, authenticated: clients.filter(r => r.authenticated).length, connecting: clients.filter(r => !r.connected).length, latencyMs: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null, avgConnectMs: this.stats.connectedTotal ? this.stats.connectTimeMsTotal / this.stats.connectedTotal : null, avgAuthMs: this.stats.authSuccess ? this.stats.authTimeMsTotal / this.stats.authSuccess : null, bots }
  }
  stop() { this.stopped = true; this.target = 0; clearInterval(this.timer); for (const rec of [...this.bots.values()]) this.close(rec, 'test complete') }
}
module.exports = { BotManager, renderCommand }

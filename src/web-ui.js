'use strict'

const http = require('node:http')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { BotManager } = require('./bots')
const { resolveTargetInput, formatTarget } = require('./target')

const MAX_BOTS = 100
const MAX_BODY_BYTES = 32768

function page(token) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Minecraft Load Test</title>
<style>
:root{color-scheme:dark;--bg:#0b1117;--panel:#111b24;--panel2:#0d151d;--line:#263746;--text:#e8f0f5;--muted:#9aadb9;--green:#61d6a7;--blue:#80baff;--red:#ff7f87;--amber:#f3c56b}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 70% -20%,#19334a 0,transparent 45%),var(--bg);color:var(--text);font:14px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1440px;margin:0 auto;padding:30px 28px 48px}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px}.eyebrow{color:var(--green);font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.title{margin:5px 0 0;font-size:clamp(26px,4vw,38px);letter-spacing:-.04em}.subtitle{color:var(--muted);margin:7px 0 0}.badge{border:1px solid var(--line);border-radius:999px;padding:8px 13px;color:var(--muted);white-space:nowrap}.badge.live{color:var(--green);border-color:#28694e;background:#10261d}.layout{display:grid;grid-template-columns:minmax(290px,350px) minmax(0,1fr);gap:18px}.panel{background:linear-gradient(160deg,#14202b,var(--panel) 55%);border:1px solid var(--line);border-radius:16px;box-shadow:0 14px 44px #0003}.controls{padding:20px;height:max-content;position:sticky;top:18px}.panel h2{font-size:15px;margin:0 0 16px;letter-spacing:-.01em}.field{display:block;margin:15px 0}.field[hidden]{display:none}.field span{display:block;color:#bdcbd4;font-weight:650;font-size:12px;margin-bottom:7px}input,select{width:100%;border:1px solid #304453;border-radius:9px;background:#0b141c;color:var(--text);padding:11px 12px;font:inherit;outline:none}input:focus,select:focus{border-color:var(--blue);box-shadow:0 0 0 3px #80baff20}.hint{font-size:11px;color:var(--muted);margin-top:6px}.check{border:1px solid #5f4c22;background:#272012;border-radius:10px;color:#f0d999;padding:11px 12px;font-size:12px;margin:18px 0}.actions{display:flex;gap:9px}button{border:0;border-radius:9px;padding:11px 15px;font:700 13px inherit;cursor:pointer}button.primary{background:var(--green);color:#07130e;flex:1}button.stop{background:#4a2026;color:#ffdadd;border:1px solid #79353d}button:disabled{opacity:.45;cursor:not-allowed}.notice{min-height:20px;color:var(--muted);font-size:12px;margin:10px 0 0}.notice.error{color:var(--red)}.notice.ok{color:var(--green)}.maincol{min-width:0}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:16px}.stat{padding:15px 16px}.stat label{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em}.stat strong{display:block;font-size:24px;margin-top:4px;letter-spacing:-.03em}.stat small{color:var(--muted)}.target-line{padding:13px 16px;margin-bottom:16px;color:#bfd1dc;word-break:break-all}.target-line b{color:var(--text)}.cols{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:16px}.section{padding:17px;min-width:0}.sectionhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.sectionhead h2{margin:0}.counter{color:var(--muted);font-size:11px}.tablewrap{max-height:420px;overflow:auto;border:1px solid var(--line);border-radius:10px}table{width:100%;border-collapse:collapse;font-size:12px}th{position:sticky;top:0;background:#14212c;color:var(--muted);text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em}th,td{padding:9px 10px;border-bottom:1px solid #20303d;white-space:nowrap}tbody tr:last-child td{border-bottom:0}.status{display:inline-flex;align-items:center;gap:6px}.dot{height:7px;width:7px;border-radius:50%;background:#84939d}.dot.good{background:var(--green);box-shadow:0 0 8px #61d6a755}.dot.warn{background:var(--amber)}.dot.bad{background:var(--red)}.feeds{display:grid;grid-template-rows:minmax(245px,1fr) minmax(145px,.7fr);gap:14px}.feedbox{height:290px;overflow:auto;background:#081018;border:1px solid #21313d;border-radius:10px;padding:9px}.feedrow{display:grid;grid-template-columns:65px minmax(74px,auto) 1fr;gap:8px;border-bottom:1px solid #17242e;padding:7px 2px;font-size:11px}.feedrow:last-child{border-bottom:0}.time{color:#718692}.botname{color:var(--blue);font-weight:700;overflow:hidden;text-overflow:ellipsis}.message{color:#d5e0e6;overflow-wrap:anywhere;white-space:pre-wrap}.empty{color:#738793;text-align:center;padding:32px 10px;font-size:12px}.eventrow{display:grid;grid-template-columns:65px 115px 1fr;gap:8px;padding:6px 2px;border-bottom:1px solid #17242e;font-size:10px}.eventrow .message{color:#a8b7c0}.footer{color:#71838d;font-size:11px;margin-top:18px;text-align:center}@media(max-width:1050px){.cols{grid-template-columns:1fr}.feeds{grid-template-columns:1fr 1fr;grid-template-rows:1fr}.feedbox{height:260px}}@media(max-width:760px){main{padding:20px 14px}.layout{grid-template-columns:1fr}.controls{position:static}.stats{grid-template-columns:repeat(2,1fr)}.top{display:block}.badge{display:inline-block;margin-top:15px}.feeds{grid-template-columns:1fr}.feedbox{height:230px}}
</style></head><body><main>
<header class="top"><div><div class="eyebrow">Private clone diagnostics</div><h1 class="title">Minecraft Load Test</h1><p class="subtitle">Watch connections, authentication and each bot’s server chat in real time.</p></div><div id="runBadge" class="badge">Idle · waiting for a run</div></header>
<div class="layout"><aside class="panel controls"><h2>Start a test</h2><form id="startForm">
<label class="field"><span>Bot count</span><input id="count" type="number" min="1" max="100" value="20" required><div class="hint">Connects at one bot per second. Maximum 100.</div></label>
<label class="field"><span>Clone server address</span><input id="target" type="text" placeholder="play.example.net or example.net:25570" required><div class="hint">Domains use the Minecraft SRV record when no port is entered. IPs default to 25565.</div></label>
<label class="field"><span>Test mode</span><select id="mode"><option value="chat">Chat only (skip authentication)</option><option value="login">Login existing accounts · L · /login</option><option value="register">Register new accounts · R · /register</option></select></label>
<label class="field"><span>Bot movement</span><select id="movement"><option value="stationary">Stationary</option><option value="wander">Wander within 32 blocks</option><option value="continuous">Continuous movement</option></select><div class="hint">Movement starts after the chat marker in chat-only mode.</div></label>
<label class="field" id="passwordField" hidden><span>Shared test password</span><input id="password" type="password" autocomplete="new-password" maxlength="128" placeholder="Hidden from dashboard logs"><div class="hint">Sent privately to the clone’s auth plugin. It is not written to a file.</div></label>
<label class="field"><span>Confirmation</span><input id="confirm" type="text" autocomplete="off" placeholder="Type YES to start" required></label>
<div class="check">Run this only on an isolated clone you administer. Bots will connect to the resolved target shown in the dashboard.</div>
<div class="actions"><button id="startButton" class="primary" type="submit">Start test</button><button id="stopButton" class="stop" type="button" disabled>Stop</button></div><div id="notice" class="notice" role="status"></div></form></aside>
<section class="maincol"><div class="stats">
<div class="panel stat"><label>Connected</label><strong id="connected">0 / 0</strong><small>active clients</small></div><div class="panel stat"><label>Authenticated</label><strong id="authenticated">0</strong><small id="authModeLabel">chat-only skips auth</small></div><div class="panel stat"><label>Chat markers</label><strong id="chatSent">0</strong><small>sent successfully</small></div><div class="panel stat"><label>Failed attempts</label><strong id="failed">0</strong><small>retries up to 5 times</small></div>
</div><div class="panel target-line"><b>Resolved target:</b> <span id="resolvedTarget">—</span> <span id="modeSummary"></span></div>
<div class="cols"><section class="panel section"><div class="sectionhead"><h2>Bot status</h2><span id="botCount" class="counter">0 bots</span></div><div class="tablewrap"><table><thead><tr><th>Bot</th><th>Status</th><th>Attempts</th><th>Retries</th><th>Ping</th><th>Last detail</th></tr></thead><tbody id="botRows"><tr><td colspan="6" class="empty">Bots appear here after a test starts.</td></tr></tbody></table></div></section>
<div class="feeds"><section class="panel section"><div class="sectionhead"><h2>Incoming chat</h2><span id="chatCount" class="counter">0 messages</span></div><div id="chatFeed" class="feedbox"><div class="empty">Server messages received by bots will appear here.</div></div></section><section class="panel section"><div class="sectionhead"><h2>Activity</h2><span id="eventCount" class="counter">0 events</span></div><div id="eventFeed" class="feedbox"><div class="empty">Connection and authentication events will appear here.</div></div></section></div></div></section></div>
<div class="footer">Local dashboard · bound to 127.0.0.1 · passwords are masked in chat and never included in dashboard events</div></main>
<script>
const TOKEN='${token}';const $=id=>document.getElementById(id);let events=[],chats=[],latestState={};
const escTime=value=>{try{return new Date(value).toLocaleTimeString()}catch{return ''}};
function statusClass(status){if(['authenticated','spawned','connected','chat sent'].includes(status))return 'good';if(['failed','auth failed','kicked','connection error'].includes(status))return 'bad';if(['connecting','reconnecting','authenticating'].includes(status))return 'warn';return ''}
function drawState(s){latestState=s||{};const r=s.stats||{};$('connected').textContent=(r.connected||0)+' / '+(r.target||0);$('authenticated').textContent=r.authenticated||0;$('chatSent').textContent=r.chatTestSent||0;$('failed').textContent=r.failedConnections||0;$('resolvedTarget').textContent=s.target||'—';$('modeSummary').textContent=s.mode?(' · '+s.mode+' · '+(s.movement||'stationary')):'';$('authModeLabel').textContent=s.mode==='chat'?'chat-only skips auth':(s.mode==='register'?'register successes':'login successes');$('botCount').textContent=(r.bots||[]).length+' bots';$('runBadge').textContent=s.running?'Running · '+(s.mode||'')+' · '+(s.movement||'stationary'): 'Idle · waiting for a run';$('runBadge').classList.toggle('live',!!s.running);$('startButton').disabled=!!s.running;$('stopButton').disabled=!s.running;
const rows=r.bots||[];$('botRows').replaceChildren();if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.className='empty';td.textContent='Bots appear here after a test starts.';tr.append(td);$('botRows').append(tr)}else for(const b of rows){const tr=document.createElement('tr');const name=document.createElement('td');name.textContent=b.username;const st=document.createElement('td'),span=document.createElement('span'),dot=document.createElement('i');span.className='status';dot.className='dot '+statusClass(b.status);span.append(dot,document.createTextNode(b.status||'waiting'));st.append(span);const attempt=document.createElement('td');attempt.textContent=String(b.attempts||0);const retries=document.createElement('td');retries.textContent=String(b.reconnects||0);const ping=document.createElement('td');ping.textContent=b.ping==null?'—':Math.round(b.ping)+' ms';const detail=document.createElement('td');detail.textContent=b.reason||b.authMode||'';tr.append(name,st,attempt,retries,ping,detail);$('botRows').append(tr)}drawFeeds()}
function drawFeeds(){ $('chatCount').textContent=chats.length+' messages';$('eventCount').textContent=events.length+' events';drawFeed('chatFeed',chats,'No server messages received yet.','chat');drawFeed('eventFeed',events,'No activity yet.','event') }
function drawFeed(id,list,empty,type){const box=$(id);box.replaceChildren();if(!list.length){const d=document.createElement('div');d.className='empty';d.textContent=empty;box.append(d);return}for(const e of list.slice(-250)){const row=document.createElement('div');row.className=type==='chat'?'feedrow':'eventrow';const time=document.createElement('span');time.className='time';time.textContent=escTime(e.time);const who=document.createElement('span');who.className=type==='chat'?'botname':'botname';who.textContent=type==='chat'?e.username:(e.username||'system');const msg=document.createElement('span');msg.className='message';msg.textContent=type==='chat'?e.message:(e.type+(e.reason?': '+e.reason:e.command?': '+e.command:''));row.append(time,who,msg);box.append(row)}box.scrollTop=box.scrollHeight}
function receive(e){if(e.type==='chat_message'){chats.push(e);if(chats.length>500)chats.shift()}else{events.push(e);if(events.length>300)events.shift()}drawFeeds()}
async function refresh(){try{const r=await fetch('/api/state',{headers:{'x-session-token':TOKEN},cache:'no-store'});if(r.ok){const s=await r.json();drawState(s);if(s.chatMessages){chats=s.chatMessages;events=s.recentEvents||[];drawFeeds()}}}catch{}}
$('mode').addEventListener('change',()=>{$('passwordField').hidden=$('mode').value==='chat'});
$('startForm').addEventListener('submit',async ev=>{ev.preventDefault();const n=$('notice');n.className='notice';n.textContent='Resolving target and starting…';const body={count:Number($('count').value),target:$('target').value.trim(),mode:$('mode').value,movement:$('movement').value,password:$('password').value,confirmation:$('confirm').value.trim()};try{const r=await fetch('/api/start',{method:'POST',headers:{'content-type':'application/json','x-session-token':TOKEN},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not start test.');$('password').value='';$('confirm').value='';n.className='notice ok';n.textContent='Started against '+data.target;chats=[];events=[];await refresh()}catch(err){n.className='notice error';n.textContent=err.message}});
$('stopButton').addEventListener('click',async()=>{try{await fetch('/api/stop',{method:'POST',headers:{'x-session-token':TOKEN}});$('notice').className='notice';$('notice').textContent='Stopping bots…';await refresh()}catch{}});
async function init(){await refresh();const source=new EventSource('/api/events?token='+encodeURIComponent(TOKEN));source.onmessage=ev=>{try{const d=JSON.parse(ev.data);if(d.kind==='event')receive(d.event);else if(d.kind==='state')drawState(d.state)}catch{}};setInterval(refresh,5000)}init();
</script></body></html>`
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) { reject(new Error('Request is too large.')); req.destroy() }
    })
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')) } catch { reject(new Error('Invalid JSON request.')) }
    })
    req.on('error', reject)
  })
}

function startWebUI() {
  const token = crypto.randomBytes(32).toString('hex')
  const clients = new Set()
  let manager = null
  let running = false
  let targetLabel = ''
  let modeLabel = ''
  let movementLabel = ''
  let startedAt = null
  let recentEvents = []
  let chatMessages = []

  const state = (includeFeeds = false) => ({
    running, target: targetLabel, mode: modeLabel, movement: movementLabel, startedAt,
    stats: manager ? manager.snapshot() : { target: 0, connected: 0, authenticated: 0, failedConnections: 0, chatTestSent: 0, bots: [] },
    ...(includeFeeds ? { recentEvents: recentEvents.slice(-300), chatMessages: chatMessages.slice(-500) } : {})
  })
  const broadcast = payload => {
    const data = `data: ${JSON.stringify(payload)}\n\n`
    for (const client of clients) { try { client.write(data) } catch { clients.delete(client) } }
  }
  const safeJson = (res, code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
    res.end(JSON.stringify(obj))
  }
  const tokenOk = req => req.headers['x-session-token'] === token || (() => { try { return new URL(req.url, 'http://localhost').searchParams.get('token') === token } catch { return false } })()
  const allowedOrigin = req => {
    const origin = req.headers.origin
    if (!origin) return true
    try { return new URL(origin).host === req.headers.host } catch { return false }
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" })
      res.end(page(token)); return
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      if (!tokenOk(req)) return safeJson(res, 403, { error: 'Invalid dashboard session.' })
      return safeJson(res, 200, state(true))
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      if (!tokenOk(req)) { res.writeHead(403); return res.end() }
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' })
      res.write(`data: ${JSON.stringify({ kind: 'state', state: state(false) })}\n\n`)
      clients.add(res)
      res.on('close', () => clients.delete(res))
      return
    }
    if (req.method === 'POST' && (url.pathname === '/api/start' || url.pathname === '/api/stop')) {
      if (!tokenOk(req) || !allowedOrigin(req)) return safeJson(res, 403, { error: 'Invalid dashboard session or origin.' })
      if (url.pathname === '/api/stop') {
        if (manager && running) { running = false; manager.stop(); broadcast({ kind: 'state', state: state(false) }) }
        return safeJson(res, 200, { ok: true })
      }
      if (running) return safeJson(res, 409, { error: 'A test is already running. Stop it before starting another.' })
      let body
      try { body = await readJsonBody(req) } catch (error) { return safeJson(res, 400, { error: error.message }) }
      const count = Number(body.count)
      if (!Number.isInteger(count) || count < 1 || count > MAX_BOTS) return safeJson(res, 400, { error: `Choose a whole number from 1 to ${MAX_BOTS}.` })
      if (body.confirmation !== 'YES') return safeJson(res, 400, { error: 'Type YES in the confirmation field to start.' })
      if (!['chat', 'login', 'register'].includes(body.mode)) return safeJson(res, 400, { error: 'Choose chat, login, or register mode.' })
      if (!['stationary', 'wander', 'continuous'].includes(body.movement)) return safeJson(res, 400, { error: 'Choose stationary, wander, or continuous movement.' })
      if (body.mode !== 'chat' && (typeof body.password !== 'string' || !body.password.length || body.password.length > 128)) return safeJson(res, 400, { error: 'Enter a test password of 1 to 128 characters.' })
      let target
      try { target = await resolveTargetInput(String(body.target || '')) } catch (error) { return safeJson(res, 400, { error: error.message }) }
      let commands = {}
      if (body.mode !== 'chat') {
        try { commands = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'login-commands.json'), 'utf8')) }
        catch { return safeJson(res, 500, { error: 'Could not read login-commands.json.' }) }
      }
      const auth = body.mode === 'chat'
        ? { chatTestOnly: true, chatTestDelayMs: 3000, chatTestMessage: 'LoadTest: {username} chat test' }
        : {
            password: body.password,
            registerCommand: commands.registerCommand,
            loginCommand: commands.loginCommand,
            success: commands.success,
            failure: commands.failure,
            fixedMode: true,
            initialCommand: body.mode,
            initialDelayMs: 3000,
            timeoutMs: commands.timeoutMs || 30000,
            chatTestMessage: 'LoadTest: {username} authenticated chat test',
            chatAfterSuccessDelayMs: 500
          }
      targetLabel = formatTarget(target)
      modeLabel = body.mode
      movementLabel = body.movement
      startedAt = new Date().toISOString()
      recentEvents = []
      chatMessages = []
      running = true
      const config = {
        host: target.host, port: target.port, version: '26.3', protocolAdapter: 'experimental-26.3',
        maxBots: count, spawnRate: 1, maxReconnects: 5, reconnectDelayMs: 1500, connectTimeoutMs: 30000, spawnTimeoutMs: 45000,
        seed: Date.now(), auth,
        movement: { intervalMs: 1500, radius: 32 }
      }
      try {
        require.resolve('@wp2508/mineflayer')
        manager = new BotManager(config, item => {
          if (item.type === 'chat_message') { chatMessages.push(item); if (chatMessages.length > 500) chatMessages.shift() }
          else { recentEvents.push(item); if (recentEvents.length > 300) recentEvents.shift() }
          broadcast({ kind: 'event', event: item })
          broadcast({ kind: 'state', state: state(false) })
        })
        manager.setTarget(count, ({ stationary: 'idle', wander: 'low', continuous: 'high' })[body.movement])
      } catch (error) {
        running = false
        manager?.stop()
        manager = null
        return safeJson(res, 500, { error: error.code === 'MODULE_NOT_FOUND' ? 'Install the project dependencies with npm install first.' : 'Could not start the bot manager.' })
      }
      broadcast({ kind: 'state', state: state(false) })
      return safeJson(res, 200, { ok: true, target: targetLabel })
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Not found')
  })

  const rawPort = Number(process.env.MC_LOADTEST_UI_PORT || 8787)
  if (!Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65535) throw new Error('MC_LOADTEST_UI_PORT must be between 1 and 65535.')
  server.on('clientError', (_error, socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'))
  server.listen(rawPort, '127.0.0.1', () => {
    const address = server.address()
    console.log(`Minecraft Load Test dashboard: http://127.0.0.1:${address.port}`)
    console.log('Bound to loopback only. Press Ctrl-C here to stop the dashboard and any active bots.')
  })
  const heartbeat = setInterval(() => broadcast({ kind: 'state', state: state(false) }), 2000)
  server.on('error', error => {
    console.error(`Dashboard server error: ${error.code || 'unknown error'}`)
    clearInterval(heartbeat)
    process.exitCode = 1
  })
  const shutdown = () => {
    clearInterval(heartbeat)
    if (manager && running) { running = false; manager.stop() }
    for (const client of clients) client.end()
    clients.clear()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 1000).unref()
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  return server
}

module.exports = { startWebUI }

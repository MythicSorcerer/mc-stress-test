'use strict'

const net = require('node:net')
const { resolveSrv } = require('node:dns/promises')

const DEFAULT_PORT = 25565

function validHostname(host) {
  return host.length > 0 && host.length <= 253 && host.split('.').every(label =>
    label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))
}

function parseTarget(input) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Enter a server IP or domain name.')
  const value = input.trim()
  let host = value
  let port = DEFAULT_PORT
  let explicitPort = false
  const bracketed = value.match(/^\[([^\]]+)\](?::(\d+))?$/)
  if (bracketed) {
    host = bracketed[1]
    if (bracketed[2]) { port = Number(bracketed[2]); explicitPort = true }
  } else if (net.isIP(value) === 6) {
    host = value
  } else {
    const withPort = value.match(/^([^:]+):(\d+)$/)
    if (withPort) { host = withPort[1]; port = Number(withPort[2]); explicitPort = true }
  }
  host = host.toLowerCase().replace(/\.$/, '')
  if (net.isIP(host) === 0 && !validHostname(host)) {
    throw new Error('Enter a valid IPv4/IPv6 address or domain name, optionally followed by :port.')
  }
  if (host === '0.0.0.0' || host === '::') throw new Error('That is a wildcard address; enter the clone server IP.')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.')
  return { host, port, explicitPort, input: value }
}

function chooseSrvRecord(records) {
  if (!records.length) return null
  const priority = Math.min(...records.map(r => r.priority))
  const eligible = records.filter(r => r.priority === priority)
  const totalWeight = eligible.reduce((sum, r) => sum + r.weight, 0)
  if (!totalWeight) return eligible[Math.floor(Math.random() * eligible.length)]
  let pick = Math.random() * totalWeight
  for (const record of eligible) {
    pick -= record.weight
    if (pick < 0) return record
  }
  return eligible[eligible.length - 1]
}

async function resolveTarget(target) {
  if (target.explicitPort || net.isIP(target.host)) {
    return { host: target.host, port: target.port, input: target.input, viaSrv: false }
  }
  try {
    const records = await resolveSrv(`_minecraft._tcp.${target.host}`)
    const record = chooseSrvRecord(records)
    if (!record || record.name === '.') throw new Error(`No Minecraft SRV target is configured for ${target.host}.`)
    return {
      host: record.name.replace(/\.$/, ''),
      port: record.port,
      input: target.input,
      viaSrv: true,
      srvRecord: `_minecraft._tcp.${target.host}`
    }
  } catch (error) {
    if (error.message.startsWith('No Minecraft SRV target')) throw error
    if (!['ENODATA', 'ENOTFOUND', 'ESERVFAIL', 'ETIMEOUT'].includes(error.code)) throw error
    return { host: target.host, port: DEFAULT_PORT, input: target.input, viaSrv: false, srvFallback: true }
  }
}

async function resolveTargetInput(input) {
  return resolveTarget(parseTarget(input))
}

function formatTarget(target) {
  const host = net.isIP(target.host) === 6 ? `[${target.host}]` : target.host
  const actual = `${host}:${target.port}`
  if (target.viaSrv) return `${target.input} → ${actual} (SRV)`
  if (target.srvFallback) return `${target.input} → ${actual} (default port; no SRV record)`
  return actual
}

module.exports = { DEFAULT_PORT, parseTarget, resolveTarget, resolveTargetInput, formatTarget }

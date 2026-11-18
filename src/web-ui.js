'use strict'

const http = require('node:http')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { BotManager } = require('./bots')
const { resolveTargetInput, formatTarget } = require('./target')
const { CredentialStore } = require('./credential-store')

const MAX_BOTS = 100
const MAX_BODY_BYTES = 32768

function page(token) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Minecraft Load Test</title>
<style>
:root{color-scheme:dark;--bg:#0b1117;--panel:#111b24;--panel2:#0d151d;--line:#263746;--text:#e8f0f5;--muted:#9aadb9;--green:#61d6a7;--blue:#80baff;--red:#ff7f87;--amber:#f3c56b}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 70% -20%,#19334a 0,transparent 45%),var(--bg);color:var(--text);font:14px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1440px;margin:0 auto;padding:30px 28px 48px}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px}.headerRight{display:flex;align-items:center;gap:10px}.eyebrow{color:var(--green);font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.title{margin:5px 0 0;font-size:clamp(26px,4vw,38px);letter-spacing:-.04em}.subtitle{color:var(--muted);margin:7px 0 0}.badge{border:1px solid var(--line);border-radius:999px;padding:8px 13px;color:var(--muted);white-space:nowrap}.badge.live{color:var(--green);border-color:#28694e;background:#10261d}.layout{display:grid;grid-template-columns:minmax(290px,350px) minmax(0,1fr);gap:18px}.panel{background:linear-gradient(160deg,#14202b,var(--panel) 55%);border:1px solid var(--line);border-radius:16px;box-shadow:0 14px 44px #0003}.controls{padding:20px;height:max-content;position:sticky;top:18px}.panel h2{font-size:15px;margin:0 0 16px;letter-spacing:-.01em}.field{display:block;margin:15px 0}.field[hidden]{display:none}.field span{display:block;color:#bdcbd4;font-weight:650;font-size:12px;margin-bottom:7px}input,select{width:100%;border:1px solid #304453;border-radius:9px;background:#0b141c;color:var(--text);padding:11px 12px;font:inherit;outline:none}input:focus,select:focus{border-color:var(--blue);box-shadow:0 0 0 3px #80baff20}.hint{font-size:11px;color:var(--muted);margin-top:6px}.check{border:1px solid #5f4c22;background:#272012;border-radius:10px;color:#f0d999;padding:11px 12px;font-size:12px;margin:18px 0}.actions{display:flex;gap:9px}.actions button{min-width:0}.actions button.stop{flex:0 0 auto}button{border:0;border-radius:9px;padding:11px 15px;font:inherit;font-weight:700;font-size:13px;cursor:pointer}.themeToggle{background:var(--panel);color:var(--text);border:1px solid var(--line);padding:8px 12px}.themeToggle:hover{border-color:var(--blue)}button.primary{background:var(--green);color:#07130e;flex:1}button.stop{background:#4a2026;color:#ffdadd;border:1px solid #79353d}button:disabled{opacity:.45;cursor:not-allowed}.notice{min-height:20px;color:var(--muted);font-size:12px;margin:10px 0 0}.notice.error{color:var(--red)}.notice.ok{color:var(--green)}.maincol{min-width:0}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:16px}.stat{padding:15px 16px}.stat label{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em}.stat strong{display:block;font-size:24px;margin-top:4px;letter-spacing:-.03em}.stat small{color:var(--muted)}.target-line{padding:13px 16px;margin-bottom:16px;color:#bfd1dc;word-break:break-all}.target-line b{color:var(--text)}.cols{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:16px}.section{padding:17px;min-width:0;min-height:0;overflow:hidden}.sectionhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.sectionhead h2{margin:0}.counter{color:var(--muted);font-size:11px}.tablewrap{max-height:420px;overflow:auto;border:1px solid var(--line);border-radius:10px}table{width:100%;border-collapse:collapse;font-size:12px}th{position:sticky;top:0;background:#14212c;color:var(--muted);text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em}th,td{padding:9px 10px;border-bottom:1px solid #20303d;white-space:nowrap}tbody tr:last-child td{border-bottom:0}.status{display:inline-flex;align-items:center;gap:6px}.dot{height:7px;width:7px;border-radius:50%;background:#84939d}.dot.good{background:var(--green);box-shadow:0 0 8px #61d6a755}.dot.warn{background:var(--amber)}.dot.bad{background:var(--red)}.feeds{display:grid;grid-template-rows:minmax(245px,1fr) minmax(145px,.7fr);gap:14px;min-height:0}.feedbox{height:290px;max-height:290px;min-height:0;overflow:auto;background:#081018;border:1px solid #21313d;border-radius:10px;padding:9px}.feedrow{display:grid;grid-template-columns:65px minmax(74px,auto) 1fr;gap:8px;border-bottom:1px solid #17242e;padding:7px 2px;font-size:11px}.feedrow:last-child{border-bottom:0}.time{color:#718692}.botname{color:var(--blue);font-weight:700;overflow:hidden;text-overflow:ellipsis}.message{color:#d5e0e6;overflow-wrap:anywhere;white-space:pre-wrap}.empty{color:#738793;text-align:center;padding:32px 10px;font-size:12px}.eventrow{display:grid;grid-template-columns:65px 115px minmax(0,1fr);gap:8px;padding:6px 2px;border-bottom:1px solid #17242e;font-size:10px}.eventrow .message{color:#a8b7c0}.footer{color:#71838d;font-size:11px;margin-top:18px;text-align:center}@media(max-width:1050px){.cols{grid-template-columns:1fr}.feeds{grid-template-columns:1fr 1fr;grid-template-rows:1fr}.feedbox{height:260px}}@media(max-width:760px){main{padding:20px 14px}.layout{grid-template-columns:1fr}.controls{position:static}.stats{grid-template-columns:repeat(2,1fr)}.top{display:block}.headerRight{justify-content:flex-start;margin-top:15px;flex-wrap:wrap}.badge{display:inline-block;margin-top:0}.feeds{grid-template-columns:1fr}.feedbox{height:230px}}
body.light{color-scheme:light;--bg:#eff4f7;--panel:#fff;--panel2:#f6f9fb;--line:#cbd8e0;--text:#172631;--muted:#596c78;--green:#087a55;--blue:#1766a8;--red:#b82d38;--amber:#926013;background:radial-gradient(ellipse at 70% -20%,#d7eaf4 0,transparent 48%),var(--bg)}body.light .panel{background:linear-gradient(160deg,#fff,#f7fafc 55%);box-shadow:0 12px 32px #24374612}body.light .field span{color:#304653}body.light input,body.light select{background:#fff;border-color:#c2d0d9}body.light .check{border-color:#e8cf8f;background:#fff8e8;color:#735716}body.light .target-line{color:#405560}body.light th{background:#eaf0f4}body.light th,body.light td{border-bottom-color:#e0e8ed}body.light .tablewrap{border-color:#d5e0e6}body.light .feedbox{background:#f7fafc;border-color:#d5e0e6}body.light .feedrow,body.light .eventrow{border-bottom-color:#e5ecef}body.light .message{color:#253944}body.light .eventrow .message{color:#5b6c76}body.light .time{color:#6e808a}body.light .badge.live{background:#e8f6ef;border-color:#a6d8bf}body.light button.stop{background:#ffedf0;color:#8b2831;border-color:#e4aeb4}
</style></head><body><main>
<header class="top"><div><div class="eyebrow">Private clone diagnostics</div><h1 class="title">Minecraft Load Test</h1><p class="subtitle">Watch connections, authentication and each bot’s server chat in real time.</p></div><div class="headerRight"><button id="themeToggle" class="themeToggle" type="button">Light mode</button><div id="runBadge" class="badge">Idle · waiting for a run</div></div></header>
<div class="layout"><aside class="panel controls"><h2>Start a test</h2><form id="startForm">
<label class="field"><span>Bot count</span><input id="count" type="number" min="1" max="100" value="20" required><div class="hint">Connects at one bot per second. Maximum 100.</div></label>
<label class="field"><span>Clone server address</span><input id="target" type="text" placeholder="play.example.net or example.net:25570" required><div class="hint">Domains use the Minecraft SRV record when no port is entered. IPs default to 25565.</div></label>
<label class="field"><span>Authentication</span><select id="mode"><option value="none">None</option><option value="login">Log in existing accounts · /login</option><option value="register">Register new accounts · /register</option></select></label>
<label class="field"><span>Chat test</span><select id="chatTest"><option value="true">Send a chat marker</option><option value="false">Do not send a chat marker</option></select><div class="hint">With no auth, the marker is sent after spawn; otherwise it follows successful login or registration.</div></label>
<label class="field" id="credentialProfileField" hidden><span>Saved password profile</span><select id="credentialId"><option value="">Enter password below</option></select></label>
<label class="field"><span>Bot movement</span><select id="movement"><option value="stationary">Stationary</option><option value="wander">Wander within 32 blocks</option><option value="continuous">Continuous movement</option></select><div class="hint">Movement starts after spawn; chat testing is independent.</div></label>
<label class="field" id="passwordField" hidden><span>Shared test password</span><input id="password" type="password" autocomplete="new-password" maxlength="128" placeholder="Hidden from dashboard logs"><div class="hint">Sent privately to the clone’s auth plugin. Multiword or special-character passwords are quoted automatically; enter the password without surrounding quotes.</div></label>
<label class="field" id="profileNameField" hidden><span>Save password as</span><input id="profileName" type="text" maxlength="80" autocomplete="off" placeholder="Optional profile name"><div class="hint">Saved in a local SQLite database as plain text. Anyone with access to that file can read it.</div></label>
<label class="field"><span>Confirmation</span><input id="confirm" type="text" autocomplete="off" placeholder="Type YES to start" required></label>
<div class="check">Run this only on an isolated clone you administer. Bots will connect to the resolved target shown in the dashboard.</div>
<div class="actions"><button id="startButton" class="primary" type="submit">Start test</button><button id="stopButton" class="stop" type="button" disabled>Stop</button></div><div id="notice" class="notice" role="status"></div></form></aside>
<section class="maincol"><div class="stats">
<div class="panel stat"><label>Connected</label><strong id="connected">0 / 0</strong><small>active clients</small></div><div class="panel stat"><label>Authenticated</label><strong id="authenticated">0</strong><small id="authModeLabel">Depends on authentication setting</small></div><div class="panel stat"><label>Chat markers</label><strong id="chatSent">0</strong><small>sent successfully</small></div><div class="panel stat"><label>Auth / connection failures</label><strong id="failed">0</strong><small>retries up to 5 times</small></div>
</div><div class="panel target-line"><b>Resolved target:</b> <span id="resolvedTarget">—</span> <span id="modeSummary"></span></div>
<div class="cols"><section class="panel section"><div class="sectionhead"><h2>Bot status</h2><span id="botCount" class="counter">0 bots</span></div><div class="tablewrap"><table><thead><tr><th>Bot</th><th>Status</th><th>Attempts</th><th>Retries</th><th>Ping</th><th>Last detail</th></tr></thead><tbody id="botRows"><tr><td colspan="6" class="empty">Bots appear here after a test starts.</td></tr></tbody></table></div></section>
<div class="feeds"><section class="panel section"><div class="sectionhead"><h2>Incoming chat</h2><span id="chatCount" class="counter">0 messages</span></div><div id="chatFeed" class="feedbox"><div class="empty">Server messages received by bots will appear here.</div></div></section><section class="panel section"><div class="sectionhead"><h2>Activity</h2><span id="eventCount" class="counter">0 events</span></div><div id="eventFeed" class="feedbox"><div class="empty">Connection and authentication events will appear here.</div></div></section></div></div></section></div>
<div class="footer">Local dashboard · bound to 127.0.0.1 · passwords are masked in chat and never included in dashboard events</div></main>
<script>
const TOKEN='${token}';const $=id=>document.getElementById(id);let events=[],chats=[],latestState={};
function applyTheme(theme){const light=theme==='light';document.body.classList.toggle('light',light);$('themeToggle').textContent=light?'Dark mode':'Light mode';$('themeToggle').setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode')}
let savedTheme='dark';try{savedTheme=localStorage.getItem('mc-loadtest-theme')||'dark'}catch{}applyTheme(savedTheme);
$('themeToggle').addEventListener('click',()=>{const theme=document.body.classList.contains('light')?'dark':'light';applyTheme(theme);try{localStorage.setItem('mc-loadtest-theme',theme)}catch{}});
const escTime=value=>{try{return new Date(value).toLocaleTimeString()}catch{return ''}};
function statusClass(status){if(['authenticated','spawned','connected','chat sent'].includes(status))return 'good';if(['failed','auth failed','kicked','connection error'].includes(status))return 'bad';if(['connecting','reconnecting','authenticating'].includes(status))return 'warn';return ''}
function drawState(s){latestState=s||{};const r=s.stats||{};$('connected').textContent=(r.connected||0)+' / '+(r.target||0);$('authenticated').textContent=r.authenticated||0;$('chatSent').textContent=r.chatTestSent||0;$('failed').textContent=(r.failedConnections||0)+(r.authFailures||0);$('resolvedTarget').textContent=s.target||'—';$('modeSummary').textContent=s.mode?(' · '+s.mode+' · '+(s.movement||'stationary')):'';$('authModeLabel').textContent=s.mode==='none'?'auth skipped':(s.mode==='register'?'register successes':'login successes');$('botCount').textContent=(r.bots||[]).length+' bots';$('runBadge').textContent=s.running?'Running · '+(s.mode||'')+' · '+(s.movement||'stationary'): 'Idle · waiting for a run';$('runBadge').classList.toggle('live',!!s.running);$('startButton').disabled=!!s.running;$('stopButton').disabled=!s.running;
const rows=r.bots||[];$('botRows').replaceChildren();if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.className='empty';td.textContent='Bots appear here after a test starts.';tr.append(td);$('botRows').append(tr)}else for(const b of rows){const tr=document.createElement('tr');const name=document.createElement('td');name.textContent=b.username;const st=document.createElement('td'),span=document.createElement('span'),dot=document.createElement('i');span.className='status';dot.className='dot '+statusClass(b.status);span.append(dot,document.createTextNode(b.status||'waiting'));st.append(span);const attempt=document.createElement('td');attempt.textContent=String(b.attempts||0);const retries=document.createElement('td');retries.textContent=String(b.reconnects||0);const ping=document.createElement('td');ping.textContent=b.ping==null?'—':Math.round(b.ping)+' ms';const detail=document.createElement('td');detail.textContent=b.reason||b.authMode||'';tr.append(name,st,attempt,retries,ping,detail);$('botRows').append(tr)}drawFeeds()}
function drawFeeds(){ $('chatCount').textContent=chats.length+' messages';$('eventCount').textContent=events.length+' events';drawFeed('chatFeed',chats,'No server messages received yet.','chat');drawFeed('eventFeed',events,'No activity yet.','event') }
 function drawFeed(id,list,empty,type){const box=$(id);box.replaceChildren();if(!list.length){const d=document.createElement('div');d.className='empty';d.textContent=empty;box.append(d);return}for(const e of list.slice(-250)){const row=document.createElement('div');row.className=type==='chat'?'feedrow':'eventrow';const time=document.createElement('span');time.className='time';time.textContent=escTime(e.time);const who=document.createElement('span');who.className=type==='chat'?'botname':'botname';who.textContent=type==='chat'?(e.botCount>1?e.botCount+' bots':e.username):(e.username||'system');const msg=document.createElement('span');msg.className='message';const detail=e.reason||e.safeCommand||e.command||'';msg.textContent=type==='chat'?e.message:(e.type+(detail?': '+detail:''));row.append(time,who,msg);box.append(row)}box.scrollTop=box.scrollHeight}
 function receive(e){if(e.type==='chat_message'||e.type==='chat_notice'){if(e.type==='chat_message'){const previous=[...chats].reverse().find(item=>item.type==='chat_message'&&item.message===e.message&&Date.now()-Date.parse(item.time)<3000);if(previous){previous.seenBy||=[previous.username];if(!previous.seenBy.includes(e.username)){previous.seenBy.push(e.username);previous.botCount=previous.seenBy.length;previous.time=e.time}}else chats.push({...e,botCount:1,seenBy:[e.username]})}else chats.push(e);if(chats.length>500)chats.shift()}else{events.push(e);if(events.length>300)events.shift()}drawFeeds()}
async function refresh(){try{const r=await fetch('/api/state',{headers:{'x-session-token':TOKEN},cache:'no-store'});if(r.ok){const s=await r.json();drawState(s);if(s.chatMessages){chats=s.chatMessages;events=s.recentEvents||[];drawFeeds()}}}catch{}}
function updateCredentialFields(){$('credentialProfileField').hidden=$('mode').value==='none';$('passwordField').hidden=$('mode').value==='none';$('profileNameField').hidden=$('mode').value==='none'}
$('mode').addEventListener('change',updateCredentialFields);
$('credentialId').addEventListener('change',async()=>{const id=$('credentialId').value;if(!id)return;try{const r=await fetch('/api/credentials/'+encodeURIComponent(id),{headers:{'x-session-token':TOKEN},cache:'no-store'});if(r.ok){const credential=await r.json();$('password').value=credential.password;$('profileName').value=credential.name}}catch{}});
async function loadCredentialProfiles(){try{const r=await fetch('/api/credentials',{headers:{'x-session-token':TOKEN},cache:'no-store'});if(!r.ok)return;const rows=await r.json();const select=$('credentialId');while(select.options.length>1)select.remove(1);for(const row of rows){const option=document.createElement('option');option.value=String(row.id);option.textContent=row.name;select.append(option)}}catch{}}
$('startForm').addEventListener('submit',async ev=>{ev.preventDefault();const n=$('notice');n.className='notice';n.textContent='Resolving target and starting…';const body={count:Number($('count').value),target:$('target').value.trim(),mode:$('mode').value,chatTest:$('chatTest').value==='true',movement:$('movement').value,password:$('password').value,credentialId:$('credentialId').value||null,profileName:$('profileName').value.trim(),confirmation:$('confirm').value.trim()};try{const r=await fetch('/api/start',{method:'POST',headers:{'content-type':'application/json','x-session-token':TOKEN},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not start test.');$('password').value='';$('profileName').value='';$('credentialId').value='';$('confirm').value='';n.className='notice ok';n.textContent='Started against '+data.target;chats=[];events=[];await loadCredentialProfiles();await refresh()}catch(err){n.className='notice error';n.textContent=err.message}});
 $('stopButton').addEventListener('click',async()=>{const button=$('stopButton'),notice=$('notice');button.disabled=true;notice.className='notice';notice.textContent='Stopping bots…';try{const response=await fetch('/api/stop',{method:'POST',headers:{'x-session-token':TOKEN}});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not stop the test.');await refresh();notice.className='notice ok';notice.textContent='Bots stopped.'}catch(error){notice.className='notice error';notice.textContent=error.message||'Could not reach the dashboard.';button.disabled=!latestState.running}});
async function init(){updateCredentialFields();await loadCredentialProfiles();await refresh();const source=new EventSource('/api/events?token='+encodeURIComponent(TOKEN));source.onmessage=ev=>{try{const d=JSON.parse(ev.data);if(d.kind==='event')receive(d.event);else if(d.kind==='state')drawState(d.state)}catch{}};setInterval(refresh,5000)}init();
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

async function startWebUI() {
  const credentialStore = await CredentialStore.open()
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
  const addChatMessage = item => {
    const previous = [...chatMessages].reverse().find(message =>
      message.type === 'chat_message' && message.message === item.message &&
      Date.parse(item.time) - Date.parse(message.time) < 3000 &&
      Date.parse(item.time) >= Date.parse(message.time))
    if (previous) {
      previous.seenBy ||= [previous.username]
      if (!previous.seenBy.includes(item.username)) {
        previous.seenBy.push(item.username)
        previous.botCount = previous.seenBy.length
        previous.time = item.time
      }
    } else chatMessages.push({ ...item, botCount: 1, seenBy: [item.username] })
    if (chatMessages.length > 500) chatMessages.shift()
  }

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
    if (req.method === 'GET' && url.pathname === '/api/credentials') {
      if (!tokenOk(req)) return safeJson(res, 403, { error: 'Invalid dashboard session.' })
      return safeJson(res, 200, credentialStore.list())
    }
    const credentialMatch = url.pathname.match(/^\/api\/credentials\/(\d+)$/)
    if (req.method === 'GET' && credentialMatch) {
      if (!tokenOk(req)) return safeJson(res, 403, { error: 'Invalid dashboard session.' })
      const credential = credentialStore.get(credentialMatch[1])
      return credential
        ? safeJson(res, 200, credential)
        : safeJson(res, 404, { error: 'Saved password profile not found.' })
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
      if (!['none', 'login', 'register'].includes(body.mode)) return safeJson(res, 400, { error: 'Choose no authentication, login, or register mode.' })
      if (typeof body.chatTest !== 'boolean') return safeJson(res, 400, { error: 'Choose whether to send a chat test.' })
      if (!['stationary', 'wander', 'continuous'].includes(body.movement)) return safeJson(res, 400, { error: 'Choose stationary, wander, or continuous movement.' })
      let password = body.password
      if (body.mode !== 'none' && !password && body.credentialId) {
        const saved = credentialStore.get(body.credentialId)
        if (!saved) return safeJson(res, 400, { error: 'Saved password profile not found.' })
        password = saved.password
      }
      if (body.mode !== 'none' && (typeof password !== 'string' || !password.length || password.length > 128 || password.includes('\0'))) return safeJson(res, 400, { error: 'Enter a test password of 1 to 128 characters.' })
      if (typeof body.profileName === 'string' && body.profileName.trim()) {
        if (body.profileName.trim().length > 80) return safeJson(res, 400, { error: 'Password profile names must be 80 characters or fewer.' })
        if (body.mode === 'none') return safeJson(res, 400, { error: 'Choose login or register to save a password profile.' })
      }
      let target
      try { target = await resolveTargetInput(String(body.target || '')) } catch (error) { return safeJson(res, 400, { error: error.message }) }
      if (typeof body.profileName === 'string' && body.profileName.trim()) credentialStore.save(body.profileName, password)
      let commands = {}
      if (body.mode !== 'none') {
        try { commands = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'login-commands.json'), 'utf8')) }
        catch { return safeJson(res, 500, { error: 'Could not read login-commands.json.' }) }
      }
      const auth = body.mode === 'none'
        ? (body.chatTest ? { chatTestOnly: true, chatTestDelayMs: 3000, chatTestMessage: 'LoadTest: {username} chat test' } : { enabled: false })
        : {
            password,
            registerCommand: commands.registerCommand,
            loginCommand: commands.loginCommand,
            success: commands.success,
            failure: commands.failure,
            commandFailure: commands.commandFailure,
            fixedMode: true,
            initialCommand: body.mode,
            initialDelayMs: 3000,
            timeoutMs: commands.timeoutMs || 30000,
            chatTestMessage: body.chatTest ? 'LoadTest: {username} authenticated chat test' : '',
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
          if (item.type === 'chat_message') addChatMessage(item)
          else {
            recentEvents.push(item)
            if (recentEvents.length > 300) recentEvents.shift()
            const notice = item.type === 'authenticated'
              ? 'Load test: server confirmed authentication.'
              : item.type === 'chat_test_sent'
                ? 'Load test: chat marker sent; waiting for server echo.'
                : null
            if (notice) {
              const chatNotice = { time: item.time, type: 'chat_notice', username: item.username, message: notice }
              chatMessages.push(chatNotice)
              if (chatMessages.length > 500) chatMessages.shift()
              broadcast({ kind: 'event', event: chatNotice })
            }
          }
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
    credentialStore.close()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 1000).unref()
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  return server
}

module.exports = { startWebUI }

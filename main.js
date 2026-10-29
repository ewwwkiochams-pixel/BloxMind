const { app, BrowserWindow, WebContentsView, ipcMain, shell, clipboard, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const http = require('http');
const crypto = require('crypto');

if (!app.requestSingleInstanceLock()) { app.quit(); }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const HOMES = {
  chatgpt: 'https://chatgpt.com/', claude: 'https://claude.ai/new', gemini: 'https://gemini.google.com/app',
  deepseek: 'https://chat.deepseek.com/', grok: 'https://grok.com/', llama: 'https://www.meta.ai/', mistral: 'https://chat.mistral.ai/chat'
};
const AUTH = /(^|\.)(accounts\.google\.com|appleid\.apple\.com|login\.microsoftonline\.com|login\.live\.com|auth0\.com|openai\.com|anthropic\.com|x\.com|twitter\.com|facebook\.com|github\.com)$/;

const PORT = 38417;
const NAMES = {
  chatgpt: ['ChatGPT', 'GPT', '#10A37F'], claude: ['Claude', 'Cla', '#D97757'], gemini: ['Gemini', 'Gem', '#4C8DF6'],
  deepseek: ['DeepSeek', 'DS', '#6B7CFF'], grok: ['Grok', 'Grok', '#EDEDED'], llama: ['Llama', 'Lla', '#2BA3FF'], mistral: ['Mistral', 'Mis', '#FF7A1A']
};
let TOKEN = '';
let studioModel = 'chatgpt';
let win;
const views = {};

function loadToken() {
  try {
    const f = path.join(app.getPath('userData'), 'bridge-token.txt');
    if (fs.existsSync(f)) TOKEN = fs.readFileSync(f, 'utf8').trim();
    if (!TOKEN) { TOKEN = crypto.randomBytes(16).toString('hex'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, TOKEN); }
  } catch (e) { TOKEN = crypto.randomBytes(16).toString('hex'); }
}
function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
function state() {
  const n = NAMES[studioModel], c = rgb(n[2]);
  return {
    model: studioModel, name: n[0], r: c[0], g: c[1], b: c[2],
    models: Object.keys(NAMES).map(function (id) { const k = rgb(NAMES[id][2]); return { id: id, name: NAMES[id][0], short: NAMES[id][1], r: k[0], g: k[1], b: k[2] }; })
  };
}
function emit(msg) { if (win && !win.isDestroyed()) win.webContents.send('bridge', msg); }
function startBridge() {
  const srv = http.createServer(function (req, res) {
    const reply = function (code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj || {})); };
    if (req.headers['x-bloxmind'] !== TOKEN) return reply(403, { error: 'forbidden' });
    if (req.method === 'GET' && req.url === '/state') return reply(200, state());
    if (req.method === 'POST' && (req.url === '/ask' || req.url === '/model')) {
      let body = '';
      req.on('data', function (c) { body += c; if (body.length > 1000000) req.destroy(); });
      req.on('end', function () {
        let d = {};
        try { d = JSON.parse(body || '{}'); } catch (e) { return reply(400, { error: 'bad json' }); }
        if (req.url === '/model') {
          if (NAMES[d.id]) { studioModel = d.id; emit({ type: 'model', id: d.id }); }
          return reply(200, state());
        }
        const text = String(d.text || '').slice(0, 60000);
        if (!text) return reply(400, { error: 'empty' });
        emit({ type: 'ask', text: text, tpl: d.tpl === 'fix' ? 'fix' : 'explain' });
        if (win) { win.show(); win.focus(); }
        return reply(200, { ok: true });
      });
      return;
    }
    reply(404, { error: 'not found' });
  });
  srv.on('error', function () { /* port busy: the plugin will show it cannot connect */ });
  srv.listen(PORT, '127.0.0.1');
}
function installPlugin() {
  try {
    if (!process.env.LOCALAPPDATA) return false;
    const dir = path.join(process.env.LOCALAPPDATA, 'Roblox', 'Plugins');
    fs.mkdirSync(dir, { recursive: true });
    const tpl = fs.readFileSync(path.join(__dirname, 'plugin', 'BloxMind.lua'), 'utf8');
    fs.writeFileSync(path.join(dir, 'BloxMind.lua'), tpl.replace('__TOKEN__', TOKEN).replace('__PORT__', String(PORT)));
    return true;
  } catch (e) { return false; }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 760, minWidth: 960, minHeight: 620,
    frame: false, backgroundColor: '#050505', show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', function () { win.show(); });
  win.webContents.on('did-finish-load', pollStudio);
  win.webContents.setWindowOpenHandler(function (d) {
    if (/^https?:\/\//.test(d.url)) shell.openExternal(d.url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', function (e, url) {
    if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url); }
  });
}

function getView(id) {
  if (views[id]) return views[id];
  const v = new WebContentsView({ webPreferences: { partition: 'persist:bloxmind-' + id, contextIsolation: true, nodeIntegration: false, sandbox: true } });
  v.webContents.setUserAgent(UA);
  v.loaded = false;
  v.webContents.once('did-finish-load', function () { v.loaded = true; });
  v.webContents.setWindowOpenHandler(function (d) {
    try { if (AUTH.test(new URL(d.url).hostname)) return { action: 'allow' }; } catch (e) { /* ignore bad urls */ }
    if (/^https?:\/\//.test(d.url)) shell.openExternal(d.url);
    return { action: 'deny' };
  });
  v.webContents.loadURL(HOMES[id]);
  win.contentView.addChildView(v);
  v.setVisible(false);
  views[id] = v;
  return v;
}

ipcMain.on('views-set', function (e, list) {
  const keep = new Set();
  (list || []).forEach(function (it) {
    if (!it || !HOMES[it.id] || !it.bounds) return;
    const v = getView(it.id), b = it.bounds;
    v.setBounds({ x: Math.round(b.x), y: Math.round(b.y), width: Math.max(0, Math.round(b.width)), height: Math.max(0, Math.round(b.height)) });
    v.setVisible(true);
    keep.add(it.id);
  });
  Object.keys(views).forEach(function (id) { if (!keep.has(id)) views[id].setVisible(false); });
});
ipcMain.handle('views-send', function (e, id, url) {
  if (!HOMES[id]) return;
  const v = getView(id), wc = v.webContents;
  if (url && /^https:\/\//.test(url)) { wc.loadURL(url); return; }
  const paste = function () { wc.focus(); setTimeout(function () { wc.paste(); }, 250); };
  if (!v.loaded) wc.once('did-finish-load', function () { setTimeout(paste, 900); }); else paste();
});
ipcMain.handle('views-reload', function (e, id) { if (views[id]) views[id].webContents.reload(); });
ipcMain.handle('views-external', function (e, id) {
  const u = views[id] ? views[id].webContents.getURL() : HOMES[id];
  if (/^https?:\/\//.test(u || '')) shell.openExternal(u);
});

function findStudio() {
  try {
    const base = path.join(process.env.LOCALAPPDATA || '', 'Roblox', 'Versions');
    const dirs = fs.readdirSync(base)
      .filter(function (d) { return d.startsWith('version-'); })
      .map(function (d) { return path.join(base, d); })
      .filter(function (d) { return fs.existsSync(path.join(d, 'RobloxStudioBeta.exe')); })
      .sort(function (a, b) { return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs; });
    return dirs[0] ? path.join(dirs[0], 'RobloxStudioBeta.exe') : null;
  } catch (e) { return null; }
}
ipcMain.on('studio-model', function (e, id) { if (NAMES[id]) studioModel = id; });
ipcMain.handle('launch', async function () {
  const plugin = installPlugin();
  const exe = findStudio();
  if (exe) {
    try { const c = spawn(exe, [], { detached: true, stdio: 'ignore' }); c.unref(); return { ok: true, how: 'exe', plugin: plugin }; } catch (e) { /* fall back to the protocol */ }
  }
  try { await shell.openExternal('roblox-studio:1'); return { ok: !!exe, how: exe ? 'protocol' : 'missing', plugin: plugin }; }
  catch (e) { return { ok: false, how: 'missing', plugin: plugin }; }
});

function pollStudio() {
  if (process.platform !== 'win32' || !win || win.isDestroyed()) return;
  execFile('tasklist', ['/FI', 'IMAGENAME eq RobloxStudioBeta.exe', '/NH'], { windowsHide: true }, function (err, out) {
    const running = !err && /RobloxStudioBeta\.exe/i.test(out || '');
    if (win && !win.isDestroyed()) win.webContents.send('studio', running);
  });
}
setInterval(pollStudio, 4000);

ipcMain.handle('studio-errors', function () {
  try {
    const dir = path.join(process.env.LOCALAPPDATA || '', 'Roblox', 'logs');
    const files = fs.readdirSync(dir).filter(function (f) { return /studio/i.test(f) && f.endsWith('.log'); })
      .map(function (f) { return { f: f, t: fs.statSync(path.join(dir, f)).mtimeMs }; })
      .sort(function (a, b) { return b.t - a.t; });
    if (!files.length) return '';
    const p = path.join(dir, files[0].f), size = fs.statSync(p).size, len = Math.min(size, 300000);
    const fd = fs.openSync(p, 'r'), buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len); fs.closeSync(fd);
    return buf.toString('utf8').split(/\r?\n/)
      .filter(function (l) { return /FLog::Output/.test(l) && /error|attempt to|exception|invalid argument|is not a valid member/i.test(l); })
      .slice(-12).map(function (l) { return l.replace(/^.*?\[FLog::Output\]\s*/, ''); }).join('\n');
  } catch (e) { return ''; }
});

ipcMain.handle('open', function (e, url) { if (/^https?:\/\//.test(url)) shell.openExternal(url); });
ipcMain.handle('copy', function (e, text) { clipboard.writeText(String(text || '')); });
ipcMain.handle('paste', function () { return clipboard.readText(); });
ipcMain.on('pin', function (e, v) { if (win) win.setAlwaysOnTop(!!v); });
ipcMain.on('min', function () { if (win) win.minimize(); });
ipcMain.on('max', function () { if (win) { if (win.isMaximized()) win.unmaximize(); else win.maximize(); } });
ipcMain.on('close', function () { app.quit(); });

app.whenReady().then(function () {
  loadToken();
  startBridge();
  createWindow();
  globalShortcut.register('Alt+B', function () {
    if (!win) return;
    if (win.isVisible() && win.isFocused()) win.hide(); else { win.show(); win.focus(); }
  });
});
app.on('second-instance', function () { if (win) { win.show(); win.focus(); } });
app.on('window-all-closed', function () { app.quit(); });
app.on('will-quit', function () { globalShortcut.unregisterAll(); });

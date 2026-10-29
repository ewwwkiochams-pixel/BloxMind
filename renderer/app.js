(async function () {
  const $ = function (id) { return document.getElementById(id); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const byId = function (id) { return MODELS.find(function (m) { return m.id === id; }) || MODELS[0]; };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  const WEB = {
    embedded: false,
    launchStudio: async function () { location.href = 'roblox-studio:1'; return { ok: true, how: 'protocol' }; },
    openUrl: function (u) { window.open(u, '_blank', 'noopener'); },
    copy: async function (t) { try { await navigator.clipboard.writeText(t); } catch (e) { /* blocked */ } },
    readClipboard: async function () { try { return await navigator.clipboard.readText(); } catch (e) { return ''; } },
    studioErrors: async function () { return ''; },
    pin: function () {},
    setStudioModel: function () {},
    onBridge: function () {},
    onStudio: function () {},
    views: { set: function () {}, send: function (id, url) { window.open(url || byId(id).home, '_blank', 'noopener'); }, reload: function () {}, external: function (id) { window.open(byId(id).home, '_blank', 'noopener'); } },
    win: null
  };
  const API = (typeof window.bloxmind !== 'undefined' && window.bloxmind) || WEB;

  const SNIPS = [
    { t: 'Click door', w: 'Script inside the door Part', d: 'Opens and closes with a click.', c: `local door = script.Parent
local detector = door:FindFirstChildOfClass("ClickDetector") or Instance.new("ClickDetector", door)
local open = false

detector.MouseClick:Connect(function()
	open = not open
	door.CanCollide = not open
	game:GetService("TweenService"):Create(door, TweenInfo.new(0.4), {Transparency = open and 0.7 or 0}):Play()
end)` },
    { t: 'Coins and leaderboard', w: 'Server script in ServerScriptService, then a script inside each coin', d: 'Creates a Coins stat and lets players collect coins.', c: `-- ServerScriptService
game.Players.PlayerAdded:Connect(function(player)
	local stats = Instance.new("Folder")
	stats.Name = "leaderstats"
	stats.Parent = player
	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Parent = stats
end)

-- Script inside the coin Part
local coin = script.Parent
local taken = false
coin.Touched:Connect(function(hit)
	if taken then return end
	local player = game.Players:GetPlayerFromCharacter(hit.Parent)
	if player then
		taken = true
		player.leaderstats.Coins.Value += 1
		coin:Destroy()
	end
end)` },
    { t: 'Kill brick', w: 'Script inside the Part', d: 'Resets any player who touches it.', c: `script.Parent.Touched:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.Health = 0
	end
end)` },
    { t: 'Checkpoint', w: 'Script inside a SpawnLocation', d: 'Players respawn at the last checkpoint they touched.', c: `local checkpoint = script.Parent
local players = game:GetService("Players")

checkpoint.Touched:Connect(function(hit)
	local player = players:GetPlayerFromCharacter(hit.Parent)
	if player and player.RespawnLocation ~= checkpoint then
		player.RespawnLocation = checkpoint
	end
end)` },
    { t: 'Teleport pads', w: 'Script in ServerScriptService, parts named PadA and PadB', d: 'Two pads that send you to each other.', c: `local padA = workspace.PadA
local padB = workspace.PadB
local cooldown = {}

local function link(from, to)
	from.Touched:Connect(function(hit)
		local character = hit.Parent
		local root = character:FindFirstChild("HumanoidRootPart")
		if root and not cooldown[character] then
			cooldown[character] = true
			root.CFrame = to.CFrame + Vector3.new(0, 4, 0)
			task.wait(1)
			cooldown[character] = nil
		end
	end)
end

link(padA, padB)
link(padB, padA)` },
    { t: 'Speed pad', w: 'Script inside the Part', d: 'Boosts walk speed for three seconds.', c: `local pad = script.Parent

pad.Touched:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid.WalkSpeed < 40 then
		humanoid.WalkSpeed = 40
		task.delay(3, function()
			humanoid.WalkSpeed = 16
		end)
	end
end)` },
    { t: 'Day and night', w: 'Script in ServerScriptService', d: 'Slowly moves the sun across the sky.', c: `local Lighting = game:GetService("Lighting")

while true do
	Lighting.ClockTime = (Lighting.ClockTime + 0.05) % 24
	task.wait(0.1)
end` },
    { t: 'Safe shop purchase', w: 'Server script, then a LocalScript', d: 'The server checks the price, never the client.', c: `-- ServerScriptService
local remote = Instance.new("RemoteEvent")
remote.Name = "BuyItem"
remote.Parent = game:GetService("ReplicatedStorage")

local prices = { Sword = 50, Shield = 80 }

remote.OnServerEvent:Connect(function(player, itemName)
	local price = prices[itemName]
	if not price then return end
	local coins = player.leaderstats.Coins
	if coins.Value >= price then
		coins.Value -= price
		print(player.Name .. " bought " .. itemName)
	end
end)

-- LocalScript (a button)
game:GetService("ReplicatedStorage").BuyItem:FireServer("Sword")` }
  ];
  function hl(code) {
    const re = /(--[^\n]*)|("(?:[^"\\\n]|\\.)*")|\b(local|function|end|if|then|else|elseif|for|do|while|return|not|and|or|in|true|false|nil)\b|\b(game|workspace|script|Instance|Vector3|CFrame|Enum|task|TweenInfo|math)\b|\b(\d+\.?\d*)\b/g;
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'b' : 'n';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(code.slice(last));
  }

  $('tbar').hidden = !API.win;
  if (API.win) {
    $('tmin').addEventListener('click', function () { API.win.minimize(); });
    $('tmax').addEventListener('click', function () { API.win.maximize(); });
    $('tcl').addEventListener('click', function () { API.win.close(); });
  }
  document.querySelectorAll('[data-wm]').forEach(function (el) {
    el.innerHTML = Array.from(el.dataset.wm).map(function (ch, i) { return '<i style="--i:' + i + '">' + ch + '</i>'; }).join('');
  });
  const h1 = $('h1');
  (function split(node, c) {
    Array.from(node.childNodes).forEach(function (x) {
      if (x.nodeType === 3) {
        const f = document.createDocumentFragment();
        x.textContent.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { f.append(' '); return; }
          const w = document.createElement('span'), i = document.createElement('span');
          w.className = 'w'; i.textContent = t; i.style.setProperty('--i', c.n++); w.append(i); f.append(w);
        });
        x.replaceWith(f);
      } else if (x.nodeType === 1) split(x, c);
    });
  })(h1, { n: 0 });
  setTimeout(function () { h1.classList.add('in'); }, reduce ? 0 : 300);

  const st = { view: 'home', model: 'chatgpt', sm: 'chatgpt', tpl: 'script', hist: [], compare: false, second: 'claude', pin: false };
  try { Object.assign(st, JSON.parse(localStorage.getItem('bloxmind2') || '{}')); } catch (e) { /* no storage */ }
  st.view = 'home';
  const q = $('q'), send = $('send'), ur = $('ur');
  function save() { try { localStorage.setItem('bloxmind2', JSON.stringify({ model: st.model, sm: st.sm, tpl: st.tpl, hist: st.hist, compare: st.compare, second: st.second, pin: st.pin })); } catch (e) { /* no storage */ } }
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* views layout (native chat views sit on top of .wvb) */
  let overlays = 0, raf;
  function layout() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      if (st.view !== 'chat' || overlays > 0) { API.views.set([]); return; }
      API.views.set(Array.from(document.querySelectorAll('#wvs .wv')).map(function (w) {
        const r = w.querySelector('.wvb').getBoundingClientRect();
        return { id: w.dataset.id, bounds: { x: r.left, y: r.top, width: r.width, height: r.height } };
      }));
    });
  }
  function overlay(on) { overlays = Math.max(0, overlays + (on ? 1 : -1)); layout(); }
  if (window.ResizeObserver) new ResizeObserver(layout).observe($('wvs'));
  window.addEventListener('resize', layout);

  function mock(m) {
    return '<div class="mock"><div class="mu">Make a door that opens when a player presses E</div><div class="ma"><div class="mb" style="width:92%"></div><div class="mb" style="width:78%"></div><div class="mb" style="width:85%"></div><div class="mb" style="width:46%"></div></div><div class="mi">Message ' + m.name + '</div></div>';
  }
  function buildWvs() {
    const ids = [st.model].concat(st.compare ? [st.second] : []);
    $('wvs').innerHTML = ids.map(function (id) {
      const m = byId(id);
      const body = API.preview ? mock(m)
        : API.embedded ? '<div class="sk" style="--c:' + m.color + '"><img src="' + m.icon + '" alt=""><span>Loading ' + m.name + '…</span></div>'
        : '<div class="sk"><span>Chats open in your browser in this version.</span><button class="ghost" type="button" data-open="' + id + '">Open ' + m.name + '</button></div>';
      return '<div class="wv" data-id="' + id + '"><div class="wvh"><img src="' + m.icon + '" alt=""><span>' + m.name + '</span></div><div class="wvb">' + body + '</div></div>';
    }).join('');
    document.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { API.openUrl(byId(b.dataset.open).home); }); });
  }

  /* navigation */
  const smodels = $('smodels'), sbtn = [];
  MODELS.forEach(function (m) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sm'; b.title = m.name; b.setAttribute('aria-label', m.name); b.style.setProperty('--c', m.color);
    b.innerHTML = '<img src="' + m.icon + '" alt="">';
    b.addEventListener('click', function () { go('chat', m.id); });
    smodels.appendChild(b); sbtn.push(b);
  });
  document.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.go); }); });

  function paintHead() {
    const m = byId(st.model), t = $('htitle');
    if (st.view === 'chat') {
      t.innerHTML = '<img src="' + m.icon + '" alt=""><div><b>' + m.name + '</b><small>' + m.maker + ' · ' + m.tag + '</small></div><div class="hbest">' + m.best.map(function (b) { return '<span>' + b + '</span>'; }).join('') + '</div>';
    } else {
      t.innerHTML = '<div><b>' + (st.view === 'snip' ? 'Snippets' : 'Home') + '</b><small>' + (st.view === 'snip' ? 'Ready-made Luau you can copy or improve with AI' : 'Your Roblox AI workspace') + '</small></div>';
    }
    $('hact').hidden = st.view !== 'chat';
  }
  function go(v, m) {
    if (m) st.model = m;
    if (st.second === st.model) st.second = MODELS.find(function (x) { return x.id !== st.model; }).id;
    st.view = v;
    ['home', 'snip', 'chat'].forEach(function (n) { $('v-' + n).hidden = n !== v; });
    document.querySelectorAll('[data-go]').forEach(function (b) { b.setAttribute('aria-current', String(b.dataset.go === v)); });
    sbtn.forEach(function (b, i) { b.setAttribute('aria-current', String(v === 'chat' && MODELS[i].id === st.model)); });
    paintHead(); paintCompare(); paintChat();
    if (v === 'chat') { buildWvs(); setTimeout(function () { q.focus(); }, 80); }
    layout(); save();
  }

  /* home */
  $('mgrid').innerHTML = MODELS.map(function (m) {
    return '<button class="mc" type="button" data-m="' + m.id + '" style="--c:' + m.color + '"><div class="mch"><img src="' + m.icon + '" alt=""><div><b>' + m.name + '</b><small>' + m.maker + '</small></div></div><div class="mtag">' + m.tag + '</div><ul class="pros">' + m.pros.map(function (p) { return '<li><i></i><span>' + p + '</span></li>'; }).join('') + '</ul><div class="best">' + m.best.map(function (b) { return '<span>' + b + '</span>'; }).join('') + '</div></button>';
  }).join('');
  document.querySelectorAll('.mc').forEach(function (b) { b.addEventListener('click', function () { go('chat', b.dataset.m); }); });
  document.querySelectorAll('[data-url]').forEach(function (b) { b.addEventListener('click', function () { API.openUrl(b.dataset.url); }); });

  function paintRecent() {
    $('recent').innerHTML = st.hist.length ? st.hist.map(function (h, i) {
      const m = byId(h.m);
      return '<button class="rc" type="button" data-i="' + i + '"><img src="' + m.icon + '" alt=""><span>' + esc(h.text.replace(/\s+/g, ' ')) + '<small>' + m.name + ' · ' + esc(h.t) + '</small></span></button>';
    }).join('') : '<div class="empty">Nothing yet. Your prompts will show up here.</div>';
    document.querySelectorAll('.rc').forEach(function (b) {
      b.addEventListener('click', function () { const h = st.hist[+b.dataset.i]; go('chat', h.m); q.value = h.text; grow(); });
    });
  }

  const smBtn = [];
  MODELS.forEach(function (m) {
    const b = document.createElement('button');
    b.type = 'button'; b.title = m.name; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', m.name); b.style.setProperty('--c', m.color);
    b.innerHTML = '<img src="' + m.icon + '" alt="">';
    b.addEventListener('click', function () { setSm(m.id); });
    $('smc').appendChild(b); smBtn.push(b);
  });
  function paintSm() {
    smBtn.forEach(function (b, i) { b.setAttribute('aria-checked', String(MODELS[i].id === st.sm)); });
    $('lbl').textContent = 'Launch Studio with ' + byId(st.sm).name;
  }
  function setSm(id) { st.sm = id; paintSm(); API.setStudioModel(id); save(); }

  function setStudio(on) {
    $('sdot').dataset.s = on ? 'on' : 'off';
    $('stxt').textContent = on ? 'Roblox Studio is running' : 'Roblox Studio is not running';
  }
  if (API.onStudio) API.onStudio(setStudio);

  /* launch overlay */
  let loT;
  function closeLo() { const lo = $('lo'); clearTimeout(loT); if (lo.hidden) return; lo.classList.remove('on'); setTimeout(function () { lo.hidden = true; }, 350); overlay(false); }
  async function launch() {
    const lo = $('lo'), bar = $('lbar'), ls = $('ls');
    clearTimeout(loT);
    if (lo.hidden) overlay(true);
    lo.hidden = false; requestAnimationFrame(function () { lo.classList.add('on'); });
    $('lh').innerHTML = 'Loading <em>' + byId(st.sm).name + '</em> into Studio';
    API.setStudioModel(st.sm);
    ls.textContent = 'Preparing the BloxMind panel…'; bar.style.width = '0'; $('lbtns').hidden = true; $('lget').hidden = true;
    for (let p = 0; p <= 60; p += 3) { bar.style.width = p + '%'; if (!reduce) await sleep(16); }
    ls.textContent = 'Starting Roblox Studio…';
    let r; try { r = await API.launchStudio(); } catch (e) { r = { ok: false }; }
    for (let p = 60; p <= 100; p += 4) { bar.style.width = p + '%'; if (!reduce) await sleep(14); }
    $('lbtns').hidden = false;
    if (r && r.ok) {
      ls.textContent = 'In Studio, open the Plugins tab and click BloxMind. If Studio asks to allow the connection, choose Allow.';
      loT = setTimeout(closeLo, 9000);
    } else { ls.textContent = 'Couldn’t find Roblox Studio on this computer.'; $('lget').hidden = false; }
  }
  $('launch').addEventListener('click', launch);
  $('lclose').addEventListener('click', closeLo);
  $('lget').addEventListener('click', function () { API.openUrl('https://create.roblox.com/'); });

  /* snippets */
  function paintSnips() {
    const f = $('snq').value.trim().toLowerCase();
    const list = SNIPS.filter(function (s) { return !f || (s.t + ' ' + s.d + ' ' + s.w).toLowerCase().indexOf(f) > -1; });
    $('sgrid').innerHTML = list.length ? list.map(function (s) {
      return '<div class="sn"><div class="snh"><b>' + s.t + '</b><small>' + s.w + ' · ' + s.d + '</small></div><pre>' + hl(s.c) + '</pre><div class="sna"><button class="ghost" type="button" data-c="' + SNIPS.indexOf(s) + '">Copy</button><button class="ghost" type="button" data-a="' + SNIPS.indexOf(s) + '">Improve with AI</button></div></div>';
    }).join('') : '<div class="empty">No snippets match.</div>';
    document.querySelectorAll('[data-c]').forEach(function (b) { b.addEventListener('click', async function () { await API.copy(SNIPS[+b.dataset.c].c); toast('Copied'); }); });
    document.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () { st.tpl = 'script'; go('chat'); q.value = 'Improve this Luau code and explain what you changed:\n\n' + SNIPS[+b.dataset.a].c; grow(); }); });
  }
  $('snq').addEventListener('input', paintSnips);

  /* composer */
  function grow() {
    q.style.height = 'auto';
    q.style.height = Math.max(48, Math.min(140, q.scrollHeight)) + 'px';
    $('cnt').textContent = q.value.length;
    send.disabled = !q.value.trim();
    layout();
  }
  const chips = [];
  TEMPLATES.forEach(function (t) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = t.name;
    b.addEventListener('click', function () { st.tpl = t.id; paintChat(); save(); });
    $('chips').appendChild(b); chips.push(b);
  });
  function paintChat() {
    chips.forEach(function (b, i) { b.setAttribute('aria-pressed', String(TEMPLATES[i].id === st.tpl)); });
    $('sendt').textContent = st.compare ? 'Send to both' : 'Ask ' + byId(st.model).name;
  }
  function paintCompare() {
    $('cmpb').setAttribute('aria-pressed', String(st.compare));
    const sel = $('cmps'); sel.hidden = !st.compare;
    sel.innerHTML = MODELS.filter(function (m) { return m.id !== st.model; }).map(function (m) { return '<option value="' + m.id + '"' + (m.id === st.second ? ' selected' : '') + '>' + m.name + '</option>'; }).join('');
  }
  $('cmpb').addEventListener('click', function () { st.compare = !st.compare; paintCompare(); paintChat(); buildWvs(); layout(); save(); });
  $('cmps').addEventListener('change', function () { st.second = $('cmps').value; buildWvs(); layout(); save(); });
  $('hreload').addEventListener('click', function () { API.views.reload(st.model); });
  $('hext').addEventListener('click', function () { API.views.external(st.model); });

  let tt;
  q.addEventListener('input', function () { grow(); ur.classList.add('typing'); clearTimeout(tt); tt = setTimeout(function () { ur.classList.remove('typing'); }, 700); });
  q.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') go2(); });
  send.addEventListener('click', go2);
  async function go2() {
    const text = q.value.trim();
    if (!text) return;
    const tpl = TEMPLATES.find(function (t) { return t.id === st.tpl; }) || TEMPLATES[0];
    const p = buildPrompt(tpl, text);
    await API.copy(p);
    const targets = [st.model].concat(st.compare ? [st.second] : []);
    targets.forEach(function (id) {
      const m = byId(id);
      API.views.send(id, (m.prefill && encodeURIComponent(p).length < 6000) ? m.url(p) : null);
    });
    st.hist.unshift({ m: st.model, t: tpl.name, text: text });
    st.hist = st.hist.slice(0, 12); paintRecent(); save();
    const m0 = byId(st.model);
    toast(m0.prefill && !st.compare ? 'Sent to ' + m0.name : 'Prompt copied. If it did not paste, press Ctrl+V in the chat.');
  }
  $('paste').addEventListener('click', async function () {
    const t = ((await API.readClipboard()) || '').trim();
    if (t) { q.value = (q.value ? q.value + '\n\n' : '') + t; grow(); toast('Pasted from clipboard'); } else toast('Clipboard is empty');
  });
  $('qerr').addEventListener('click', async function () {
    const t = ((await API.studioErrors()) || '').trim();
    if (!t) { toast('No errors found in the latest Studio log'); return; }
    st.tpl = 'fix'; go('chat'); q.value = t; grow(); toast('Latest Studio errors added');
  });

  /* pin */
  function paintPin() { $('pin').setAttribute('aria-pressed', String(st.pin)); }
  $('pin').addEventListener('click', function () { st.pin = !st.pin; API.pin(st.pin); paintPin(); save(); toast(st.pin ? 'BloxMind stays on top' : 'Back to normal'); });
  paintPin(); if (st.pin) API.pin(true);

  /* command palette */
  let pidx = 0, pitems = [];
  function actions() {
    const a = [
      { t: 'Launch Roblox Studio', k: 'Action', run: launch },
      { t: 'Go home', k: 'Go', run: function () { go('home'); } },
      { t: 'Open snippets', k: 'Go', run: function () { go('snip'); } },
      { t: 'Fix last Studio error', k: 'Action', run: function () { $('qerr').click(); } },
      { t: st.compare ? 'Turn compare off' : 'Turn compare on', k: 'Action', run: function () { go('chat'); $('cmpb').click(); } },
      { t: st.pin ? 'Stop keeping on top' : 'Keep window on top', k: 'Window', run: function () { $('pin').click(); } }
    ];
    MODELS.forEach(function (m) { a.push({ t: 'Open ' + m.name, k: m.maker, img: m.icon, run: function () { go('chat', m.id); } }); });
    return a;
  }
  function paintPal() {
    const f = $('pq').value.trim().toLowerCase();
    pitems = actions().filter(function (a) { return !f || a.t.toLowerCase().indexOf(f) > -1; });
    pidx = Math.min(pidx, Math.max(0, pitems.length - 1));
    $('pl').innerHTML = pitems.map(function (a, i) { return '<li role="option" data-i="' + i + '" aria-selected="' + (i === pidx) + '">' + (a.img ? '<img src="' + a.img + '" alt="">' : '') + a.t + '<small>' + a.k + '</small></li>'; }).join('');
    document.querySelectorAll('#pl li').forEach(function (li) { li.addEventListener('click', function () { runPal(+li.dataset.i); }); });
  }
  function openPal() { if (!$('pal').hidden) return; overlay(true); $('pal').hidden = false; $('pq').value = ''; pidx = 0; paintPal(); setTimeout(function () { $('pq').focus(); }, 30); }
  function closePal() { if ($('pal').hidden) return; $('pal').hidden = true; overlay(false); }
  function runPal(i) { const a = pitems[i]; closePal(); if (a) setTimeout(a.run, 30); }
  $('palb').addEventListener('click', openPal);
  $('pq').addEventListener('input', function () { pidx = 0; paintPal(); });
  $('pq').addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { pidx = Math.min(pitems.length - 1, pidx + 1); paintPal(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { pidx = Math.max(0, pidx - 1); paintPal(); e.preventDefault(); }
    if (e.key === 'Enter') runPal(pidx);
  });
  $('pal').addEventListener('click', function (e) { if (e.target === $('pal')) closePal(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPal(); }
    if (e.key === 'Escape') { closePal(); closeLo(); }
  });

  paintSm(); API.setStudioModel(st.sm);
  if (API.onBridge) API.onBridge(function (msg) {
    if (!msg) return;
    if (msg.type === 'model' && MODELS.some(function (m) { return m.id === msg.id; })) { st.sm = msg.id; paintSm(); save(); toast('Studio now uses ' + byId(msg.id).name); }
    if (msg.type === 'ask') { st.tpl = msg.tpl === 'fix' ? 'fix' : 'explain'; go('chat', st.sm); q.value = msg.text; grow(); paintChat(); toast('Received from Roblox Studio'); }
  });
  paintRecent(); paintSnips(); paintCompare(); paintChat(); go('home'); grow();

  const ex = ['Make a door that opens when a player presses E', 'Fix: attempt to index nil with “Value”', 'Build a low-poly tree from three parts', 'Explain how this RemoteEvent works'];
  if (reduce) { q.placeholder = ex[0]; }
  else {
    let i = 0;
    while (true) {
      const w = ex[i++ % ex.length];
      for (let k = 1; k <= w.length; k++) { if (q.value) break; q.placeholder = w.slice(0, k); await sleep(32); }
      await sleep(1700);
    }
  }
})();

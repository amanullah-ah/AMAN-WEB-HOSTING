(function () {
  /* ====== EDIT YOUR DETAILS HERE ====== */
  var CONFIG = {
    name: 'AMAN WEB HOSTING',
    photo: '/pwa/icons/icon-512.png'
    ,
    ownerWhatsApp: '923186183402',   // YOUR WhatsApp number with country code, digits only (orders and screenshots go here)
    easypaisa: '03497081205',       // YOUR EasyPaisa number shown to the buyer
    accountName: 'AMAAN ULLAH',        // your name, shown to the buyer next to your EasyPaisa number
    ownerPhoto: 'owner.jpg'                   // your photo link (leave '' to use the logo photo above)
  };
  /* ==================================== */

  var MAX = 900 * 1024;
  var SAMPLE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My first site</title>' +
    '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:linear-gradient(160deg,#0b1020,#1b1440);color:#eef0f7;text-align:center}main{padding:24px}h1{font-size:2.4rem;margin:0 0 8px}p{color:#a0a7bd;margin:0}</style></head>' +
    '<body><main><h1>Hello from my site</h1><p>Hosted with AMAN HOST.</p></main></body></html>';

  var $ = function (id) { return document.getElementById(id); };
  var fileEl = $('file'), nameEl = $('name'), goEl = $('go'), dropEl = $('drop'), codeEl = $('code'), markEl = $('mark');
  var html = '', viewsMap = {}, filterText = '';

  var SV = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    copy: '<svg ' + SV + '><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    update: '<svg ' + SV + '><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>',
    code: '<svg ' + SV + '><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/></svg>',
    trash: '<svg ' + SV + '><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    open: '<svg ' + SV + '><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    share: '<svg ' + SV + '><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4M8.6 13.4l6.8 4"/></svg>',
    wa: '<svg ' + SV + ' stroke="#fff"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/></svg>',
    tg: '<svg ' + SV + ' stroke="#fff"><path d="M21 4L3 11l6 2 2 6 3-4 5 3z"/></svg>'
  };

  $('base').textContent = location.host + '/s/';

  /* ---------- account (login session) ---------- */
  var SESS = localStorage.getItem('sess') || '', USER = null;
  try { USER = JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) {}
  function H() { var h = { 'content-type': 'application/json' }; if (SESS) h.authorization = 'Bearer ' + SESS; return h; }
  function setGuest(g) { document.body.classList.toggle('guest', g); }
  function renderAcct() { $('acctName').textContent = USER ? '@' + USER.username + (USER.email ? ' - ' + USER.email : '') : ''; }
  var authMode = 'login';
  function setMode(m) {
    authMode = m;
    $('tabLogin').setAttribute('aria-selected', m === 'login'); $('tabReg').setAttribute('aria-selected', m === 'reg');
    $('auMailW').hidden = m === 'login';
    $('auUserLbl').textContent = m === 'login' ? 'Username or Gmail' : 'Username';
    $('auUser').placeholder = m === 'login' ? 'username or name@gmail.com' : 'choose a username';
    $('auPw').autocomplete = m === 'login' ? 'current-password' : 'new-password';
    $('auGo').textContent = m === 'login' ? 'Login' : 'Create account';
    $('auHint').textContent = ''; $('auHint').className = 'hint';
  }
  function auErr(m) { $('auHint').textContent = m; $('auHint').className = 'hint bad'; }
  function startSession(d) {
    SESS = d.session; USER = d.user;
    localStorage.setItem('sess', SESS); localStorage.setItem('user', JSON.stringify(USER));
    $('auPw').value = ''; setGuest(false); renderAcct(); ME = null; renderSites(); fetchViews(); fetchMe();
  }
  function doLogout(callServer) {
    if (callServer && SESS) fetch('/api/logout', { method: 'POST', headers: H() }).catch(function () {});
    SESS = ''; USER = null; ME = null; localStorage.removeItem('sess'); localStorage.removeItem('user');
    closeUp(); setGuest(true); setMode('login');
  }
  function authGo() {
    var btn = $('auGo'), user = $('auUser').value.trim(), pw = $('auPw').value, mail = $('auMail').value.trim();
    if (authMode === 'reg') {
      if (!/^[a-z0-9._+-]+@gmail\.com$/i.test(mail)) { auErr('Enter a valid Gmail address (name@gmail.com).'); return; }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(user)) { auErr('Username must be 3-20 letters, numbers or _ .'); return; }
      if (pw.length < 6) { auErr('Password must be at least 6 characters.'); return; }
    } else if (!user || !pw) { auErr('Enter your username and password.'); return; }
    btn.disabled = true; var label = btn.textContent; btn.textContent = 'Please wait...'; $('auHint').textContent = '';
    var req = authMode === 'reg'
      ? { url: '/api/register', body: { email: mail, username: user, password: pw, ref: localStorage.getItem('ref') || '' } }
      : { url: '/api/login', body: { id: user, password: pw } };
    fetch(req.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok) { auErr(x.d.error || 'Something went wrong.'); return; }
        if (authMode === 'reg') { try { localStorage.removeItem('ref'); } catch (e) {} }
        startSession(x.d); toast(authMode === 'reg' ? 'Account created. Welcome!' : 'Welcome back, @' + x.d.user.username);
      }).catch(function () { auErr('Network error. Try again.'); })
      .then(function () { btn.disabled = false; btn.textContent = label; });
  }
  $('tabLogin').onclick = function () { setMode('login'); };
  $('tabReg').onclick = function () { setMode('reg'); };
  $('auGo').onclick = authGo;
  ['auMail', 'auUser', 'auPw'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') authGo(); }); });
  $('logoutBtn').onclick = function () { doLogout(true); };
  var ME = null;

  function daysLeft(exp) { return Math.max(0, Math.ceil((exp - Date.now()) / 86400000)); }
  function renderPlan() {
    if (!ME) return;
    var pct = ME.limit ? Math.min(100, ME.used / ME.limit * 100) : 0, full = ME.used >= ME.limit;
    var extra = '';
    if (ME.exp) { var d = daysLeft(ME.exp); extra = ' - ' + d + (d === 1 ? ' day' : ' days') + ' left'; }
    else if (ME.expired) extra = ' - your plan ended, renew to add more';
    $('pbName').textContent = ME.label + ' plan';
    $('pbUse').textContent = ME.used + ' of ' + ME.limit + ' sites used' + (full && !ME.expired ? ' - limit reached' : '') + extra;
    var f = $('pbFill'); f.style.width = pct + '%'; f.style.background = full ? 'var(--danger)' : pct >= 80 ? 'var(--key)' : 'var(--accent-b)';
    $('pbUp').textContent = ME.plan === 'free' && !ME.expired ? 'Upgrade Plan' : 'Renew Plan';
  }
  function fetchMe() {
    if (!SESS) return Promise.resolve();
    return fetch('/api/me', { headers: H() }).then(function (r) { if (r.status === 401) { doLogout(false); return null; } return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.plans) { ME = d; if (d.user) { USER = d.user; localStorage.setItem('user', JSON.stringify(USER)); renderAcct(); } renderPlan(); } }).catch(function () {});
  }

  function perLabel(d) { return d === 7 ? '1 week' : d === 30 ? '1 month' : d === 365 ? '1 year' : d + ' days'; }
  function normPhone(v) { var d = String(v || '').replace(/\D/g, ''); if (d.indexOf('00') === 0) d = d.slice(2); if (d.charAt(0) === '0') d = '92' + d.slice(1); return d; }

  var PAY = { plan: null, shot: '', busy: false };
  function perWord(d) { return d === 7 ? 'a week' : d === 30 ? 'a month' : d === 365 ? 'a year' : d + ' days'; }
  function view(v) {
    ['vPlans', 'vPay', 'vDone', 'vOrders'].forEach(function (id) { $(id).hidden = id !== v; });
    $('upTitle').textContent = v === 'vPlans' ? 'Choose a subscription plan' : v === 'vPay' ? 'Complete your order' : v === 'vOrders' ? 'My Orders' : 'Order received';
    $('upBg').querySelector('.up-body').scrollTop = 0;
  }
  function paidPlans() { return ((ME && ME.plans) || []).filter(function (p) { return p.id !== 'free'; }); }
  function renderPlans() {
    var box = $('planList'); box.innerHTML = '';
    paidPlans().forEach(function (p) {
      var cur = ME && p.id === ME.plan && !ME.expired;
      var card = document.createElement('div'); card.className = 'plan-card' + (PAY.sel === p.id ? ' sel' : '');
      card.setAttribute('role', 'radio'); card.setAttribute('aria-checked', PAY.sel === p.id ? 'true' : 'false'); card.tabIndex = 0;
      var dot = document.createElement('span'); dot.className = 'pc-dot'; dot.textContent = '\u2713';
      var top = document.createElement('div'); top.className = 'pc-top';
      var nm = document.createElement('b'); nm.textContent = p.label + ' Plan';
      if (p.tag) { var t = document.createElement('span'); t.className = 'plan-tag'; t.textContent = p.tag; nm.appendChild(t); }
      var pr = document.createElement('span'); pr.className = 'pc-price'; pr.textContent = p.price || '';
      top.appendChild(nm); top.appendChild(pr);
      var ds = document.createElement('div'); ds.className = 'pc-desc';
      ds.textContent = 'Host up to ' + p.limit + ' websites for ' + perWord(p.days) + '.' + (cur ? ' Active now - ' + daysLeft(ME.exp) + ' d left.' : '');
      card.appendChild(dot); card.appendChild(top); card.appendChild(ds);
      var pick = function () { PAY.sel = p.id; renderPlans(); };
      card.onclick = pick;
      card.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
      box.appendChild(card);
    });
  }
  function openUp() {
    var list = paidPlans();
    var pop = list.filter(function (p) { return p.tag === 'Popular'; })[0] || list[0];
    PAY.sel = pop ? pop.id : '';
    renderPlans(); view('vPlans');
    $('upBg').classList.add('show');
  }
  function closeUp() { $('upBg').classList.remove('show'); }

  function startBuy(p) {
    PAY.plan = p; PAY.shot = ''; PAY.busy = false;
    $('shotPrev').hidden = true; $('shotPrev').removeAttribute('src'); $('shotTxt').hidden = false; $('shotTxt').textContent = 'Tap to choose screenshot'; $('shotIn').value = '';
    $('waIn').value = localStorage.getItem('wa') || '';
    $('payHint').textContent = ''; $('payHint').className = 'hint';
    $('paySum').textContent = p.label + ' Plan - ' + (p.price || '') + ' (' + perLabel(p.days) + ')';
    $('payNum').textContent = CONFIG.easypaisa; $('sellerName').textContent = CONFIG.accountName;
    var ph = $('sellerPhoto'), src = CONFIG.ownerPhoto || CONFIG.photo;
    ph.hidden = !src; if (src) { ph.src = src; ph.onerror = function () { ph.hidden = true; }; }
    $('paySend').disabled = false; $('paySend').textContent = 'Place Order';
    view('vPay');
  }
  function payErr(m) { $('payHint').textContent = m; $('payHint').className = 'hint bad'; }

  function compress(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var s = Math.min(1, 1280 / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var q = 0.85, d = c.toDataURL('image/jpeg', q);
        while (d.length > 800000 && q > 0.35) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
        d.length > 800000 ? reject() : resolve(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(); };
      img.src = url;
    });
  }
  $('shotIn').onchange = function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { payErr('Please choose an image.'); return; }
    $('shotTxt').textContent = 'Reading image...';
    compress(f).then(function (d) {
      PAY.shot = d; $('shotPrev').src = d; $('shotPrev').hidden = false; $('shotTxt').hidden = true; $('payHint').textContent = '';
    }, function () { PAY.shot = ''; $('shotTxt').textContent = 'Tap to choose screenshot'; payErr('Could not use this image. Try another screenshot.'); });
  };
  $('payCopy').onclick = function () {
    var n = CONFIG.easypaisa;
    (navigator.clipboard ? navigator.clipboard.writeText(n) : Promise.reject()).then(function () { toast('Number copied'); }, function () { toast('Copy failed'); });
  };
  $('payBack').onclick = function () { view('vPlans'); };
  $('planGo').onclick = function () {
    var p = paidPlans().filter(function (x) { return x.id === PAY.sel; })[0];
    if (p) startBuy(p);
  };

  function doneView(d, wa) {
    $('doneId').textContent = d.id;
    var rs = String(d.price || '').replace(/^Rs\.?\s*/i, '');
    var msg = '\u256D\u2501\u2501\u3014 \uD835\uDDE3\uD835\uDDF9\uD835\uDDEE\uD835\uDDFB \uD835\uDDE5\uD835\uDDF2\uD835\uDDFE\uD835\uDE02\uD835\uDDF2\uD835\uDE00\uD835\uDE01 \u3015\u2501\u2501\u2508\u22B7\n' +
      '\u2503 \uD83C\uDD94 Order: #' + d.id + '\n' +
      '\u2503 \uD83D\uDCE6 Plan: ' + d.label + ' (' + perLabel(d.days) + ')\n' +
      '\u2503 \uD83D\uDCB0 Rs. ' + rs + '\n' +
      '\u2503 \u267B\uFE0F Easypaisa\n' +
      '\u2503 \uD83D\uDCF1 WhatsApp: +' + wa + '\n' +
      '\u2503 \uD83E\uDDFE : ' + d.link + '\n\n' +
      'Please Verify My Payment And Activate My Plan.';
    $('waOpen').href = 'https://wa.me/' + String(CONFIG.ownerWhatsApp).replace(/\D/g, '') + '?text=' + encodeURIComponent(msg);
    view('vDone');
  }
  $('doneClose').onclick = closeUp;
  $('doneOrders').onclick = function () { openOrders(); };

  $('paySend').onclick = function () {
    if (PAY.busy || !PAY.plan) return;
    var wa = normPhone($('waIn').value);
    if (!/^\d{11,15}$/.test(wa)) { payErr('Enter a valid WhatsApp number, e.g. 03001234567.'); return; }
    if (!PAY.shot) { payErr('Please add your payment screenshot.'); return; }
    PAY.busy = true; $('paySend').disabled = true; $('paySend').textContent = 'Sending...'; $('payHint').textContent = '';
    var plan = PAY.plan;
    fetch('/api/order', { method: 'POST', headers: H(),
      body: JSON.stringify({ plan: plan.id, whatsapp: wa, shot: PAY.shot }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok && x.d.code === 'auth') { doLogout(false); return; }
        if (!x.ok) { payErr(x.d.error || 'Could not send your order.'); return; }
        localStorage.setItem('wa', $('waIn').value.trim());
        doneView(x.d, wa);
      }).catch(function () { payErr('Network error. Try again.'); })
      .then(function () { PAY.busy = false; $('paySend').disabled = false; $('paySend').textContent = 'Place Order'; });
  };


  function fmtDate(t) { var d = new Date(t); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  function renderOrders(list) {
    var box = $('ordList'); box.innerHTML = '';
    if (!list) { box.innerHTML = '<p class="done-p">Could not load orders. Try again.</p>'; return; }
    if (!list.length) { box.innerHTML = '<p class="done-p">No orders yet. Choose a plan and place your first order.</p>'; return; }
    list.forEach(function (o) {
      var card = document.createElement('div'); card.className = 'plan-card';
      var top = document.createElement('div'); top.className = 'pc-top';
      var nm = document.createElement('b'); nm.textContent = o.label + ' Plan';
      var st = document.createElement('span'); st.className = 'plan-tag';
      var gone = o.status === 'approved' && o.exp && o.exp < Date.now();
      st.textContent = gone ? 'Expired' : o.status === 'approved' ? 'Approved' : o.status === 'rejected' ? 'Rejected' : 'Pending';
      if (o.status === 'approved' && !gone) { st.style.color = 'var(--ok)'; st.style.borderColor = 'rgba(62,224,138,.5)'; st.style.background = 'rgba(62,224,138,.12)'; }
      if (o.status === 'rejected' || gone) { st.style.color = 'var(--danger)'; st.style.borderColor = 'rgba(255,107,107,.5)'; st.style.background = 'rgba(255,107,107,.1)'; }
      nm.appendChild(st);
      var pr = document.createElement('span'); pr.className = 'pc-price'; pr.textContent = o.price || '';
      top.appendChild(nm); top.appendChild(pr);
      var ds = document.createElement('div'); ds.className = 'pc-desc';
      var info = 'Order #' + o.id + ' - ' + fmtDate(o.ts);
      if (o.status === 'pending') info += ' - waiting for approval';
      else if (o.status === 'approved' && o.exp) info += gone ? ' - plan ended on ' + fmtDate(o.exp) + ', renew to host more' : ' - active until ' + fmtDate(o.exp);
      else if (o.status === 'rejected') info += ' - payment not verified, contact support';
      ds.textContent = info;
      card.appendChild(top); card.appendChild(ds); box.appendChild(card);
    });
  }
  function openOrders() {
    $('ordList').innerHTML = '<p class="done-p">Loading...</p>';
    view('vOrders'); $('upBg').classList.add('show');
    fetch('/api/me?orders=1', { headers: H(), cache: 'no-store' })
      .then(function (r) { if (r.status === 401) { doLogout(false); return null; } return r.ok ? r.json() : null; })
      .then(function (d) { if (d) { renderOrders(d.orders || []); fetchMe(); } })
      .catch(function () { renderOrders(null); });
  }


  /* ---------- right sidebar ---------- */
  function sdOpen() {
    renderSidebar(); $('sdBg').classList.add('show'); $('sd').classList.add('show'); $('sd').setAttribute('aria-hidden', 'false');
    if (SESS) { fetchMe().then(renderSidebar); loadSdOrders(); }
  }
  function sdClose() { $('sdBg').classList.remove('show'); $('sd').classList.remove('show'); $('sd').setAttribute('aria-hidden', 'true'); }
  function refLink() { return USER ? location.origin + '/?ref=' + USER.username : ''; }
  function renderSidebar() {
    var on = !!(SESS && USER);
    $('sdGuest').hidden = on; $('sdUser').hidden = !on;
    if (!on) return;
    var m = ME || {}, u = (m.user) || USER;
    $('sdAv').textContent = (u.username || '?').charAt(0);
    $('sdName').textContent = '@' + u.username; $('sdMail').textContent = u.email || '';
    $('sdPlan').textContent = (m.label || 'Free') + ' plan';
    var stat = 'Free - never ends';
    if (m.exp) { var d = daysLeft(m.exp); stat = 'Active - ' + d + (d === 1 ? ' day' : ' days') + ' left (until ' + fmtDate(m.exp) + ')'; }
    else if (m.expired) stat = 'Plan ended - renew to add more sites';
    $('sdStat').textContent = stat;
    var pct = m.limit ? Math.min(100, (m.used || 0) / m.limit * 100) : 0;
    $('sdFill').style.width = pct + '%'; $('sdFill').style.background = (m.used >= m.limit) ? 'var(--danger)' : 'var(--accent-b)';
    $('sdUp').textContent = (m.plan === 'free' && !m.expired) ? 'Upgrade Plan' : 'Renew Plan';
    var per = m.refPer || 5;
    $('sdPer').textContent = per; $('sdLink').value = refLink();
    $('sdRefN').textContent = m.refs || 0; $('sdRefB').textContent = '+' + (m.bonus || 0);
    $('sdJoined').textContent = u.joined ? fmtDate(u.joined) : '-';
    $('sdSites').textContent = (m.used || 0) + ' of ' + (m.limit || 0) + ' used' + ((m.extra || m.bonus) ? ' (incl. ' + ((m.extra || 0) + (m.bonus || 0)) + ' extra)' : '');
    $('sdViews').textContent = $('stViews') ? $('stViews').textContent : '-';
  }
  function loadSdOrders() {
    $('sdOrd').textContent = 'Loading...';
    fetch('/api/me?orders=1', { headers: H(), cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) { $('sdOrd').textContent = '-'; return; }
        var l = d.orders || [], p = l.filter(function (o) { return o.status === 'pending'; }).length;
        $('sdOrd').textContent = l.length ? l.length + ' total' + (p ? ' - ' + p + ' pending' : '') : 'None yet';
      }).catch(function () { $('sdOrd').textContent = '-'; });
  }
  $('sdOpen').onclick = sdOpen; $('sdClose').onclick = sdClose; $('sdBg').onclick = sdClose;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sdClose(); });
  $('sdLogin').onclick = function () { sdClose(); var a = $('authBox'); if (a && a.scrollIntoView) a.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  $('sdUp').onclick = function () { sdClose(); openUp(); };
  $('sdOrders').onclick = function () { sdClose(); openOrders(); };
  $('sdOut').onclick = function () { sdClose(); doLogout(true); };
  $('sdCopy').onclick = function () {
    var l = refLink(), b = $('sdCopy');
    function ok() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(l).then(ok, function () { $('sdLink').select(); document.execCommand('copy'); ok(); });
    else { $('sdLink').select(); try { document.execCommand('copy'); } catch (e) {} ok(); }
  };
  $('sdShare').onclick = function () {
    var t = 'Free website hosting - join AMAN WEB HOSTING with my link: ' + refLink();
    window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
  };


  /* ---------- install as an app (PWA) ---------- */
  var DEFER = null;
  var IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var IS_APP = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function insSnoozed() { try { return Date.now() - (Number(localStorage.getItem('insX')) || 0) < 3 * 86400000; } catch (e) { return false; } }
  function insCan() { return !IS_APP && (DEFER || IS_IOS); }
  function insShow() {
    if (!insCan() || insSnoozed()) return;
    var b = $('ins'); b.hidden = false; setTimeout(function () { b.classList.add('show'); }, 30);
  }
  function insHide(snooze) {
    var b = $('ins'); b.classList.remove('show'); setTimeout(function () { b.hidden = true; }, 400);
    if (snooze) { try { localStorage.setItem('insX', String(Date.now())); } catch (e) {} }
  }
  function insGo() {
    if (DEFER) {
      var d = DEFER; DEFER = null; d.prompt();
      d.userChoice.then(function (c) { insHide(c.outcome !== 'accepted'); $('sdInstall').hidden = true; });
    } else if (IS_IOS) {
      $('insSub').textContent = 'Tap the Share button, then choose "Add to Home Screen".';
      $('insGo').hidden = true;
    }
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); DEFER = e; $('sdInstall').hidden = false; setTimeout(insShow, 1200);
  });
  window.addEventListener('appinstalled', function () { DEFER = null; insHide(false); $('sdInstall').hidden = true; toast('App installed'); notify('AMAN WEB HOSTING', 'App installed. Deploy your first site now.'); });
  if (IS_IOS && !IS_APP) { $('sdInstall').hidden = false; setTimeout(insShow, 1800); }
  $('insGo').onclick = insGo; $('insX').onclick = function () { insHide(true); };
  $('sdInstall').onclick = function () { sdClose(); if (DEFER) insGo(); else { $('insGo').hidden = false; $('ins').hidden = false; setTimeout(function () { $('ins').classList.add('show'); insGo(); }, 30); } };
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });

  /* referral link capture + visit ping */
  try {
    var qr = new URLSearchParams(location.search).get('ref');
    if (qr && /^[a-zA-Z0-9_]{3,20}$/.test(qr)) localStorage.setItem('ref', qr.toLowerCase());
  } catch (e) {}
  try {
    if (!sessionStorage.getItem('vz')) {
      sessionStorage.setItem('vz', '1');
      var vid = localStorage.getItem('vid');
      if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('vid', vid); }
      fetch('/api/stats', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ v: vid }), keepalive: true }).catch(function () {});
    }
  } catch (e) {}
  $('pbOrders').onclick = openOrders;
  $('ordBack').onclick = function () { openUp(); };
  $('pbUp').onclick = openUp;
  $('upClose').onclick = closeUp;
  document.addEventListener('visibilitychange', function () { if (!document.hidden) fetchMe(); });
  $('upBg').addEventListener('click', function (e) { if (e.target === $('upBg')) closeUp(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeUp(); });

  /* ---------- helpers ---------- */
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
  function bytes(s) { return new Blob([s]).size; }
  function fmt(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
  function num(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n); }
  function ago(ts) {
    if (!ts) return 'earlier';
    var s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  }

  /* ---------- notifications (uses the AMAN logo as icon) ---------- */
  var NOTE_ICON = '/pwa/icons/icon-192.png', NOTE_BADGE = '/pwa/icons/badge-96.png', NOTE_IMG = '/pwa/icons/banner-512.jpg';
  function askNotify() {
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {}
  }
  function notify(title, body, url) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      var o = { body: body || '', icon: NOTE_ICON, badge: NOTE_BADGE, image: NOTE_IMG, tag: 'aman-host', data: { url: url || '/' } };
      if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(function (r) { r.showNotification(title, o); }).catch(function () { new Notification(title, o); });
      else new Notification(title, o);
    } catch (e) {}
  }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, 2400);
  }
  function copy(text) {
    function done() { toast('Link copied'); }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Long-press the link instead.'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }

  /* ---------- logo ---------- */
  (function () {
    var img = $('photo');
    img.alt = CONFIG.name;
    img.onload = function () { markEl.classList.add('has-logo'); };
    img.src = CONFIG.photo;
  })();

  /* ---------- saved sites (kept per account on this browser) ---------- */
  function skey() { return 'sites:' + (USER ? USER.username : 'guest'); }
  function loadSites() {
    var s = {};
    try {
      var raw = localStorage.getItem(skey());
      if (raw === null && USER) { // first login on this browser: adopt sites saved before accounts existed
        var legacy = localStorage.getItem('sites');
        if (legacy) { raw = legacy; localStorage.setItem(skey(), legacy); localStorage.removeItem('sites'); }
      }
      s = JSON.parse(raw || '{}');
    } catch (e) {}
    return s;
  }
  function saveSites(s) { localStorage.setItem(skey(), JSON.stringify(s)); }

  function fetchViews() {
    var names = Object.keys(loadSites());
    if (!names.length) return;
    fetch('/api/stats?names=' + encodeURIComponent(names.join(',')))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.views) { viewsMap = d.views; renderSites(); } })
      .catch(function () {});
  }

  function renderSites() {
    var s = loadSites();
    var names = Object.keys(s).sort(function (a, b) { return (s[b].ts || 0) - (s[a].ts || 0); });
    var totalSize = 0, totalViews = 0;
    names.forEach(function (n) { totalSize += s[n].size || 0; totalViews += viewsMap[n] || 0; });
    $('stSites').textContent = names.length; $('stViews').textContent = num(totalViews); $('stSize').textContent = fmt(totalSize);
    $('searchWrap').hidden = names.length < 4;
    var shown = names.filter(function (n) { return n.indexOf(filterText) >= 0; });

    var box = $('list'); box.innerHTML = '';
    var none = $('none');
    if (!names.length) { none.textContent = 'No sites yet. Deploy your first file and it will show up here.'; none.style.display = 'block'; }
    else if (!shown.length) { none.textContent = 'No site matches your search.'; none.style.display = 'block'; }
    else none.style.display = 'none';

    shown.forEach(function (n) {
      var url = location.origin + '/s/' + n;
      var item = document.createElement('div'); item.className = 'hist-item';
      var top = document.createElement('div'); top.className = 'hist-top';
      var link = document.createElement('a'); link.className = 'hist-link'; link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = location.host + '/s/' + n;
      var acts = document.createElement('div'); acts.className = 'hist-actions';
      var open = document.createElement('a'); open.className = 'hist-open'; open.href = url; open.target = '_blank'; open.rel = 'noopener'; open.textContent = 'Open';
      function ib(icon, label, cls, fn) { var b = document.createElement('button'); b.className = 'icon-btn' + (cls ? ' ' + cls : ''); b.setAttribute('aria-label', label); b.title = label; b.innerHTML = icon; b.onclick = fn; acts.appendChild(b); }
      acts.appendChild(open);
      ib(ICON.copy, 'Copy link', '', function () { copy(url); });
      ib(ICON.code, 'Edit code', '', function () { editCode(n); });
      ib(ICON.update, 'Replace with a new file', '', function () { nameEl.value = n; syncUrl(); toTop(); toast('Choose the new file for ' + n); fileEl.click(); });
      ib(ICON.trash, 'Delete site', 'del', function () { del(n); });
      top.appendChild(link); top.appendChild(acts);
      var meta = document.createElement('div'); meta.className = 'hist-meta';
      var bits = [];
      if (s[n].size) bits.push(fmt(s[n].size));
      if (viewsMap[n] !== undefined) bits.push(num(viewsMap[n]) + (viewsMap[n] === 1 ? ' view' : ' views'));
      bits.push('updated ' + ago(s[n].ts));
      meta.textContent = bits.join(' - ');
      item.appendChild(top); item.appendChild(meta); box.appendChild(item);
    });
  }

  function toTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function editCode(n) {
    toast('Loading ' + n + '...');
    fetch('/s/' + n + '?nv=1&_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('nf'); return r.text(); })
      .then(function (t) {
        tab(true); html = t; codeEl.value = t; nameEl.value = n;
        syncUrl(); refresh(); toTop(); toast('Edit the code, then press Deploy to update ' + n);
      }).catch(function () { toast('Could not load the code of ' + n + '.'); });
  }

  function del(n) {
    if (!confirm('Delete "' + n + '"? The link will stop working.')) return;
    var s = loadSites();
    fetch('/api/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: n, token: s[n] && s[n].token }) })
      .then(function (r) { return r.json().then(function (d) { return { r: r, d: d }; }); })
      .then(function (x) {
        if (x.r.ok || x.r.status === 404) { delete s[n]; saveSites(s); delete viewsMap[n]; renderSites(); fetchMe(); toast('Deleted ' + n); }
        else toast(x.d.error || 'Could not delete.');
      }).catch(function () { toast('Network error. Try again.'); });
  }

  $('search').addEventListener('input', function () { filterText = slug($('search').value); renderSites(); });

  /* ---------- editor state ---------- */
  function syncUrl() { $('urlTxt').textContent = location.host + '/s/' + (slug(nameEl.value) || 'your-site'); }
  function setStatus(live) { $('addr').classList.toggle('live', !!live); $('status').textContent = live ? 'Live' : 'Draft'; }

  function checkHtml() {
    var w = $('warn'), msgs = [];
    if (html.trim()) {
      var re = /(?:src|href)\s*=\s*["'](?!https?:|\/\/|data:|#|mailto:|tel:|javascript:)([^"']+\.(?:css|js|png|jpe?g|gif|svg|webp|ico|mp4|woff2?))["']/gi, m, found = [];
      while ((m = re.exec(html)) && found.length < 3) { if (found.indexOf(m[1]) < 0) found.push(m[1]); }
      if (found.length) msgs.push('This file links to local files (' + found.join(', ') + '). They will not load. Put CSS and JS inside the HTML, or use full https:// links.');
      if (!/<html|<!doctype|<body|<div|<p|<h1/i.test(html)) msgs.push('This does not look like HTML. Check that you chose the right file.');
    }
    w.textContent = msgs.join(' '); w.classList.toggle('on', msgs.length > 0);
  }

  function refresh() {
    var n = html ? bytes(html) : 0, pct = Math.min(100, n / MAX * 100);
    var f = $('fill'); f.style.width = pct + '%'; f.style.background = n > MAX ? 'var(--danger)' : pct > 80 ? 'var(--key)' : 'var(--accent-b)';
    $('sizeTxt').textContent = fmt(n) + (n > MAX ? ' - too large' : '');
    goEl.disabled = !html.trim() || n > MAX;
    var vp = $('viewport'), fr = $('frame');
    if (html.trim()) { vp.classList.add('has'); fr.srcdoc = html; } else { vp.classList.remove('has'); fr.removeAttribute('srcdoc'); }
    checkHtml(); setStatus(false);
  }

  function loadText(text, label, sizeBytes) {
    html = text; codeEl.value = text;
    $('dropTitle').textContent = label; $('dropSub').textContent = fmt(sizeBytes) + ' - tap to choose another';
    dropEl.classList.add('has');
    syncUrl(); refresh();
  }

  function readFile(f) {
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      loadText(String(r.result), f.name, f.size);
      var base = slug(f.name.replace(/\.html?$/i, ''));
      if (!nameEl.value && base && base !== 'index') { nameEl.value = base; syncUrl(); }
    };
    r.readAsText(f);
  }

  fileEl.addEventListener('change', function () { readFile(fileEl.files[0]); fileEl.value = ''; });
  dropEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileEl.click(); } });

  $('sample').addEventListener('click', function () {
    tab(false); loadText(SAMPLE, 'sample.html', bytes(SAMPLE));
    if (!nameEl.value) { nameEl.value = 'my-first-site'; syncUrl(); }
    toast('Sample loaded. Press Deploy to publish it.');
  });

  /* drag and drop anywhere on the page */
  var veil = $('veil'), dragN = 0;
  function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
  window.addEventListener('dragenter', function (e) { if (!hasFiles(e)) return; e.preventDefault(); dragN++; veil.classList.add('on'); dropEl.classList.add('over'); });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('dragleave', function () { dragN = Math.max(0, dragN - 1); if (!dragN) { veil.classList.remove('on'); dropEl.classList.remove('over'); } });
  window.addEventListener('drop', function (e) {
    e.preventDefault(); dragN = 0; veil.classList.remove('on'); dropEl.classList.remove('over');
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { tab(false); readFile(f); }
  });

  codeEl.addEventListener('input', function () { html = codeEl.value; refresh(); });
  nameEl.addEventListener('input', function () { nameEl.value = slug(nameEl.value); syncUrl(); setStatus(false); });

  function tab(paste) {
    $('tabUpload').setAttribute('aria-selected', String(!paste)); $('tabPaste').setAttribute('aria-selected', String(paste));
    dropEl.hidden = paste; codeEl.hidden = !paste;
    if (paste && document.activeElement !== codeEl) codeEl.focus({ preventScroll: true });
  }
  $('tabUpload').onclick = function () { tab(false); };
  $('tabPaste').onclick = function () { tab(true); };

  function dev(mobile) {
    $('viewport').classList.toggle('mobile', mobile);
    $('devM').setAttribute('aria-pressed', String(mobile)); $('devD').setAttribute('aria-pressed', String(!mobile));
  }
  $('devD').onclick = function () { dev(false); };
  $('devM').onclick = function () { dev(true); };

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !goEl.disabled) { e.preventDefault(); goEl.click(); }
  });

  /* ---------- deploy ---------- */
  function step(id, state) { var el = $(id); el.className = state || ''; el.querySelector('.ic').textContent = state === 'done' ? '\u2713' : state === 'fail' ? '!' : ''; }
  function resetSteps() { ['s1', 's2', 's3'].forEach(function (i) { step(i, ''); }); }
  function idle() { goEl.classList.remove('loading'); markEl.classList.remove('busy'); $('goTxt').textContent = 'Deploy'; goEl.disabled = !html.trim() || bytes(html) > MAX; }

  goEl.addEventListener('click', function () {
    var name = slug(nameEl.value), sites = loadSites(), res = $('result');
    res.className = 'result'; res.innerHTML = '';
    askNotify();
    $('steps').classList.add('on'); resetSteps();
    goEl.disabled = true; goEl.classList.add('loading'); markEl.classList.add('busy'); $('goTxt').textContent = 'Deploying...';
    step('s1', 'done'); step('s2', 'active');

    fetch('/api/deploy', {
      method: 'POST', headers: H(),
      body: JSON.stringify({ name: name, html: html, token: name && sites[name] ? sites[name].token : '' })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (x) {
      if (!x.ok && x.d.code === 'auth') { doLogout(false); idle(); return; }
      if (!x.ok) { step('s2', 'fail'); showErr(x.d.error || 'Deploy failed. Try again.', x.d.code === 'limit'); idle(); if (x.d.code === 'limit') fetchMe(); return; }
      step('s2', 'done'); step('s3', 'active');
      sites[x.d.name] = { token: x.d.token, ts: Date.now(), size: bytes(html) }; saveSites(sites);
      nameEl.value = x.d.name; syncUrl();
      setTimeout(function () { step('s3', 'done'); setStatus(true); showOk(x.d.name); notify('Your site is live', location.origin + '/s/' + x.d.name, '/s/' + x.d.name); renderSites(); fetchViews(); fetchMe(); idle(); }, 450);
    }).catch(function () { step('s2', 'fail'); showErr('Network error. Check your connection and try again.'); idle(); });
  });

  function showErr(msg, withUpgrade) {
    var r = $('result'); r.className = 'result show error';
    r.innerHTML = ''; var p = document.createElement('div'); p.className = 'res-err'; p.textContent = msg; r.appendChild(p);
    if (withUpgrade) {
      var w = document.createElement('div'); w.className = 'res-up';
      var b = document.createElement('button'); b.className = 'act primary'; b.type = 'button'; b.textContent = 'See plans'; b.onclick = openUp;
      w.appendChild(b); r.appendChild(w);
    }
  }

  function showOk(name) {
    var url = location.origin + '/s/' + name, enc = encodeURIComponent(url), r = $('result');
    r.className = 'result show';
    r.innerHTML =
      '<div class="res-head"><div class="res-check"><svg viewBox="0 0 24 24" fill="none" stroke="#3ee08a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
      '<div><b>Your site is live</b><small>Share the link below</small></div></div>' +
      '<div class="res-link"><code></code><button class="icon-btn" id="rCopy" aria-label="Copy link">' + ICON.copy + '</button></div>' +
      '<div class="res-actions three">' +
        '<button class="act primary" id="aCopy">' + ICON.copy + 'Copy link</button>' +
        '<a class="act" id="aOpen" target="_blank" rel="noopener">' + ICON.open + 'Open site</a>' +
        '<button class="act" id="aShare">' + ICON.share + 'Share</button>' +
      '</div>' +
      '<div class="share-row">' +
        '<a class="share-chip" target="_blank" rel="noopener" href="https://wa.me/?text=' + enc + '"><span class="ico" style="background:#25d366">' + ICON.wa + '</span>WhatsApp</a>' +
        '<a class="share-chip" target="_blank" rel="noopener" href="https://t.me/share/url?url=' + enc + '"><span class="ico" style="background:#29a9eb">' + ICON.tg + '</span>Telegram</a>' +
      '</div>' +
      '<div class="qr-panel" id="qrPanel"><div id="qr"></div><div><p>Scan with your phone camera to open the site.</p><button class="link-btn" id="qrSave" type="button">Save QR image</button></div></div>';
    r.querySelector('code').textContent = url;
    (function () {
      var chk = r.querySelector('.res-check'), wrap = document.createElement('span'), cols = ['#ffa21a', '#35d0ff', '#7c6bff', '#3ee08a', '#ffffff'];
      wrap.className = 'burst';
      for (var i = 0; i < 16; i++) {
        var a = (i / 16) * Math.PI * 2, d = 38 + (i % 3) * 14, p = document.createElement('i');
        p.style.setProperty('--x', Math.round(Math.cos(a) * d) + 'px');
        p.style.setProperty('--y', Math.round(Math.sin(a) * d) + 'px');
        p.style.setProperty('--c', cols[i % cols.length]);
        wrap.appendChild(p);
      }
      chk.appendChild(wrap);
    })();
    $('aOpen').href = url;
    $('rCopy').onclick = $('aCopy').onclick = function () { copy(url); };
    $('aShare').onclick = function () {
      if (navigator.share) navigator.share({ title: name, url: url }).catch(function () {}); else copy(url);
    };

    var panel = $('qrPanel');
    if (window.QRCode) {
      try {
        new QRCode($('qr'), { text: url, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M });
        $('qrSave').onclick = function () {
          var im = $('qr').querySelector('img'), cv = $('qr').querySelector('canvas');
          var src = im && im.src ? im.src : cv ? cv.toDataURL('image/png') : '';
          if (!src) return;
          var a = document.createElement('a'); a.href = src; a.download = name + '-qr.png'; document.body.appendChild(a); a.click(); a.remove();
        };
      } catch (e) { panel.style.display = 'none'; }
    } else panel.style.display = 'none';
  }

  setMode('login');
  if (SESS && USER) { setGuest(false); renderAcct(); } else setGuest(true);
  syncUrl(); renderSites(); refresh(); fetchViews(); fetchMe();
})();

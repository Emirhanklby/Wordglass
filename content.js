(() => {
  if (window.__wordglass) return;
  window.__wordglass = true;

  const DEF = {
    provider: 'auto',
    side: 'left',
    englishOnly: true,
    autoClose: 0,
    opacity: 0.9,
    deeplKey: '',
    libreUrl: '',
    libreKey: ''
  };

  const HL = 'wg-saved';
  const GUARD_BASE =
    'button,input,textarea,select,label,summary,video,audio,[role="button"],[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]';

  const F = chrome.runtime.getURL('fonts/');

  const PANEL_CSS = `
    @font-face {
      font-family: 'Nunito';
      font-style: normal;
      font-weight: 400 700;
      font-display: swap;
      src: url("${F}nunito-latin-ext.woff2") format('woff2');
      unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF;
    }
    @font-face {
      font-family: 'Nunito';
      font-style: normal;
      font-weight: 400 700;
      font-display: swap;
      src: url("${F}nunito-latin.woff2") format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }
    :host { all: initial; }
    * { box-sizing: border-box; }
    .card {
      position: fixed;
      top: 50%;
      width: var(--wg-w, 620px);
      max-width: calc(100vw - 40px);
      display: flex;
      flex-direction: column;
      transform: translateY(-50%) translateX(-14px) scale(.985);
      opacity: 0;
      filter: blur(6px);
      pointer-events: none;
      background:
        radial-gradient(120% 160% at 0% 0%, rgba(24,110,72,var(--glow-a, .2)), transparent 58%),
        linear-gradient(150deg, rgba(11,21,16,var(--bg-a, .92)), rgba(4,8,6,var(--bg-b, .95)));
      border: 1px solid rgba(47,191,113,.22);
      border-radius: 16px;
      padding: 11px 16px 11px;
      color: #eaf6ef;
      font-family: 'Nunito', ui-rounded, 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      letter-spacing: .1px;
      text-align: left;
      backdrop-filter: blur(18px) saturate(130%);
      -webkit-backdrop-filter: blur(18px) saturate(130%);
      box-shadow: 0 18px 50px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05);
      transition: opacity .2s ease, transform .26s cubic-bezier(.2,.8,.25,1), filter .26s ease;
    }
    .card:focus { outline: none; }
    .card.in { opacity: 1; filter: none; pointer-events: auto; transform: translateY(-50%) translateX(0) scale(1); }
    .card.free, .card.free.in { transform: none; }
    .card.dragging { transition: none; }

    .top { display: flex; align-items: center; gap: 8px; cursor: grab; user-select: none; flex: 0 0 auto; }
    .card.dragging .top { cursor: grabbing; }
    .tag { font-size: 9.5px; letter-spacing: 1.8px; text-transform: uppercase; color: #7d9c8b; }
    .back, .x {
      appearance: none; background: none; border: 0; padding: 1px 4px; margin: 0;
      color: #86a294; font-family: inherit; line-height: 1; cursor: pointer; border-radius: 7px;
    }
    .back { font-size: 16px; }
    .x { font-size: 16px; margin-left: auto; }
    .back:hover, .x:hover { color: #d9ffe9; background: rgba(47,191,113,.14); }
    button:focus-visible { outline: 2px solid rgba(47,191,113,.7); outline-offset: 2px; }

    .body { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin: 8px 0 0; }
    .pos {
      font-size: 10px; font-weight: 600; letter-spacing: .3px;
      color: #9fd9b8; background: rgba(47,191,113,.12); border: 1px solid rgba(47,191,113,.22);
      border-radius: 99px; padding: 1px 8px; white-space: nowrap;
      opacity: 0; transform: translateY(3px); transition: opacity .2s ease .02s, transform .2s ease .02s;
    }
    .card.in .pos { opacity: 1; transform: none; }
    .trans {
      margin: 0; font-size: calc(21px * var(--fs, 1)); line-height: 1.3; font-weight: 600; color: #d9ffe9;
      word-break: break-word;
      opacity: 0; transform: translateY(5px);
      transition: opacity .22s ease .04s, transform .22s ease .04s;
    }
    .trans.in { opacity: 1; transform: none; }
    .trans.loading { font-size: 13px; font-weight: 500; color: #9fb9aa; animation: pulse 1.1s ease-in-out infinite; }
    .trans.err { color: #f0b6a4; font-size: 13px; font-weight: 500; }
    @keyframes pulse { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }

    .bottom { display: flex; align-items: center; gap: 4px; margin: 9px 0 0; flex: 0 0 auto; }
    .save {
      appearance: none; background: rgba(31,122,77,.18); border: 1px solid rgba(47,191,113,.32);
      color: #a6efc4; font-family: inherit; font-weight: 600; font-size: 12px;
      padding: 5px 14px; border-radius: 9px; min-height: 29px; cursor: pointer;
      transition: background .15s ease, border-color .15s ease, color .15s ease;
    }
    .save:hover:not(:disabled) { background: rgba(47,191,113,.26); border-color: rgba(47,191,113,.5); color: #dcffe9; }
    .save:disabled { cursor: default; background: rgba(47,191,113,.07); border-color: rgba(47,191,113,.14); color: #8fb7a2; }
    .act {
      appearance: none; background: none; border: 1px solid transparent; color: #9fc4b0;
      font-family: inherit; font-size: 11.5px; padding: 4px 8px; border-radius: 8px;
      min-height: 26px; cursor: pointer; transition: background .15s ease, color .15s ease;
    }
    .act:hover { background: rgba(47,191,113,.12); color: #dcffe9; }
    .act.primary { color: #b8f5d1; border-color: rgba(47,191,113,.32); background: rgba(31,122,77,.16); }
    .count { margin-left: auto; font-size: 10.5px; color: #86a294; white-space: nowrap; }

    .hint {
      position: fixed; left: 22px; bottom: 22px; max-width: 280px; padding: 10px 13px;
      border-radius: 12px; border: 1px solid rgba(47,191,113,.22); background: rgba(6,12,9,.94);
      color: #b3cfc0; font-family: 'Nunito', ui-rounded, system-ui, sans-serif;
      font-size: 12px; line-height: 1.5; box-shadow: 0 12px 34px rgba(0,0,0,.55);
      opacity: 0; transform: translateY(6px); transition: opacity .2s ease, transform .2s ease;
      pointer-events: none;
    }
    .hint.in { opacity: 1; transform: none; }

    .card.squeeze { padding: 9px 13px; }
    .card.squeeze .body { gap: 4px; margin-top: 5px; }
    .card.squeeze .bottom { margin-top: 7px; }

    .card.tall { max-height: calc(100vh - 28px); overflow-y: auto; }
    .card.tall::-webkit-scrollbar { width: 7px; }
    .card.tall::-webkit-scrollbar-thumb { background: rgba(47,191,113,.28); border-radius: 8px; }

    @media (prefers-reduced-motion: reduce) {
      .card, .trans, .hint { transition: none; }
      .trans.loading { animation: none; }
    }
  `;

  const HL_CSS =
    '::highlight(' +
    HL +
    '){background-color:rgba(47,191,113,.13);text-decoration:underline dotted rgba(47,191,113,.55);text-underline-offset:2px;}';

  const POS_TR = {
    noun: 'isim',
    verb: 'fiil',
    adjective: 'sıfat',
    adverb: 'zarf',
    pronoun: 'zamir',
    preposition: 'edat',
    conjunction: 'bağlaç',
    interjection: 'ünlem',
    exclamation: 'ünlem',
    determiner: 'belirteç',
    article: 'tanımlık',
    numeral: 'sayı',
    number: 'sayı',
    phrase: 'ifade'
  };

  function posTr(p) {
    const raw = String(p || '').trim();
    if (!raw) return '';
    const k = raw.toLowerCase();
    if (POS_TR[k]) return POS_TR[k];
    for (const key of Object.keys(POS_TR)) {
      if (new RegExp('\\b' + key + '\\b').test(k)) return POS_TR[key];
    }
    return raw;
  }

  let S = { ...DEF };
  let host = null;
  let shadow = null;
  let card = null;
  let hintEl = null;
  let elTrans = null;
  let elPos = null;
  let elSave = null;
  let elCopy = null;
  let elRetry = null;
  let elCfg = null;
  let elCancel = null;
  let elUndo = null;
  let elCount = null;
  let elBack = null;

  let saved = new Map();
  let hist = [];
  let current = null;
  let token = 0;
  let sig = '';
  let timer = 0;
  let freePos = null;
  let disabled = false;
  let drag = null;
  let scanTimer = 0;
  let hlReady = false;
  let hintTimer = 0;
  let undo = null;
  let undoTimer = 0;
  let copyTimer = 0;
  let disabledHinted = false;
  let notEnglishHinted = false;
  let intent = 0;

  init();

  async function init() {
    build();
    await Promise.all([loadSettings(), loadWords(), loadLocal()]);
    applySide();
    bind();
    scanLater();
    maybeHint();
  }

  function build() {
    if (host) return;
    host = document.createElement('div');
    host.setAttribute('data-wordglass', '1');
    host.style.cssText =
      'all:initial;position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483647;';
    shadow = host.attachShadow({ mode: 'open' });

    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(PANEL_CSS);
      shadow.adoptedStyleSheets = [sheet];
    } catch (_) {
      const st = document.createElement('style');
      st.textContent = PANEL_CSS;
      shadow.append(st);
    }

    card = document.createElement('section');
    card.className = 'card';
    card.tabIndex = -1;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'wordglass çeviri');
    card.innerHTML =
      '<div class="top">' +
      '<button class="back" type="button" aria-label="geri" hidden>‹</button>' +
      '<span class="tag">wordglass</span>' +
      '<button class="x" type="button" aria-label="kapat">×</button>' +
      '</div>' +
      '<div class="body">' +
      '<p class="trans" role="status" aria-live="polite"></p>' +
      '<span class="pos" hidden></span>' +
      '</div>' +
      '<div class="bottom">' +
      '<button class="save" type="button">kaydet</button>' +
      '<button class="act undo" type="button" hidden>geri al</button>' +
      '<button class="act copy" type="button" hidden>kopyala</button>' +
      '<button class="act retry primary" type="button" hidden>tekrar dene</button>' +
      '<button class="act cfg" type="button" hidden>ayarlar</button>' +
      '<button class="act cancel" type="button" hidden>vazgeç</button>' +
      '<span class="count"></span>' +
      '</div>';

    hintEl = document.createElement('div');
    hintEl.className = 'hint';
    hintEl.textContent = 'metni seç, çevirisini gör, kaydet ile havuza at';

    shadow.append(card, hintEl);
    document.documentElement.append(host);

    elTrans = card.querySelector('.trans');
    elPos = card.querySelector('.pos');
    elSave = card.querySelector('.save');
    elCopy = card.querySelector('.copy');
    elRetry = card.querySelector('.retry');
    elCfg = card.querySelector('.cfg');
    elCancel = card.querySelector('.cancel');
    elUndo = card.querySelector('.undo');
    elCount = card.querySelector('.count');
    elBack = card.querySelector('.back');

    card.querySelector('.x').addEventListener('click', hide);
    card.querySelector('.top').addEventListener('pointerdown', startDrag);
    elSave.addEventListener('click', onSave);
    elCopy.addEventListener('click', onCopy);
    elRetry.addEventListener('click', onRetry);
    elCfg.addEventListener('click', openOptions);
    elCancel.addEventListener('click', hide);
    elUndo.addEventListener('click', onUndo);
    elBack.addEventListener('click', goBack);

    if (!hlReady) {
      hlReady = true;
      try {
        const s = new CSSStyleSheet();
        s.replaceSync(HL_CSS);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, s];
      } catch (_) {
        const st = document.createElement('style');
        st.textContent = HL_CSS;
        (document.head || document.documentElement).append(st);
      }
    }
  }

  async function loadSettings() {
    try {
      const r = await chrome.storage.sync.get('settings');
      S = { ...DEF, ...(r && r.settings ? r.settings : {}) };
    } catch (_) {
      S = { ...DEF };
    }
  }

  async function loadLocal() {
    try {
      const r = await chrome.storage.local.get(['disabled', 'panelPos']);
      disabled = !!r.disabled;
      if (r.panelPos && r.panelPos.left) {
        freePos = r.panelPos;
        card.classList.add('free');
        card.style.left = freePos.left;
        card.style.top = freePos.top;
        card.style.right = 'auto';
      }
    } catch (_) {}
  }

  async function loadWords() {
    try {
      const r = await chrome.storage.local.get('words');
      const arr = Array.isArray(r.words) ? r.words : [];
      saved = new Map(arr.map((w) => [w.w, w]));
    } catch (_) {
      saved = new Map();
    }
    updateCount();
    scanLater();
  }

  function updateCount() {
    if (elCount) elCount.textContent = saved.size + ' kelime';
  }

  function applySide() {
    if (!card || freePos) return;
    if (S.side === 'right') {
      card.style.left = 'auto';
      card.style.right = '22px';
    } else {
      card.style.right = 'auto';
      card.style.left = '22px';
    }
  }

  function bind() {
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseup', onUp, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', () => {
      fitPanel();
      clampPos();
    });

    try {
      document.fonts.ready.then(() => {
        fitPanel();
        clampPos();
      });
    } catch (_) {}

    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === 'sync' && ch.settings) {
        S = { ...DEF, ...(ch.settings.newValue || {}) };
        applySide();
      }
      if (area === 'local' && ch.words) {
        const arr = ch.words.newValue || [];
        saved = new Map(arr.map((w) => [w.w, w]));
        updateCount();
        syncUndo();
        scanLater();
      }
      if (area === 'local' && ch.disabled) {
        disabled = !!ch.disabled.newValue;
        if (disabled) hide();
      }
    });

    try {
      chrome.runtime.onMessage.addListener((msg) => {
        if (!msg) return;
        if (msg.type === 'translate-pdf-selection') {
          if (document.documentElement.dataset.wgViewer === '1' && location.protocol === 'chrome-extension:') translateSelection();
          return;
        }
        if (msg.type === 'translate-selection') translateSelection();
      });
    } catch (_) {}
  }

  function realTarget(e) {
    const path = e && e.composedPath ? e.composedPath() : null;
    return (path && path[0]) || (e && e.target) || null;
  }

  function guardTargetBase(t) {
    const el = t && t.nodeType === 3 ? t.parentElement : t;
    return !!(el && el.closest && el.closest(GUARD_BASE));
  }

  function selectionAtPoint(sel, x, y) {
    try {
      if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
      const rects = sel.getRangeAt(0).getClientRects();
      for (const rc of rects) {
        if (x >= rc.left - 1 && x <= rc.right + 1 && y >= rc.top - 1 && y <= rc.bottom + 1) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function onDown(e) {
    if (inside(e) || e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && !selectionAtPoint(sel, e.clientX, e.clientY)) {
      sel.removeAllRanges();
    }
  }

  function onClick(e) {
    if (inside(e) || e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    const sel = window.getSelection();
    if (selectionAtPoint(sel, e.clientX, e.clientY)) {
      const t = realTarget(e);
      if (t && t.closest && t.closest('a[href]')) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    if (disabled) {
      if (card && card.classList.contains('in')) hide();
      if (!disabledHinted) {
        disabledHinted = true;
        hint('çeviri kapalı · alt+w ile aç', 3200);
      }
      return;
    }

    if (card && card.classList.contains('in')) hide();
  }

  function onUp(e) {
    if (inside(e) || disabled || e.button !== 0) return;
    if (guardTargetBase(realTarget(e))) return;
    if (!e.target || !e.target.closest) return;

    setTimeout(() => {
      if (disabled) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return;
      if (sel.anchorNode && guardNode(sel.anchorNode)) return;

      const text = String(sel).replace(/\s+/g, ' ').trim();
      if (text.length < 2 || text.length > 1500) return;
      if (!/[A-Za-z]/.test(text)) return;

      const parts = text.split(' ').filter(Boolean);
      run({
        word: parts.length > 1 ? text.slice(0, 48) + (text.length > 48 ? '…' : '') : text,
        text,
        ctx: contextAt(sel.anchorNode || sel.focusNode),
        pageLang: docLang(),
        width: selWidth(sel),
        isSentence: parts.length > 1
      });
    }, 30);
  }

  function translateSelection() {
    if (disabled) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    let text = String(sel).replace(/\s+/g, ' ').trim();
    if (text.length < 2) return;
    if (text.length > 1500) text = text.slice(0, 1500);
    if (!/[A-Za-z]/.test(text)) return;

    const parts = text.split(' ').filter(Boolean);
    run({
      word: parts.length > 1 ? text.slice(0, 48) + (text.length > 48 ? '…' : '') : text,
      text,
      ctx: contextAt(sel.anchorNode || sel.focusNode),
      pageLang: docLang(),
      width: selWidth(sel),
      isSentence: parts.length > 1
    });
  }

  function docLang() {
    try {
      return String(document.documentElement.lang || '').slice(0, 16);
    } catch (_) {
      return '';
    }
  }

  function selWidth(sel) {
    try {
      if (!sel || !sel.rangeCount) return 0;
      return sel.getRangeAt(0).getBoundingClientRect().width || 0;
    } catch (_) {
      return 0;
    }
  }

  function guardNode(n) {
    const el = n.nodeType === 1 ? n : n.parentElement;
    if (!el || !el.closest) return false;
    if (el.closest(GUARD_BASE)) return true;
    if (
      el.closest(
        'input[type="password"],input[type="email"],input[type="tel"],input[type="number"],[autocomplete*="cc-"]'
      )
    ) {
      return true;
    }
    return false;
  }

  function onKey(e) {
    if (e.altKey && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      disabled = !disabled;
      chrome.storage.local.set({ disabled }).catch(() => {});
      if (disabled) hide();
      hint(disabled ? 'çeviri kapalı · alt+w ile aç' : 'çeviri açık', 2500);
      return;
    }
    if (e.key === 'Escape' && card && card.classList.contains('in')) {
      hide();
    }
  }

  async function run(d, fromBack) {
    const key = (d.isSentence ? 's:' : 'w:') + d.text.toLowerCase();
    if (!fromBack && key === sig && card.classList.contains('in')) return;

    const seq = ++intent;
    if (!fromBack && S.englishOnly !== false) {
      const gate = await send({
        type: 'check',
        text: d.text,
        ctx: d.ctx || '',
        pageLang: d.pageLang || docLang()
      });
      if (seq !== intent) return;
      if (gate && gate.ok && gate.en === false) {
        if (card && card.classList.contains('in')) hide();
        if (!notEnglishHinted) {
          notEnglishHinted = true;
          hint('sadece ingilizce metin çevrilir', 3200);
        }
        return;
      }
    }
    if (seq !== intent) return;

    sig = key;

    if (!fromBack) {
      const record = { ...d, translation: '' };
      hist.push(record);
      if (hist.length > 12) hist.shift();
    }
    elBack.hidden = hist.length < 2;

    const my = ++token;
    paint(d, 'çevriliyor', 'load');
    fillDict(d, my);

    const res = await send({ type: 'translate', text: d.text });
    if (my !== token) return;

    if (!res || !res.ok) {
      paint(d, (res && res.error) || 'çeviri alınamadı', 'err');
      return;
    }
    paint(d, res.text, '');
    const last = hist[hist.length - 1];
    if (last && last.text === d.text) last.translation = res.text;
  }

  function goBack() {
    if (hist.length < 2) return;
    hist.pop();
    const prev = hist[hist.length - 1];
    token++;
    intent++;
    elBack.hidden = hist.length < 2;
    if (prev.translation) {
      paint(prev, prev.translation, '');
      fillDict(prev, token);
    } else {
      run(prev, true);
    }
  }

  function send(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (r) => {
          if (chrome.runtime.lastError) {
            const m = String(chrome.runtime.lastError.message || '');
            resolve({
              ok: false,
              error: /invalidated|context/i.test(m)
                ? 'uzantı yenilendi · sayfayı yenile (F5)'
                : 'uzantı yanıt vermedi'
            });
            return;
          }
          resolve(r);
        });
      } catch (err) {
        const m = String((err && err.message) || err);
        resolve({
          ok: false,
          error: /invalidated|context/i.test(m) ? 'uzantı yenilendi · sayfayı yenile (F5)' : m
        });
      }
    });
  }

  function applyWidth(d) {
    if (!card) return;
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const max = Math.max(320, Math.min(vw - 40, 980));
    let w = 620;
    if (d && d.isSentence) {
      const aw = Number(d.width) || 0;
      w = Math.max(620, aw + 120);
    }
    w = Math.min(max, Math.round(w));
    card.style.setProperty('--wg-w', w + 'px');
  }

  function fitPanel() {
    if (!card) return;
    card.classList.remove('squeeze', 'tall');
    card.style.setProperty('--fs', '1');

    const avail = Math.max(160, (window.innerHeight || 700) - 28);
    let h = card.offsetHeight;
    if (h <= avail) return;

    const steps = [0.94, 0.89, 0.84, 0.79, 0.74, 0.7, 0.66];
    for (const s of steps) {
      card.style.setProperty('--fs', String(s));
      if (s <= 0.89) card.classList.add('squeeze');
      h = card.offsetHeight;
      if (h <= avail) return;
    }
    card.classList.add('tall');
  }

  let fitTimer = 0;
  function scheduleFit() {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => {
      fitPanel();
      clampPos();
    }, 240);
  }

  function paint(d, text, mode) {
    if (!card) return;
    const loading = mode === 'load';
    const err = mode === 'err';
    current = { ...d, translation: mode ? '' : text };

    applyWidth(d);

    if (loading || err) elPos.hidden = true;

    elTrans.classList.remove('in');
    elTrans.classList.toggle('loading', loading);
    elTrans.classList.toggle('err', err);
    void elTrans.offsetWidth;
    elTrans.textContent = text;
    elTrans.classList.add('in');

    const isSaved = saved.has(d.word.toLowerCase());
    elSave.textContent = isSaved ? 'kaydedildi' : 'kaydet';
    elSave.disabled = !!isSaved || loading || err;

    elCopy.hidden = loading || err || !text;
    elCancel.hidden = !loading;
    elRetry.hidden = !err;
    elCfg.hidden = !err;
    elUndo.hidden = !undo || undo.key !== d.word.toLowerCase();

    const o = Number(S.opacity) || 0.9;
    card.style.setProperty('--glow-a', String(0.2 * o));
    card.style.setProperty('--bg-a', String(0.92 * o));
    card.style.setProperty('--bg-b', String(0.95 * o));

    const wasHidden = !card.classList.contains('in');
    card.classList.add('in');
    if (wasHidden) {
      try {
        card.focus({ preventScroll: true });
      } catch (_) {}
    }

    updateCount();
    fitPanel();
    scheduleFit();
    arm();
    clampPos();
  }

  function syncUndo() {
    if (!elUndo) return;
    if (!undo) {
      elUndo.hidden = true;
      return;
    }
    const active = current && current.word.toLowerCase() === undo.key && saved.has(undo.key);
    elUndo.hidden = !active;
  }

  async function fillDict(d, my) {
    elPos.hidden = true;
    if (d.isSentence) return;

    const res = await send({ type: 'define', word: d.text });
    if (my !== token || !res || !res.ok || !res.data) return;
    const k = res.data;

    if (k.pos) {
      elPos.textContent = posTr(k.pos);
      elPos.hidden = false;
      scheduleFit();
    }
  }

  function onRetry() {
    if (!current) return;
    run({ ...current, translation: '' }, true);
  }

  function onCopy() {
    if (!current || !current.translation) return;
    const text = current.translation;
    const done = () => {
      elCopy.textContent = 'kopyalandı';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        elCopy.textContent = 'kopyala';
      }, 1400);
    };
    const fail = () => {
      elCopy.textContent = 'kopyalanamadı';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        elCopy.textContent = 'kopyala';
      }, 1600);
    };
    try {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done, fail));
    } catch (_) {
      fallbackCopy(text, done, fail);
    }
  }

  function fallbackCopy(text, done, fail) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok) done();
      else if (fail) fail();
    } catch (_) {}
  }

  function openOptions() {
    try {
      chrome.runtime.sendMessage({ type: 'options' }, () => void chrome.runtime.lastError);
    } catch (_) {}
  }

  function arm() {
    if (timer) clearTimeout(timer);
    timer = 0;
    const secs = Number(S.autoClose) || 0;
    if (secs > 0) timer = setTimeout(hide, secs * 1000);
  }

  function hide() {
    if (!card) return;
    if (timer) clearTimeout(timer);
    timer = 0;
    intent++;
    token++;
    card.classList.remove('in');
    sig = '';
  }

  async function onSave() {
    if (!current || !current.translation) return;
    const w = current.word.toLowerCase();
    if (saved.has(w)) return;

    const now = Date.now();
    const entry = {
      w,
      word: current.word,
      t: current.translation,
      pos: elPos.hidden ? '' : elPos.textContent,
      host:
        (document.documentElement.dataset &&
          document.documentElement.dataset.wgViewer === '1' &&
          location.protocol === 'chrome-extension:' &&
          document.documentElement.dataset.wgHost) ||
        location.hostname,
      ts: now,
      box: 0,
      due: now
    };

    const r = await chrome.storage.local.get('words');
    const words = Array.isArray(r.words) ? r.words : [];
    if (!words.some((x) => x.w === w)) {
      words.unshift(entry);
      await chrome.storage.local.set({ words });
    }
    saved.set(w, entry);
    elSave.textContent = 'kaydedildi';
    elSave.disabled = true;
    updateCount();
    scanLater();

    undo = { key: w, entry };
    elUndo.hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
      undo = null;
      elUndo.hidden = true;
    }, 9000);
  }

  function onUndo() {
    if (!undo) return;
    const key = undo.key;
    chrome.storage.local
      .get('words')
      .then((r) => {
        const words = (Array.isArray(r.words) ? r.words : []).filter((x) => x.w !== key);
        return chrome.storage.local.set({ words });
      })
      .then(() => {
        saved.delete(key);
        undo = null;
        elUndo.hidden = true;
        if (current && current.word.toLowerCase() === key) {
          elSave.textContent = 'kaydet';
          elSave.disabled = false;
        }
        updateCount();
        scanLater();
      })
      .catch(() => {});
  }

  function inside(e) {
    return !!(host && e.composedPath && e.composedPath().includes(host));
  }

  function hint(text, ms) {
    if (!hintEl) return;
    hintEl.textContent = text;
    hintEl.classList.remove('in');
    void hintEl.offsetWidth;
    hintEl.classList.add('in');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hintEl.classList.remove('in'), ms || 7000);
  }

  function maybeHint() {
    chrome.storage.local
      .get('hintSeen')
      .then((r) => {
        if (r && r.hintSeen) return;
        if (disabled) return;
        hint('metni seç, çevirisini gör, kaydet ile havuza at', 7000);
        chrome.storage.local.set({ hintSeen: true }).catch(() => {});
      })
      .catch(() => {});
  }

  function startDrag(e) {
    if (e.button !== 0) return;
    if (e.target && e.target.closest && e.target.closest('button')) return;
    const r = card.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
    card.classList.add('dragging');
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag, { once: true });
  }

  function onDrag(e) {
    if (!drag) return;
    dragPanel(e.clientX - drag.dx, e.clientY - drag.dy);
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) drag.moved = true;
  }

  function dragPanel(x0, y0) {
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const x = Math.min(Math.max(8, x0), Math.max(8, window.innerWidth - w - 8));
    const y = Math.min(Math.max(8, y0), Math.max(8, window.innerHeight - h - 8));
    card.classList.add('free');
    card.style.right = 'auto';
    card.style.left = x + 'px';
    card.style.top = y + 'px';
  }

  function endDrag() {
    window.removeEventListener('pointermove', onDrag);
    card.classList.remove('dragging');
    if (drag && drag.moved) {
      freePos = { left: card.style.left, top: card.style.top };
      chrome.storage.local.set({ panelPos: freePos }).catch(() => {});
    }
    drag = null;
  }

  function clampPos() {
    if (!freePos || !card || !card.classList.contains('in')) return;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const left = parseFloat(card.style.left);
    const top = parseFloat(card.style.top);
    if (!isFinite(left) || !isFinite(top)) return;
    const x = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - w - 8));
    const y = Math.min(Math.max(8, top), Math.max(8, window.innerHeight - h - 8));
    if (x !== left || y !== top) {
      card.style.left = x + 'px';
      card.style.top = y + 'px';
      freePos = { left: card.style.left, top: card.style.top };
      chrome.storage.local.set({ panelPos: freePos }).catch(() => {});
    }
  }

  function scanLater() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 450);
  }

  function scan() {
    if (!window.CSS || !('highlights' in window.CSS)) return;
    if (!saved.size || disabled) {
      try {
        window.CSS.highlights.delete(HL);
      } catch (_) {}
      return;
    }
    try {
      window.CSS.highlights.delete(HL);
    } catch (_) {}

    const ranges = [];
    let nodes = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const v = n.nodeValue;
        if (!v || v.length < 2 || !/[A-Za-z]/.test(v)) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('script,style,noscript,textarea,input,code,pre,svg,[contenteditable=""],[contenteditable="true"]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const re = /[A-Za-z][A-Za-z'’\-]*/g;
    let n = walker.nextNode();
    while (n && nodes < 4000 && ranges.length < 2500) {
      nodes++;
      const text = n.nodeValue;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const w = m[0].toLowerCase().replace(/[’']s$/, '');
        if (!saved.has(w)) continue;
        try {
          const r = document.createRange();
          r.setStart(n, m.index);
          r.setEnd(n, m.index + m[0].length);
          ranges.push(r);
        } catch (_) {}
        if (ranges.length >= 2500) break;
      }
      n = walker.nextNode();
    }

    if (!ranges.length) return;
    try {
      window.CSS.highlights.set(HL, new window.Highlight(...ranges));
    } catch (_) {}
  }

  function contextAt(node) {
    try {
      const el = node && (node.nodeType === 1 ? node : node.parentElement);
      const box = el && el.closest('h1,h2,h3,h4,h5,h6,p,li,dd,dt,td,th,blockquote,figcaption,article,section,div');
      const text = String((box && box.textContent) || (node && node.nodeValue) || '')
        .replace(/\s+/g, ' ')
        .trim();
      return text.slice(0, 420);
    } catch (_) {
      return '';
    }
  }

})();

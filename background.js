importScripts('en-words.js');

const mem = new Map();
const MAX = 700;
const PDF_VIEWER = 'pdf-viewer.html';
const pdfNav = new Map();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  if (msg.type === 'check') {
    isEnglish(msg)
      .then((en) => sendResponse({ ok: true, en: !!en }))
      .catch(() => sendResponse({ ok: true, en: true }));
    return true;
  }

  if (msg.type === 'translate') {
    translate(msg)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true;
  }

  if (msg.type === 'define') {
    define(msg.word)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.type === 'test') {
    const t0 = Date.now();
    translate({ text: 'hello', from: 'en', to: 'tr' })
      .then((r) => sendResponse({ ...r, ms: Date.now() - t0 }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (msg.type === 'options') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

async function jfetch(url, opt = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    return await fetch(url, { ...opt, signal: c.signal, cache: 'no-store' });
  } finally {
    clearTimeout(t);
  }
}

async function translate({ text, from = 'en', to = 'tr' }) {
  const q = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
  if (!q) return { ok: false, error: 'boş metin' };

  const key = `wg|tr|${from}|${to}|${q.toLowerCase()}`;
  const hit = await cacheGet(key);
  if (hit) return { ok: true, text: hit, cached: true };

  const cfg = (await chrome.storage.sync.get('settings')).settings || {};
  const provider = cfg.provider || 'auto';
  const errors = [];
  const order =
    provider === 'auto'
      ? ['google', 'mymemory', ...(cfg.deeplKey ? ['deepl'] : [])]
      : [provider];

  for (const p of order) {
    try {
      let out = '';
      if (p === 'google') out = await viaGoogle(q, from, to);
      else if (p === 'mymemory') out = await viaMyMemory(q, from, to);
      else if (p === 'deepl') out = await viaDeepl(q, from, to, cfg.deeplKey);
      else if (p === 'libre') out = await viaLibre(q, from, to, cfg.libreUrl, cfg.libreKey);
      else throw new Error('bilinmeyen saglayici ' + p);

      out = String(out || '').trim();
      if (out) {
        await cacheSet(key, out);
        return { ok: true, text: out, provider: p };
      }
      errors.push(p + ': bos yanit');
    } catch (e) {
      errors.push(p + ': ' + ((e && e.message) || e));
    }
  }

  return { ok: false, error: short(errors.join(' | ')) };
}

async function isEnglish(msg) {
  const L = self.WGLang;
  if (!L) return true;

  const text = String(msg.text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
  if (!text) return false;

  const toks = L.tokens(text);
  if (!toks.length) return false;

  if (toks.length === 1) {
    const w = toks[0];
    if (L.hasTurkishChars(text)) return false;
    if (L.TR_ONLY.has(w)) return false;
    const page = String(msg.pageLang || '').toLowerCase();
    const ctx = String(msg.ctx || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);

    let vote = null;
    if (ctx && ctx.toLowerCase() !== w) {
      const ctoks = L.tokens(ctx);
      if (ctoks.length >= 2) {
        const ce = L.enRatio(ctoks);
        const ctr = L.trRatio(ctoks);
        if (ctr >= 0.3 && ce < 0.7) vote = false;
        else if (ce >= 0.7 && ctr < 0.3) vote = true;
      }
      if (vote === null) {
        const det = await detectLanguage(ctx);
        if (det && det.isReliable !== false) {
          const en = langPercent(det, 'en');
          const tr = langPercent(det, 'tr');
          if (tr >= 55 && en < 45) vote = false;
          else if (en >= 55 && tr < 45) vote = true;
        }
      }
    }

    if (vote !== null) return vote;
    if (/^tr(?:[-_]|$)/.test(page)) return false;
    if (/^en(?:[-_]|$)/.test(page)) return true;
    if (L.TR_STOP.has(w) || L.TR_AMBIG.has(w)) return false;
    if (L.listed(w)) return true;
    if (L.TR_SOFT && L.TR_SOFT.has(w)) return false;

    const d = await dictEnglish(w);
    return d === true;
  }

  const enRatio = L.enRatio(toks);
  const trRatio = L.trRatio(toks);
  if (trRatio >= 0.3 && enRatio < 0.7) return false;
  if (enRatio >= 0.7 && trRatio < 0.2) return true;

  const det = await detectLanguage(text);
  if (det && det.isReliable !== false) {
    const en = langPercent(det, 'en');
    const tr = langPercent(det, 'tr');
    if (tr >= 55 && en < 45) return false;
    if (en >= 55 && tr < 45) return true;
  }
  if (trRatio >= 0.45 && enRatio < 0.35) return false;
  return enRatio >= 0.45;
}

function detectLanguage(text) {
  return new Promise((resolve) => {
    let done = false;
    let timer = 0;
    const finish = (r) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(r || null);
    };
    timer = setTimeout(() => finish(null), 1200);
    try {
      if (!chrome.i18n || !chrome.i18n.detectLanguage) return finish(null);
      chrome.i18n.detectLanguage(String(text || '').slice(0, 1000), finish);
    } catch (_) {
      finish(null);
    }
  });
}

function langPercent(det, code) {
  try {
    const arr = (det && det.languages) || [];
    const row = arr.find((x) => x && String(x.language || '').toLowerCase() === code);
    return row ? Number(row.percentage) || 0 : 0;
  } catch (_) {
    return 0;
  }
}

async function dictEnglish(w) {
  const key = 'wg|en|' + w;
  const hit = await cacheGet(key);
  if (hit === 'y') return true;
  if (hit === 'n') return false;

  let timer = 0;
  const slow = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, network: true }), 2500);
  });
  const r = await Promise.race([define(w), slow]);
  clearTimeout(timer);

  if (r && r.ok) {
    await cacheSet(key, 'y');
    return true;
  }
  if (r && r.network) return null;
  await cacheSet(key, 'n');
  return false;
}

async function define(word) {
  const w = String(word || '')
    .toLowerCase()
    .replace(/[^a-z'-]/g, '')
    .slice(0, 40);
  if (!w) return { ok: false };

  const key = 'wg|def|' + w;
  const hit = await cacheGet(key);
  if (hit) return { ok: true, data: hit };

  let r;
  try {
    r = await jfetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w));
  } catch (_) {
    return { ok: false, network: true };
  }
  if (!r.ok) {
    return { ok: false, network: r.status === 403 || r.status === 429 || r.status >= 500 };
  }

  let arr;
  try {
    arr = await r.json();
  } catch (_) {
    return { ok: false };
  }
  const e = Array.isArray(arr) ? arr[0] : null;
  if (!e) return { ok: false };

  const mean = (e.meanings || [])[0] || {};
  const def = (mean.definitions || [])[0] || {};

  const data = {
    word: e.word || w,
    pos: mean.partOfSpeech || '',
    def: def.definition || '',
    example: def.example || ''
  };

  await cacheSet(key, data);
  return { ok: true, data };
}

function short(s) {
  const t = String(s || '');
  if (/429|quota|too many|available free translations|failed to fetch|aborted/i.test(t)) {
    return 'kota doldu. ayarlardan deepl anahtari ekle veya sonra dene';
  }
  return t.length > 120 ? t.slice(0, 120) + '…' : t;
}

async function cacheGet(key) {
  if (mem.has(key)) return mem.get(key);
  try {
    const r = await chrome.storage.session.get(key);
    if (r && r[key]) {
      mem.set(key, r[key]);
      return r[key];
    }
  } catch (_) {}
  return '';
}

async function cacheSet(key, val) {
  if (mem.size > MAX) mem.clear();
  mem.set(key, val);
  try {
    await chrome.storage.session.set({ [key]: val });
  } catch (_) {}
}

async function viaGoogle(q, from, to) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx' +
    `&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(q)}`;
  const r = await jfetch(url);
  if (!r.ok) throw new Error('google ' + r.status);
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('json')) throw new Error('google engelledi ' + r.status);
  const data = await r.json();
  const parts = Array.isArray(data?.[0]) ? data[0] : [];
  return parts.map((p) => (Array.isArray(p) ? p[0] : '')).filter(Boolean).join('');
}

async function viaMyMemory(q, from, to) {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(q) +
    `&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
  const r = await jfetch(url);
  if (!r.ok) throw new Error('mymemory ' + r.status);
  const data = await r.json();
  const out = String(data?.responseData?.translatedText || '');
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) throw new Error('mymemory kotasi');
  return out;
}

async function viaDeepl(q, from, to, key) {
  if (!key) throw new Error('deepl anahtari yok');
  const host = String(key).trim().endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  const r = await jfetch(`https://${host}/v2/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'DeepL-Auth-Key ' + String(key).trim()
    },
    body: JSON.stringify({
      text: [q],
      source_lang: from.toUpperCase(),
      target_lang: to.toUpperCase()
    })
  });
  if (!r.ok) throw new Error('deepl ' + r.status);
  const data = await r.json();
  return data?.translations?.[0]?.text || '';
}

async function viaLibre(q, from, to, base, apiKey) {
  if (!base) throw new Error('libretranslate adresi tanimli degil');
  const url = base.replace(/\/+$/, '') + '/translate';
  const r = await jfetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: 'Bearer ' + apiKey } : {})
    },
    body: JSON.stringify({ q, source: from, target: to, format: 'text' })
  });
  if (!r.ok) throw new Error('libre ' + r.status);
  const data = await r.json();
  return data?.translatedText || '';
}



function makeMenus() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create(
        { id: 'wg-selection', title: 'seçili metni çevir', contexts: ['selection'] },
        () => void chrome.runtime.lastError
      );
    });
  } catch (_) {}
}

async function refreshBadge() {
  try {
    const r = await chrome.storage.local.get('words');
    const arr = Array.isArray(r.words) ? r.words : [];
    const now = Date.now();
    const due = arr.filter((w) => (w.due || w.ts || 0) <= now).length;
    if (chrome.action.setBadgeBackgroundColor) {
      await chrome.action.setBadgeBackgroundColor({ color: '#14543a' });
    }
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: '#d9ffe9' });
    }
    await chrome.action.setBadgeText({ text: due ? (due > 99 ? '99+' : String(due)) : '' });
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener((d) => {
  try {
    chrome.alarms.create('wg-due', { periodInMinutes: 60 });
  } catch (_) {}
  makeMenus();
  refreshBadge();
  if (d && d.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }).catch(() => {});
  }
});

chrome.runtime.onStartup.addListener(() => {
  try {
    chrome.alarms.create('wg-due', { periodInMinutes: 60 });
  } catch (_) {}
  makeMenus();
  refreshBadge();
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a && a.name === 'wg-due') refreshBadge();
});

const pdfSkip = new Map();

function isPdfCandidate(url) {
  try {
    const u = new URL(url);
    if (!/^(https?|file):$/.test(u.protocol)) return false;
    if (u.searchParams.get('wg-native') === '1') return false;
    if (u.pathname.endsWith('/pdf-viewer.html')) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function isPdfUrl(url) {
  try {
    return isPdfCandidate(url) && /\.pdf$/i.test(new URL(url).pathname);
  } catch (_) {
    return false;
  }
}

function pdfIsSkipped(tabId) {
  if ((pdfSkip.get(tabId) || 0) > Date.now()) return true;
  if (pdfSkip.has(tabId)) pdfSkip.delete(tabId);
  return false;
}

async function maybeOpenPdf(tabId, url, byType) {
  try {
    if (!tabId || !isPdfCandidate(url)) return;
    if (!byType && !isPdfUrl(url)) return;
    if (pdfIsSkipped(tabId)) return;
    if (pdfNav.get(tabId) === url) return;

    const local = await chrome.storage.local.get('disabled');
    if (local && local.disabled) return;

    const cfg = (await chrome.storage.sync.get('settings')).settings || {};
    if (cfg.pdfViewer === false) return;
    if (pdfNav.get(tabId) === url) return;

    pdfNav.set(tabId, url);
    const target = chrome.runtime.getURL(PDF_VIEWER) + '?file=' + encodeURIComponent(url);
    await chrome.tabs.update(tabId, { url: target });
    setTimeout(() => {
      if (pdfNav.get(tabId) === url) pdfNav.delete(tabId);
    }, 4000);
  } catch (_) {}
}

if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    pdfNav.delete(tabId);
    pdfSkip.delete(tabId);
  });
}

if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener((d) => {
    if (!d || d.frameId !== 0) return;
    if (d.transitionQualifiers && d.transitionQualifiers.includes('forward_back')) {
      pdfSkip.set(d.tabId, Date.now() + 5000);
      setTimeout(() => {
        if ((pdfSkip.get(d.tabId) || 0) <= Date.now()) pdfSkip.delete(d.tabId);
      }, 5200);
      return;
    }
    try {
      if (new URL(d.url).protocol === 'file:') maybeOpenPdf(d.tabId, d.url);
    } catch (_) {}
  });
}

if (chrome.webRequest && chrome.webRequest.onHeadersReceived) {
  chrome.webRequest.onHeadersReceived.addListener(
    (d) => {
      if (!d || d.tabId < 0 || d.type !== 'main_frame') return;
      if (pdfIsSkipped(d.tabId)) return;
      const h = {};
      for (const x of d.responseHeaders || []) {
        if (x && x.name) h[String(x.name).toLowerCase()] = String(x.value || '');
      }
      if (!/application\/(x-)?pdf/i.test(h['content-type'] || '')) return;
      if (/^\s*attachment\b/i.test(h['content-disposition'] || '')) return;
      maybeOpenPdf(d.tabId, d.url, true);
    },
    { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] },
    ['responseHeaders']
  );
}

chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'local' && ch.words) refreshBadge();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'wg-selection' || !tab || !tab.id) return;
  const viewer = chrome.runtime.getURL(PDF_VIEWER);
  const pageUrl = info.pageUrl || tab.url || '';
  if (pageUrl.startsWith(viewer)) {
    chrome.runtime.sendMessage({ type: 'translate-pdf-selection' }, () => void chrome.runtime.lastError);
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: 'translate-selection' }, () => {
    if (!chrome.runtime.lastError) return;
    chrome.runtime.sendMessage({ type: 'translate-pdf-selection' }, () => void chrome.runtime.lastError);
  });
});

refreshBadge();

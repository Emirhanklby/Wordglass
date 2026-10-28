const DEF = {
  provider: 'auto',
  side: 'left',
  englishOnly: true,
  pdfViewer: true,
  autoClose: 0,
  opacity: 0.9,
  deeplKey: '',
  libreUrl: '',
  libreKey: ''
};

const ids = [
  'provider',
  'englishOnly',
  'pdfViewer',
  'side',
  'autoClose',
  'opacity',
  'deeplKey',
  'libreUrl',
  'libreKey'
];

const state = document.getElementById('state');
const testOut = document.getElementById('testOut');
const preview = document.getElementById('preview');

init();

async function init() {
  const r = await chrome.storage.sync.get('settings');
  fill({ ...DEF, ...(r.settings || {}) });

  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('input', onInput);
    el.addEventListener('change', onCommit);
  }

  document.getElementById('test').addEventListener('click', test);
  document.getElementById('reset').addEventListener('click', reset);
  document.getElementById('hint').addEventListener('click', resetHint);
  document.getElementById('clearWords').addEventListener('click', clearWords);
  document.getElementById('openApp').addEventListener('click', () =>
    chrome.tabs.create({ url: chrome.runtime.getURL('app.html') })
  );
}

let saveTimer = 0;

function onInput() {
  syncRows();
  applyPreview();
  validate();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 500);
}

function onCommit() {
  clearTimeout(saveTimer);
  syncRows();
  applyPreview();
  validate();
  save();
}

function fill(s) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (id === 'englishOnly') el.value = s.englishOnly === false ? '0' : '1';
    else if (id === 'pdfViewer') el.value = s.pdfViewer === false ? '0' : '1';
    else el.value = String(s[id]);
  }
  syncRows();
  applyPreview();
  validate();
}

function syncRows() {
  const p = document.getElementById('provider').value;
  document.getElementById('libreRow').classList.toggle('hidden', p !== 'libre');
  document.getElementById('libreKeyRow').classList.toggle('hidden', p !== 'libre');
  document.getElementById('deeplRow').classList.toggle('hidden', !(p === 'deepl' || p === 'auto'));
}

function read() {
  return {
    provider: document.getElementById('provider').value,
    englishOnly: document.getElementById('englishOnly').value === '1',
    pdfViewer: document.getElementById('pdfViewer').value === '1',
    side: document.getElementById('side').value,
    autoClose: Number(document.getElementById('autoClose').value) || 0,
    opacity: Number(document.getElementById('opacity').value) || 0.9,
    deeplKey: document.getElementById('deeplKey').value.trim(),
    libreUrl: document.getElementById('libreUrl').value.trim(),
    libreKey: document.getElementById('libreKey').value.trim()
  };
}

function applyPreview() {
  const s = read();
  preview.style.setProperty('--glow-a', String(0.2 * s.opacity));
  preview.style.setProperty('--bg-a', String(0.92 * s.opacity));
  preview.style.setProperty('--bg-b', String(0.95 * s.opacity));
  document.getElementById('opacityVal').textContent = Math.round(s.opacity * 100) + '%';
}

function validate() {
  const s = read();
  const badKey = !!s.deeplKey && !/:fx$/.test(s.deeplKey);
  const badUrl = !!s.libreUrl && !/^https?:\/\//i.test(s.libreUrl);
  document.getElementById('deeplWarn').classList.toggle('hidden', !badKey);
  document.getElementById('deeplHint').classList.toggle('hidden', badKey);
  document.getElementById('libreWarn').classList.toggle('hidden', !badUrl);
  document.getElementById('libreHint').classList.toggle('hidden', badUrl);
}

async function save() {
  clearTimeout(saveTimer);
  try {
    await chrome.storage.sync.set({ settings: read() });
    toast('kaydedildi');
  } catch (_) {
    toast('kaydedilemedi');
  }
}

async function test() {
  const btn = document.getElementById('test');
  btn.disabled = true;
  testOut.textContent = 'deneniyor…';
  await save();
  try {
    const r = await chrome.runtime.sendMessage({ type: 'test' });
    if (r && r.ok) {
      testOut.textContent = (r.provider || '?') + ' · ' + (r.ms || 0) + ' ms · hello → ' + r.text;
    } else {
      testOut.textContent = 'hata: ' + ((r && r.error) || 'bilinmiyor');
    }
  } catch (e) {
    testOut.textContent = 'hata: bağlantı kurulamadı';
  }
  btn.disabled = false;
}

async function reset() {
  if (!confirm('tüm ayarlar varsayılana dönsün mü?')) return;
  await chrome.storage.sync.set({ settings: { ...DEF } });
  fill({ ...DEF });
  toast('ayarlar sıfırlandı');
}

async function resetHint() {
  await chrome.storage.local.remove(['hintSeen', 'panelPos', 'disabled']);
  toast('ipucu, panel konumu ve aç/kapat sıfırlandı');
}

async function clearWords() {
  if (!confirm('defterdeki tüm kelimeler silinsin mi? bu işlem geri alınamaz.')) return;
  await chrome.storage.local.set({ words: [] });
  toast('defter temizlendi');
}

let t = 0;
function toast(msg) {
  state.textContent = msg;
  clearTimeout(t);
  t = setTimeout(() => {
    state.textContent = '';
  }, 1800);
}

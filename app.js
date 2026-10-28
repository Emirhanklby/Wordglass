let words = [];
let disabled = false;
let sortMode = 'new';

const $ = (id) => document.getElementById(id);
const list = $('list');
const q = $('q');
const empty = $('empty');
const toastEl = $('toast');
const toastMsg = $('toastMsg');
const toastAct = $('toastAct');

const POS = {
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

const TR = { ı: 'i', ş: 's', ç: 'c', ğ: 'g', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u' };

init();

async function init() {
  sortMode = localStorage.getItem('wg-sort') || 'new';
  if (!['new', 'az', 'due'].includes(sortMode)) sortMode = 'new';
  $('sort').value = sortMode;

  const r = await chrome.storage.local.get(['words', 'disabled']);
  words = Array.isArray(r.words) ? r.words : [];
  disabled = !!r.disabled;

  paintHome();
  paintPower();

  $('openWords').addEventListener('click', () => {
    q.value = '';
    openWords();
  });
  $('back').addEventListener('click', backHome);
  $('reviewTop').addEventListener('click', openReview);
  $('copyAll').addEventListener('click', copyBlock);
  $('copy').addEventListener('click', copyBlock);
  $('file').addEventListener('click', download);
  $('opts').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('power').addEventListener('click', togglePower);
  $('expand').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
    window.close();
  });

  $('sort').addEventListener('change', () => {
    sortMode = $('sort').value;
    localStorage.setItem('wg-sort', sortMode);
    paintList();
  });

  q.addEventListener('input', paintList);
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && q.value) {
      e.stopPropagation();
      q.value = '';
      paintList();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q) {
      e.preventDefault();
      openWords();
      q.focus();
    }
    if (e.key === 'Escape' && !$('words').classList.contains('hidden')) backHome();
  });

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch.words) {
      words = ch.words.newValue || [];
      paintHome();
      if (!$('words').classList.contains('hidden')) paintList();
    }
    if (ch.disabled) {
      disabled = !!ch.disabled.newValue;
      paintPower();
    }
  });
}

function norm(s) {
  return String(s == null ? '' : s)
    .toLocaleLowerCase('tr')
    .replace(/[ışçğöüâîû]/g, (c) => TR[c] || c);
}

function posTr(p) {
  const raw = String(p || '').trim();
  if (!raw) return '';
  const k = raw.toLowerCase();
  if (POS[k]) return POS[k];
  for (const key of Object.keys(POS)) {
    if (new RegExp('\\b' + key + '\\b').test(k)) return POS[key];
  }
  return raw;
}

function paintPower() {
  const on = !disabled;
  $('power').classList.toggle('on', on);
  $('power').setAttribute('aria-pressed', String(on));
  $('powerText').textContent = on ? 'açık' : 'kapalı';
  $('offline').classList.toggle('hidden', on);
}

async function togglePower() {
  disabled = !disabled;
  paintPower();
  try {
    await chrome.storage.local.set({ disabled });
  } catch (_) {}
}

function enter(el) {
  el.classList.remove('enter');
  void el.offsetWidth;
  el.classList.add('enter');
}

function paintHome() {
  $('total').textContent = String(words.length);

  const due = words.filter((w) => (w.due || w.ts || 0) <= Date.now()).length;
  $('sub').textContent = words.length
    ? words.length + ' kelime · ' + due + ' tekrar bekliyor'
    : "henüz kelime yok. bir sayfada veya pdf'de ingilizce metni seç, panelden kaydet.";

  const box = $('recent');
  box.innerHTML = '';

  if (!words.length) {
    const none = document.createElement('span');
    none.className = 'none';
    none.textContent = 'defter boş';
    box.append(none);
    return;
  }

  const recent = words.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 10);
  for (const w of recent) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.textContent = w.word;
    chip.title = w.t || '';
    chip.addEventListener('click', () => {
      sortMode = 'new';
      $('sort').value = sortMode;
      localStorage.setItem('wg-sort', sortMode);
      q.value = w.word;
      openWords();
    });
    box.append(chip);
  }
}

function openWords() {
  $('home').classList.add('hidden');
  const view = $('words');
  view.classList.remove('hidden');
  enter(view);
  paintList();
  if (!q.value) q.focus();
}

function backHome() {
  const view = $('home');
  $('words').classList.add('hidden');
  view.classList.remove('hidden');
  enter(view);
  paintHome();
}

function openReview() {
  chrome.tabs.create({ url: chrome.runtime.getURL('review.html') });
}

function visibleWords() {
  const term = norm(q.value.trim());
  let items = words.filter(
    (w) =>
      !term ||
      norm(w.word).includes(term) ||
      norm(w.t).includes(term) ||
      norm(posTr(w.pos)).includes(term)
  );

  if (sortMode === 'az') return items.slice().sort((a, b) => a.word.localeCompare(b.word, 'en'));
  if (sortMode === 'due') {
    const now = Date.now();
    return items
      .filter((w) => (w.due || w.ts || 0) <= now)
      .sort((a, b) => (a.due || a.ts || 0) - (b.due || b.ts || 0));
  }
  return items.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

function paintList() {
  const items = visibleWords();

  $('shown').textContent =
    items.length === words.length ? words.length + ' kelime' : items.length + '/' + words.length + ' kelime';

  list.innerHTML = '';

  if (!items.length) {
    empty.classList.remove('hidden');
    empty.innerHTML = emptyHtml();
    return;
  }
  empty.classList.add('hidden');

  const frag = document.createDocumentFragment();

  if (sortMode === 'new') {
    const order = ['bugün', 'dün', 'bu hafta', 'daha eski'];
    const groups = new Map(order.map((name) => [name, []]));
    for (const w of items) groups.get(groupOf(w.ts)).push(w);

    let start = 0;
    for (const name of order) {
      const arr = groups.get(name);
      if (!arr.length) continue;
      frag.append(section(name, arr, start));
      start += arr.length;
    }
  } else if (sortMode === 'due') {
    frag.append(section('tekrar sırası', items, 0));
  } else {
    frag.append(section('a – z', items, 0));
  }

  list.append(frag);
}

function emptyHtml() {
  const none = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4.5h11a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2z"></path><path d="M5 17h13"></path><path d="M9 8h5"></path></svg>`;

  if (!words.length) {
    return (
      none +
      '<b>defter boş</b>' +
      '<p>ilk kelimeni eklemek üç adım:</p>' +
      '<div class="esteps">' +
      '<span><i>1</i>ingilizce bir kelime veya cümle seç (pdf dahil)</span>' +
      '<span><i>2</i>panelde <kbd>kaydet</kbd> düğmesine bas</span>' +
      '<span><i>3</i>kelime burada, türkçesiyle görünür</span>' +
      '</div>'
    );
  }

  if (q.value.trim()) {
    return none + '<b>eşleşme yok</b><p>başka bir kelime, çeviri veya tür dene.</p>';
  }

  if (sortMode === 'due') {
    return (
      none +
      '<b>şu an tekrar yok</b>' +
      '<p>kelimeler zamanı gelince burada listelenir. üstteki tekrar düğmesiyle turu başlatabilirsin.</p>'
    );
  }

  return none + '<b>eşleşme yok</b><p>başka bir kelime, çeviri veya tür dene.</p>';
}

function groupOf(ts) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = Number(ts) || 0;
  if (t >= start) return 'bugün';
  if (t >= start - 86400000) return 'dün';
  if (t >= start - 6 * 86400000) return 'bu hafta';
  return 'daha eski';
}

function section(name, arr, start) {
  const sec = document.createElement('section');
  sec.className = 'group';

  const head = document.createElement('div');
  head.className = 'ghead';

  const label = document.createElement('span');
  label.textContent = name;

  const line = document.createElement('i');

  const num = document.createElement('span');
  num.className = 'gn';
  num.textContent = String(arr.length);

  head.append(label, line, num);

  const cards = document.createElement('div');
  cards.className = 'cards';
  arr.forEach((w, i) => cards.append(card(w, start + i)));

  sec.append(head, cards);
  return sec;
}

function levelOf(w) {
  const seen = (w.seen || 0) > 0 || (w.box || 0) > 0;
  if (!seen) return 0;
  return Math.min(6, (Number(w.box) || 0) + 1);
}

function dueLabel(w) {
  const seen = (w.seen || 0) > 0 || (w.box || 0) > 0;
  if (!seen) return 'yeni';
  const now = Date.now();
  const due = Number(w.due) || Number(w.ts) || 0;
  if (due <= now) return 'şimdi';
  const days = Math.ceil((due - now) / 86400000);
  if (days <= 1) return 'yarın';
  return days + 'g sonra';
}

function card(w, i) {
  const el = document.createElement('article');
  el.className = i < 18 ? 'wcard' : 'wcard plain';
  el.tabIndex = 0;
  el.setAttribute('aria-label', w.word + ', ' + (w.t || 'çeviri yok'));
  if (i < 18) el.style.setProperty('--i', String(i));

  el.addEventListener('keydown', (e) => {
    if (e.target !== el) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(w.w);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      copyText(w.word + ' — ' + (w.t || ''));
    }
  });

  const top = document.createElement('div');
  top.className = 'ctop';

  const en = document.createElement('span');
  en.className = 'en';
  en.textContent = w.word;
  en.title = w.word;
  top.append(en);

  const pos = posTr(w.pos);
  if (pos) {
    const chip = document.createElement('span');
    chip.className = 'pos';
    chip.textContent = pos;
    top.append(chip);
  }

  const tr = document.createElement('div');
  tr.className = 'ctr';
  tr.textContent = w.t || '—';

  const bot = document.createElement('div');
  bot.className = 'cbot';

  const lvl = levelOf(w);
  const dots = document.createElement('span');
  dots.className = 'dots';
  dots.title = lvl ? 'tekrar seviyesi ' + lvl + '/6' : 'yeni kelime';
  for (let d = 0; d < 6; d++) {
    const dot = document.createElement('i');
    if (d < lvl) dot.className = 'on';
    dots.append(dot);
  }

  const due = document.createElement('span');
  due.className = 'due';
  due.textContent = dueLabel(w);
  if ((Number(w.due) || Number(w.ts) || 0) <= Date.now()) due.classList.add('now');

  const acts = document.createElement('span');
  acts.className = 'acts';

  const copy = document.createElement('button');
  copy.className = 'mini copy';
  copy.type = 'button';
  copy.title = 'kopyala';
  copy.setAttribute('aria-label', w.word + ' kelimesini kopyala');
  copy.innerHTML =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M5 15V5a1 1 0 0 1 1-1h10"></path></svg>';
  copy.addEventListener('click', (e) => {
    e.stopPropagation();
    copyText(w.word + ' — ' + (w.t || ''));
  });

  const del = document.createElement('button');
  del.className = 'mini del';
  del.type = 'button';
  del.title = 'sil';
  del.setAttribute('aria-label', w.word + ' kelimesini sil');
  del.innerHTML =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V5h6v2"></path><path d="m7 7 1 12h8l1-12"></path></svg>';
  del.addEventListener('click', (e) => {
    e.stopPropagation();
    remove(w.w);
  });

  acts.append(copy, del);
  bot.append(dots, due, acts);
  el.append(top, tr, bot);
  return el;
}

function remove(key) {
  const i = words.findIndex((w) => w.w === key);
  if (i < 0) return;

  const item = words[i];
  words.splice(i, 1);
  chrome.storage.local.set({ words }).catch(() => {});
  paintHome();
  paintList();

  toast('silindi: ' + item.word, 'geri al', () => {
    words.splice(Math.min(i, words.length), 0, item);
    chrome.storage.local.set({ words }).catch(() => {});
    paintHome();
    paintList();
  }, 9000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('kopyalandı');
  } catch (_) {
    toast('kopyalama izni yok');
  }
}

function block() {
  const rows = words.map((w) => {
    const cells = [w.word, w.t, posTr(w.pos)].map((v) =>
      String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
    );
    return '| ' + cells.join(' | ') + ' |';
  });

  return [
    '# wordglass kelime listesi',
    '',
    'Aşağıdaki İngilizce-Türkçe kelime listesini kullanarak çalışma yap.',
    'Her kelime için kısa bir tanım ve bir örnek cümle ver; zor olanları işaretle.',
    'Tür bilgisini (isim, sıfat, fiil…) cümle kurarken kullan.',
    '',
    '| ingilizce | türkçe | tür |',
    '| --- | --- | --- |',
    ...rows,
    '',
    'toplam: ' + words.length + ' kelime'
  ].join('\n');
}

async function copyBlock() {
  if (!words.length) return toast('defter boş');
  try {
    await navigator.clipboard.writeText(block());
    toast('llm için kopyalandı (' + words.length + ' kelime)');
  } catch (_) {
    toast('kopyalama izni yok');
  }
}

function download() {
  if (!words.length) return toast('defter boş');
  const blob = new Blob([block()], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wordglass-' + new Date().toISOString().slice(0, 10) + '.md';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('indirildi: ' + words.length + ' kelime');
}

let toastTimer = 0;
function toast(msg, actionLabel, action, ms) {
  toastMsg.textContent = msg;
  if (actionLabel) {
    toastAct.textContent = actionLabel;
    toastAct.hidden = false;
    toastAct.onclick = () => {
      hideToast();
      action();
    };
  } else {
    toastAct.hidden = true;
    toastAct.onclick = null;
  }
  toastEl.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, ms || 1900);
}

function hideToast() {
  toastEl.classList.remove('in');
  toastAct.hidden = true;
}

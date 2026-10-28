const DAY = 86400000;
const STEPS = [1, 3, 7, 21, 45, 90];

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

let all = [];
let queue = [];
let idx = 0;
let revealed = false;
let graded = 0;
let postponed = 0;

const stage = document.getElementById('stage');
const prog = document.getElementById('prog');
const posEl = document.getElementById('pos');
const left = document.getElementById('left');
const levelEl = document.getElementById('level');

init();

async function init() {
  const r = await chrome.storage.local.get('words');
  all = Array.isArray(r.words) ? r.words : [];

  const now = Date.now();
  queue = all
    .filter((w) => (w.due || w.ts || 0) <= now)
    .sort((a, b) => (a.due || a.ts || 0) - (b.due || b.ts || 0))
    .slice(0, 20);

  if (!queue.length) return finish(true);
  render();
  document.addEventListener('keydown', onKey);
}

function render() {
  const w = queue[idx];
  revealed = false;

  prog.style.width = (idx / queue.length) * 100 + '%';
  posEl.textContent = idx + 1 + '/' + queue.length;
  left.textContent = queue.length - idx - 1 + ' kaldı';
  levelEl.textContent = 'kutu ' + Math.min((Number(w.box) || 0) + 1, STEPS.length) + '/' + STEPS.length;

  stage.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'card';

  const word = document.createElement('div');
  word.className = 'word';
  word.textContent = w.word;

  card.append(word);

  const rev = document.createElement('div');
  rev.className = 'rev';
  rev.hidden = true;

  if (w.t) {
    const tr = document.createElement('div');
    tr.className = 'tr';
    tr.textContent = w.t;
    rev.append(tr);
  }
  if (w.pos) {
    const pos = document.createElement('div');
    pos.className = 'pos';
    pos.textContent = posTr(w.pos);
    rev.append(pos);
  }

  const show = document.createElement('button');
  show.className = 'show';
  show.type = 'button';
  show.textContent = 'göster';
  show.addEventListener('click', () => reveal(rev, show));

  const grades = document.createElement('div');
  grades.className = 'grades';
  grades.hidden = true;

  grades.append(
    mk('bilmedim', 'no', () => grade(0)),
    mk('zor', 'mid', () => grade(2)),
    mk('bildim', '', () => grade(3))
  );

  const acts = document.createElement('div');
  acts.className = 'acts';

  const later = document.createElement('button');
  later.type = 'button';
  later.textContent = 'yarına at';
  later.addEventListener('click', postpone);

  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = 'defterden sil';
  del.addEventListener('click', remove);

  acts.append(later, del);

  card.append(rev, show, grades, acts);
  stage.append(card);
  card._rev = rev;
  card._show = show;
  card._grades = grades;

  word.tabIndex = -1;
  word.focus({ preventScroll: true });
}

function mk(label, cls, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  if (cls) b.className = cls;
  b.textContent = label;
  b.addEventListener('click', fn);
  return b;
}

function reveal(rev, show) {
  revealed = true;
  rev.hidden = false;
  show.hidden = true;
  const card = stage.firstElementChild;
  if (card && card._grades) {
    card._grades.hidden = false;
    const first = card._grades.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }
}

function onKey(e) {
  const card = stage.firstElementChild;
  if (!card) return;

  if (e.code === 'Space' && !revealed) {
    e.preventDefault();
    reveal(card._rev, card._show);
    return;
  }
  if (!revealed) return;

  if (e.key === '1') grade(0);
  else if (e.key === '2') grade(2);
  else if (e.key === '3') grade(3);
}

async function grade(level) {
  const w = queue[idx];
  const now = Date.now();

  const box = Number(w.box) || 0;
  if (level === 0) {
    w.box = 0;
    w.due = now + DAY;
  } else if (level === 2) {
    w.box = Math.max(1, box);
    w.due = now + 2 * DAY;
  } else {
    w.box = Math.min(box + 1, STEPS.length - 1);
    w.due = now + STEPS[Math.max(0, w.box - 1)] * DAY;
  }
  w.seen = (w.seen || 0) + 1;
  w.last = now;

  graded++;
  idx++;

  await persist();
  advance();
}

async function postpone() {
  const w = queue[idx];
  w.due = Date.now() + DAY;
  postponed++;
  idx++;
  await persist();
  advance();
}

async function remove() {
  const w = queue[idx];
  if (!confirm('"' + w.word + '" defterden silinsin mi?')) return;

  all = all.filter((x) => x.w !== w.w);
  idx++;
  await persist();
  advance();
}

function advance() {
  if (idx >= queue.length) return finish(false);
  render();
}

async function persist() {
  try {
    await chrome.storage.local.set({ words: all });
  } catch (_) {}
}

function finish(empty) {
  prog.style.width = '100%';
  posEl.textContent = '';
  left.textContent = '';
  levelEl.textContent = '';
  stage.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'done';

  const h = document.createElement('h2');
  h.textContent = empty ? 'bugün tekrar yok' : 'tur bitti';

  const p = document.createElement('p');
  const bits = [];
  if (graded) bits.push(graded + ' kelime işlendi');
  if (postponed) bits.push(postponed + ' kelime yarına atıldı');
  p.textContent = empty
    ? 'yeni kelime kaydettiğinde burada görünecek'
    : (bits.join(', ') || 'işlenen yok') + '. yeni tekrarlar zamanı gelince görünür.';

  box.append(h, p);

  const again = document.createElement('button');
  again.type = 'button';
  again.textContent = 'deftere dön';
  again.addEventListener('click', () => {
    location.href = 'app.html';
  });
  box.append(again);

  stage.append(box);
  document.removeEventListener('keydown', onKey);
}

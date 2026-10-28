import * as pdfjsLib from './pdfjs/build/pdf.min.mjs';
import { PDFViewer, EventBus, PDFLinkService } from './pdfjs/web/pdf_viewer.mjs';

const $ = (id) => document.getElementById(id);

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdfjs/build/pdf.worker.min.mjs');

const stateEl = $('state');
const nameEl = $('filename');
const prev = $('prev');
const next = $('next');
const pageInfo = $('pageInfo');
const zoomInfo = $('zoomInfo');
const zoomIn = $('zoomIn');
const zoomOut = $('zoomOut');
const original = $('original');

let viewer = null;
let pages = 0;
let fileUrl = '';
let fileName = 'pdf';
let startPage = 1;

function setState(text, link) {
  stateEl.hidden = false;
  stateEl.textContent = '';
  const p = document.createElement('p');
  p.textContent = text;
  p.style.margin = '0';
  stateEl.append(p);
  if (link) {
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = 'orijinal pdf';
    a.style.display = 'inline-block';
    a.style.marginTop = '8px';
    stateEl.append(a);
  }
}

function hideState() {
  stateEl.hidden = true;
}

function getFile() {
  const raw = new URLSearchParams(location.search).get('file');
  if (!raw) throw new Error('pdf adresi yok');
  const u = new URL(raw, location.href);
  if (!/^(https?|file):$/.test(u.protocol)) throw new Error('desteklenmeyen adres');
  return u;
}

function nativeUrl(u) {
  try {
    const x = new URL(u.href);
    x.searchParams.set('wg-native', '1');
    return x.href;
  } catch (_) {
    return u.href;
  }
}

function prettyName(u) {
  try {
    const part = decodeURIComponent((u.pathname || '').split('/').pop() || '');
    return part || u.hostname || 'pdf';
  } catch (_) {
    return 'pdf';
  }
}

function pageLabel() {
  if (!viewer || !pages) return '– / –';
  return viewer.currentPageNumber + ' / ' + pages;
}

function updatePages() {
  pageInfo.textContent = pageLabel();
  prev.disabled = !viewer || viewer.currentPageNumber <= 1;
  next.disabled = !viewer || viewer.currentPageNumber >= pages;
}

function updateZoom(scale) {
  const n = Number(scale);
  zoomInfo.textContent = Number.isFinite(n) && n > 0 ? Math.round(n * 100) + '%' : '–';
}

async function main() {
  try {
    const u = getFile();
    fileUrl = u.href;
    fileName = prettyName(u);
    nameEl.textContent = fileName;
    nameEl.title = fileUrl;
    document.title = fileName + ' · wordglass';
    original.href = nativeUrl(u);
    document.documentElement.dataset.wgHost = u.hostname || 'pdf';
    const pm = /(?:^#|&)page=(\d+)/.exec(u.hash);
    startPage = pm ? Math.max(1, Number(pm[1]) || 1) : 1;
  } catch (e) {
    setState(String((e && e.message) || e));
    return;
  }

  const container = $('viewerContainer');
  const viewerEl = $('viewer');
  const eventBus = new EventBus();
  const linkService = new PDFLinkService({ eventBus });

  viewer = new PDFViewer({
    container,
    viewer: viewerEl,
    eventBus,
    linkService,
    imageResourcesPath: chrome.runtime.getURL('pdfjs/web/images/'),
    enablePermissions: false,
    removePageBorders: true
  });
  linkService.setViewer(viewer);

  eventBus.on('pagesinit', () => {
    pages = viewer.pagesCount || 0;
    viewer.currentScaleValue = 'page-width';
    if (startPage > 1 && pages) viewer.currentPageNumber = Math.min(pages, startPage);
    updatePages();
    updateZoom(viewer.currentScale);
    hideState();
  });

  eventBus.on('pagechanging', () => {
    updatePages();
  });

  eventBus.on('scalechanging', ({ scale }) => {
    updateZoom(scale);
  });

  prev.addEventListener('click', () => {
    if (viewer && viewer.currentPageNumber > 1) viewer.currentPageNumber -= 1;
  });
  next.addEventListener('click', () => {
    if (viewer && viewer.currentPageNumber < pages) viewer.currentPageNumber += 1;
  });
  zoomIn.addEventListener('click', () => {
    if (!viewer) return;
    const s = Number(viewer.currentScale) || 1;
    viewer.currentScale = Math.min(4, s * 1.15);
  });
  zoomOut.addEventListener('click', () => {
    if (!viewer) return;
    const s = Number(viewer.currentScale) || 1;
    viewer.currentScale = Math.max(0.25, s / 1.15);
  });

  setState('pdf yükleniyor…');
  try {
    const doc = await pdfjsLib.getDocument({
      url: fileUrl,
      cMapUrl: chrome.runtime.getURL('pdfjs/cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: chrome.runtime.getURL('pdfjs/standard_fonts/'),
      wasmUrl: chrome.runtime.getURL('pdfjs/wasm/'),
      iccUrl: chrome.runtime.getURL('pdfjs/iccs/'),
      isEvalSupported: false,
      withCredentials: true,
      useSystemFonts: true,
      enableXfa: false,
      verbosity: 0
    }).promise;
    pages = doc.numPages || 0;
    linkService.setDocument(doc, null);
    viewer.setDocument(doc);
  } catch (e) {
    const msg = String((e && e.message) || e);
    setState(/password/i.test(msg) ? 'bu pdf parola korumalı' : 'pdf açılamadı: ' + msg, fileUrl);
  }
}

main();

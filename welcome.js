document.getElementById('defter').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
});

document.getElementById('ayarlar').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

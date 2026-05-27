const statusEl = document.getElementById('status');
const urlEl = document.getElementById('current-url');
const button = document.getElementById('open-dashboard');
const API_BASE = 'https://url-based-phishing-detection.onrender.com';

const updateStatus = (text) => {
  statusEl.textContent = text;
};

const openDashboard = (url) => {
  const dashboardUrl = `${API_BASE}/dashboard?source=extension&url=${encodeURIComponent(url)}`;
  chrome.tabs.create({ url: dashboardUrl });
};

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url) {
    urlEl.textContent = 'No active tab available.';
    button.disabled = true;
    return;
  }
  urlEl.textContent = tab.url;
  button.addEventListener('click', () => openDashboard(tab.url));
});

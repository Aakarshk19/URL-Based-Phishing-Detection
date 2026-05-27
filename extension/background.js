const API_BASE = 'https://url-based-phishing-detection.onrender.com';
const DASHBOARD_PATH = `${API_BASE}/dashboard`;
const DASHBOARD_HOST = 'url-based-phishing-detection.onrender.com';
const allowedUrlsByTab = new Map();

const isDashboardUrl = (url) => {
  try {
    const u = new URL(url);
    return u.hostname === DASHBOARD_HOST && u.pathname.startsWith('/dashboard');
  } catch (error) {
    return false;
  }
};

const shouldSkipUrl = (url) => {
  if (!url) return true;
  if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('edge://')) return true;
  if (url.startsWith('chrome-extension://')) return true;
  if (url.startsWith('file://')) return true;
  if (isDashboardUrl(url)) return true;
  return false;
};

const evaluateUrl = async (url) => {
  try {
    const target = `${API_BASE}/api/predict?url=${encodeURIComponent(url)}`;
    const response = await fetch(target, { method: 'GET' });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
};

const shouldWarn = (analysis) => {
  if (!analysis) return false;
  return analysis.prediction === 'Phishing' || ['Medium', 'High'].includes(analysis.risk_level);
};

const buildWarningUrl = (url, analysis) => {
  const params = new URLSearchParams({
    url,
    prediction: analysis.prediction || 'Suspicious',
    risk: analysis.risk_level || 'Unknown',
    confidence: String(analysis.confidence ?? '')
  });
  return chrome.runtime.getURL(`warning.html?${params.toString()}`);
};

const handleTabUpdate = async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (shouldSkipUrl(tab.url)) return;

  if (allowedUrlsByTab.get(tabId) === tab.url) {
    allowedUrlsByTab.delete(tabId);
    return;
  }

  const analysis = await evaluateUrl(tab.url);
  if (!analysis) return;
  if (shouldWarn(analysis)) {
    chrome.tabs.update(tabId, { url: buildWarningUrl(tab.url, analysis) });
  }
};

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!sender.tab || !message?.url) return;

  if (message.type === 'continue-to-site') {
    allowedUrlsByTab.set(sender.tab.id, message.url);
    chrome.tabs.update(sender.tab.id, { url: message.url });
  }

  if (message.type === 'open-dashboard') {
    const redirectUrl = `${DASHBOARD_PATH}?source=extension&url=${encodeURIComponent(message.url)}`;
    chrome.tabs.update(sender.tab.id, { url: redirectUrl });
  }
});

chrome.tabs.onUpdated.addListener(handleTabUpdate);

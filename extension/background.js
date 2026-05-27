const API_BASE = 'http://127.0.0.1:5000';
const DASHBOARD_PATH = `${API_BASE}/dashboard`;
const MONITORED_HOSTS = ['127.0.0.1', 'localhost'];

const isDashboardUrl = (url) => {
  try {
    const u = new URL(url);
    return (u.hostname === '127.0.0.1' || u.hostname === 'localhost') && u.pathname.startsWith('/dashboard');
  } catch (error) {
    return false;
  }
};

const shouldSkipUrl = (url) => {
  if (!url) return true;
  if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('edge://')) return true;
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

const handleTabUpdate = async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (shouldSkipUrl(tab.url)) return;

  const analysis = await evaluateUrl(tab.url);
  if (!analysis) return;
  if (analysis.prediction === 'Phishing') {
    const redirectUrl = `${DASHBOARD_PATH}?source=extension&url=${encodeURIComponent(tab.url)}`;
    chrome.tabs.update(tabId, { url: redirectUrl });
  }
};

chrome.tabs.onUpdated.addListener(handleTabUpdate);

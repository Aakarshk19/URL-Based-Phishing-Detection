const API_BASE = 'https://url-based-phishing-detection.onrender.com';
const DASHBOARD_PATH = `${API_BASE}/dashboard`;
const DASHBOARD_HOST = 'url-based-phishing-detection.onrender.com';

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

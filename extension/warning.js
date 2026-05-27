const params = new URLSearchParams(window.location.search);
const targetUrl = params.get('url') || '';
const prediction = params.get('prediction') || 'Unknown';
const risk = params.get('risk') || 'Unknown';
const confidence = params.get('confidence');

document.getElementById('url').textContent = targetUrl;
document.getElementById('prediction').textContent = prediction;
document.getElementById('risk').textContent = risk;
document.getElementById('confidence').textContent = confidence ? `${confidence}%` : 'Unknown';

document.getElementById('dashboard').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'open-dashboard', url: targetUrl });
});

document.getElementById('continue').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'continue-to-site', url: targetUrl });
});

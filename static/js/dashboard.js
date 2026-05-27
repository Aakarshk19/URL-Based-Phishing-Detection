const { useState, useEffect } = React;

const getQueryParam = (name) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
};

const fetchAnalysis = async (url) => {
  const response = await fetch(`/api/predict?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Unable to fetch analysis');
  }
  return response.json();
};

const DashboardApp = () => {
  const [currentUrl, setCurrentUrl] = useState(getQueryParam('url'));
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeUrl = async () => {
    if (!currentUrl) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchAnalysis(currentUrl);
      setAnalysis(result);
    } catch (err) {
      setError(err.message);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeUrl();
  }, [currentUrl]);

  const openOriginal = () => {
    if (!currentUrl) return;
    window.location.href = currentUrl;
  };

  return React.createElement('div', null,
    React.createElement('div', { className: 'card' },
      React.createElement('p', { className: 'hint' }, 'URL to analyze:'),
      React.createElement('p', { className: 'dashboard-url' }, currentUrl || 'No URL provided'),
      React.createElement('div', { className: 'dashboard-actions', style: { marginTop: '16px' } },
        React.createElement('button', { type: 'button', onClick: analyzeUrl, disabled: loading || !currentUrl }, loading ? 'Analyzing…' : 'Refresh analysis'),
        React.createElement('button', { type: 'button', onClick: openOriginal, disabled: !currentUrl }, 'Open original URL')
      )
    ),
    error && React.createElement('div', { className: 'dashboard-notice' }, error),
    analysis && React.createElement('div', null,
      React.createElement('div', { className: 'card result-card' },
        React.createElement('div', { className: 'result-header' },
          React.createElement('div', null,
            React.createElement('p', { className: 'section-label' }, 'Prediction'),
            React.createElement('h2', { id: 'result-label' }, analysis.prediction)
          ),
          React.createElement('div', { className: 'confidence-ring', style: { background: `conic-gradient(var(--accent) 0deg ${Math.min(100, analysis.confidence) * 3.6}deg, #e2e8f0 ${Math.min(100, analysis.confidence) * 3.6}deg 360deg)` } },
            React.createElement('span', null, `${analysis.confidence}%`)
          )
        ),
        React.createElement('div', { className: 'result-grid' },
          React.createElement('div', { className: 'metric-card' }, React.createElement('span', null, 'Risk Level'), React.createElement('strong', null, analysis.risk_level)),
          React.createElement('div', { className: 'metric-card' }, React.createElement('span', null, 'Trust Score'), React.createElement('strong', null, analysis.trust_score || 0)),
          React.createElement('div', { className: 'metric-card' }, React.createElement('span', null, 'URL Length'), React.createElement('strong', null, analysis.features.url_length || 0))
        ),
        React.createElement('div', { className: 'details-panel', style: { display: 'grid', gap: '18px' } },
          React.createElement('div', null,
            React.createElement('h3', null, 'Safe indicators'),
            React.createElement('ul', { className: 'reason-list' },
              (analysis.safe_signals || []).length > 0 ? (analysis.safe_signals || []).map((signal) => React.createElement('li', { key: signal }, signal)) : React.createElement('li', null, 'No strong safe signals detected.')
            )
          ),
          React.createElement('div', null,
            React.createElement('h3', null, 'Suspicious indicators'),
            React.createElement('ul', { className: 'reason-list' },
              (analysis.suspicious_signals || []).length > 0 ? (analysis.suspicious_signals || []).map((signal) => React.createElement('li', { key: signal }, signal)) : React.createElement('li', null, 'No suspicious indicators detected.')
            )
          )
        ),
        React.createElement('div', { className: 'final-panel' },
          React.createElement('h3', null, 'Final recommendation'),
          React.createElement('p', null, analysis.final_analysis || 'No recommendation available.')
        ),
        React.createElement('div', { className: 'features-panel' },
          React.createElement('h3', null, 'Feature breakdown'),
          React.createElement('div', { className: 'feature-list' },
            Object.entries(analysis.features).map(([key, value]) => React.createElement('div', { key, className: 'feature-item' },
              React.createElement('strong', null, key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())),
              React.createElement('span', null, String(value))
            ))
          )
        )
      )
    )
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(DashboardApp));

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('url-form')
  const input = document.getElementById('url-input')
  const spinner = document.getElementById('spinner')
  const result = document.getElementById('result')
  const liveStatus = document.getElementById('live-status')
  const historyCard = document.getElementById('history-card')
  const historyList = document.getElementById('prediction-history')
  const resultLabel = document.getElementById('result-label')
  const confidenceValue = document.getElementById('confidence-value')
  const confidenceRing = document.getElementById('confidence-ring')
  const riskValue = document.getElementById('risk-value')
  const reputationValue = document.getElementById('reputation-value')
  const lengthValue = document.getElementById('length-value')
  const safeList = document.getElementById('safe-list')
  const suspiciousList = document.getElementById('suspicious-list')
  const finalAnalysis = document.getElementById('final-analysis')
  const featureList = document.getElementById('feature-list')

  let debounceTimer = null
  let activeRequest = null
  let lastPredictedUrl = ''

  const isUrlReady = (value) => {
    const trimmed = value.trim()
    return trimmed.length > 10 && /^(https?:\/\/)?[\w.-]+\.[A-Za-z]{2,}(\/|$)/.test(trimmed)
  }

  const isUrlComplete = (value) => {
    const trimmed = value.trim()
    return /^(https?:\/\/)/.test(trimmed) && /\.[A-Za-z]{2,}(\/|$)/.test(trimmed)
  }

  const updateLiveStatus = (text) => {
    liveStatus.textContent = text
    liveStatus.classList.remove('hidden')
  }

  const clearLiveStatus = () => {
    liveStatus.classList.add('hidden')
  }

  const setConfidenceRing = (value) => {
    const deg = Math.min(100, value) * 3.6
    confidenceRing.style.background = `conic-gradient(var(--accent) 0deg ${deg}deg, #e2e8f0 ${deg}deg 360deg)`
    confidenceValue.textContent = `${value}%`
  }

  const setRiskDisplay = (level) => {
    riskValue.textContent = level
    result.classList.remove('risk-low', 'risk-medium', 'risk-high')
    if (level === 'High') result.classList.add('risk-high')
    else if (level === 'Medium') result.classList.add('risk-medium')
    else result.classList.add('risk-low')
  }

  const renderFeatures = (features) => {
    const entries = Object.entries(features)
    featureList.innerHTML = ''
    entries.forEach(([key, value]) => {
      const item = document.createElement('div')
      item.className = 'feature-item'
      const title = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      item.innerHTML = `<strong>${title}</strong><span>${value}</span>`
      featureList.appendChild(item)
    })
  }

  const renderList = (element, items, emptyText) => {
    element.innerHTML = ''
    if (!items || !items.length) {
      const li = document.createElement('li')
      li.textContent = emptyText
      element.appendChild(li)
      return
    }
    items.forEach((item) => {
      const li = document.createElement('li')
      li.textContent = item
      element.appendChild(li)
    })
  }

  const renderResult = (data) => {
    resultLabel.textContent = data.prediction
    setConfidenceRing(data.confidence)
    setRiskDisplay(data.risk_level)
    reputationValue.textContent = data.features.reputation_score || 0
    lengthValue.textContent = data.features.url_length || 0
    document.getElementById('trust-value').textContent = data.trust_score || 0

    renderList(safeList, data.safe_signals, 'No strong safe signals detected.')
    renderList(suspiciousList, data.suspicious_signals, 'No suspicious indicators detected.')
    finalAnalysis.textContent = data.final_analysis || 'No recommendation available.'

    renderFeatures(data.features)
    result.classList.remove('hidden')
  }

  const renderError = (message) => {
    resultLabel.textContent = 'Error'
    setConfidenceRing(0)
    setRiskDisplay('Low')
    reputationValue.textContent = '0'
    lengthValue.textContent = '0'
    document.getElementById('trust-value').textContent = '0'
    renderList(safeList, [], 'No safe signals available.')
    renderList(suspiciousList, [message], 'No suspicious indicators detected.')
    finalAnalysis.textContent = message
    featureList.innerHTML = ''
    result.classList.remove('hidden')
  }

  const saveHistory = (entry) => {
    const history = JSON.parse(sessionStorage.getItem('phishingHistory') || '[]')
    const filtered = history.filter((item) => item.url !== entry.url)
    filtered.unshift(entry)
    sessionStorage.setItem('phishingHistory', JSON.stringify(filtered.slice(0, 5)))
    renderHistory()
  }

  const renderHistory = () => {
    const history = JSON.parse(sessionStorage.getItem('phishingHistory') || '[]')
    historyList.innerHTML = ''
    if (!history.length) {
      historyCard.classList.add('hidden')
      return
    }
    historyCard.classList.remove('hidden')
    history.forEach((item) => {
      const li = document.createElement('li')
      li.innerHTML = `<strong>${item.url}</strong><span>${item.prediction} • ${item.confidence}% • ${item.risk_level}</span>`
      historyList.appendChild(li)
    })
  }

  const fetchPrediction = async (url) => {
    if (activeRequest) {
      activeRequest.abort()
    }
    const controller = new AbortController()
    activeRequest = controller

    spinner.classList.remove('hidden')
    updateLiveStatus('Analyzing URL...')
    result.classList.add('hidden')

    try {
      const res = await fetch(`/api/predict?url=${encodeURIComponent(url)}`, {
        signal: controller.signal
      })
      const data = await res.json()
      spinner.classList.add('hidden')
      activeRequest = null
      if (res.ok) {
        renderResult(data)
        saveHistory({ url: data.url, prediction: data.prediction, confidence: data.confidence, risk_level: data.risk_level })
        lastPredictedUrl = url
        updateLiveStatus('Live prediction updated')
      } else {
        renderError(`Error: ${data.error || 'Unknown error'}`)
        updateLiveStatus('Prediction could not be completed')
      }
    } catch (err) {
      spinner.classList.add('hidden')
      activeRequest = null
      if (err.name === 'AbortError') {
        updateLiveStatus('Waiting for latest input...')
      } else {
        renderError('Network or server error. Please try again.')
        updateLiveStatus('Live prediction paused due to error')
      }
    }
  }

  const schedulePrediction = () => {
    const url = input.value.trim()
    if (!isUrlReady(url)) {
      clearTimeout(debounceTimer)
      spinner.classList.add('hidden')
      result.classList.add('hidden')
      updateLiveStatus('Type a URL to see live phishing analysis')
      return
    }
    if (url === lastPredictedUrl) {
      updateLiveStatus('URL already analyzed')
      return
    }
    if (!isUrlComplete(url)) {
      updateLiveStatus('Waiting for a complete URL before scanning...')
      return
    }
    updateLiveStatus('Preparing live analysis...')
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => fetchPrediction(url), 900)
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const url = input.value.trim()
    if (!url) return
    fetchPrediction(url)
  })

  input.addEventListener('input', schedulePrediction)
  renderHistory()
  updateLiveStatus('Type a URL to see live phishing analysis')
})

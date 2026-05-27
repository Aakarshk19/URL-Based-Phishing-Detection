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

  const API_BASE = window.location.origin

  const normalizeUrl = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const isUrlReady = (value) => {
    const trimmed = normalizeUrl(value)
    return trimmed.length > 10 && /^(https?:\/\/)?[\w.-]+\.[A-Za-z]{2,}(\/|$)/.test(trimmed)
  }

  const isUrlComplete = (value) => {
    const trimmed = normalizeUrl(value)
    return /^(https?:\/\/)/.test(trimmed) && /\.[A-Za-z]{2,}(\/|$)/.test(trimmed)
  }

  const updateLiveStatus = (text) => {
    liveStatus.textContent = text
    liveStatus.classList.remove('hidden')
  }

  const setText = (element, text) => {
    if (element) element.textContent = text
  }

  const clearLiveStatus = () => {
    liveStatus.classList.add('hidden')
  }

  const setConfidenceRing = (value) => {
    const deg = Math.min(100, value) * 3.6
    if (confidenceRing) {
      confidenceRing.style.background = `conic-gradient(var(--accent) 0deg ${deg}deg, #e2e8f0 ${deg}deg 360deg)`
    }
    setText(confidenceValue, `${value}%`)
  }

  const setRiskDisplay = (level) => {
    setText(riskValue, level)
    result.classList.remove('risk-low', 'risk-medium', 'risk-high')
    if (level === 'High') result.classList.add('risk-high')
    else if (level === 'Medium') result.classList.add('risk-medium')
    else result.classList.add('risk-low')
  }

  const renderFeatures = (features) => {
    const entries = Object.entries(features || {})
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
    setText(resultLabel, data.prediction)
    setConfidenceRing(data.confidence)
    setRiskDisplay(data.risk_level)
    const features = data.features || {}
    setText(reputationValue, features.reputation_score || 0)
    setText(lengthValue, features.url_length || 0)
    setText(document.getElementById('trust-value'), data.trust_score || 0)

    renderList(safeList, data.safe_signals, 'No strong safe signals detected.')
    renderList(suspiciousList, data.suspicious_signals, 'No suspicious indicators detected.')
    finalAnalysis.textContent = data.final_analysis || 'No recommendation available.'

    renderFeatures(features)
    result.classList.remove('hidden')
  }

  const renderError = (message) => {
    setText(resultLabel, 'Error')
    setConfidenceRing(0)
    setRiskDisplay('Low')
    setText(reputationValue, '0')
    setText(lengthValue, '0')
    setText(document.getElementById('trust-value'), '0')
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
      li.innerHTML = `<strong>${item.url}</strong><span>${item.prediction} - ${item.confidence}% - ${item.risk_level}</span>`
      historyList.appendChild(li)
    })
  }

  const fetchPrediction = async (rawUrl) => {
    const url = normalizeUrl(rawUrl)
    if (!url) return

    if (activeRequest) {
      activeRequest.abort()
    }
    const controller = new AbortController()
    activeRequest = controller
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    spinner.classList.remove('hidden')
    updateLiveStatus('Analyzing URL...')
    result.classList.add('hidden')

    try {
      const endpoint = `${API_BASE}/api/predict?url=${encodeURIComponent(url)}`
      const res = await fetch(endpoint, {
        signal: controller.signal
      })
      const data = await res.json().catch(() => ({ error: 'Server returned an unreadable response' }))
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
      if (err.name === 'AbortError') {
        renderError('The request timed out. The hosted server may still be waking up; please try again.')
        updateLiveStatus('Prediction timed out')
      } else {
        renderError('Network or server error. Please try again.')
        updateLiveStatus('Live prediction paused due to error')
      }
    } finally {
      clearTimeout(timeoutId)
      spinner.classList.add('hidden')
      activeRequest = null
    }
  }

  const schedulePrediction = () => {
    const url = normalizeUrl(input.value)
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
    const url = normalizeUrl(input.value)
    if (!url) return
    input.value = url
    fetchPrediction(url)
  })

  input.addEventListener('input', schedulePrediction)
  renderHistory()
  updateLiveStatus('Type a URL to see live phishing analysis')
})

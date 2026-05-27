from flask import Flask, render_template, request, jsonify
import logging
import os
import pickle
try:
    import joblib
except Exception:
    joblib = None

from ml.feature_extraction import extract_features_from_url, FEATURE_COLUMNS

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to load model and scaler; if missing, app still runs but API returns helpful message
MODEL_PATH = os.path.join('model', 'phishing_model.pkl')
SCALER_PATH = os.path.join('model', 'scaler.pkl')

model = None
scaler = None

def load_serialized(path):
    if not os.path.exists(path):
        return None
    try:
        if joblib is not None:
            return joblib.load(path)
    except Exception as e:
        logger.warning('joblib load failed for %s: %s', path, e)
    try:
        with open(path, 'rb') as f:
            return pickle.load(f)
    except Exception as e:
        logger.error('pickle load failed for %s: %s', path, e)
        return None

model = load_serialized(MODEL_PATH)
scaler = load_serialized(SCALER_PATH)

if model is not None:
    logger.info('Loaded model from %s', MODEL_PATH)
else:
    logger.warning('Model not loaded from %s', MODEL_PATH)

if scaler is not None:
    logger.info('Loaded scaler from %s', SCALER_PATH)
else:
    logger.warning('Scaler not loaded from %s', SCALER_PATH)


def predict_url(url: str):
    """Extract features and run prediction. Returns dict with analysis."""
    if model is None:
        raise RuntimeError('Model not found. Please train the model first.')

    features = extract_features_from_url(url)
    X = [features[f] for f in FEATURE_COLUMNS]

    # Scaling if available
    try:
        import numpy as np
    except ImportError as e:
        raise RuntimeError('NumPy is required to run the prediction engine.') from e

    arr = np.array(X).reshape(1, -1)
    if scaler is not None:
        arr = scaler.transform(arr)

    proba = model.predict_proba(arr)[0]
    phishing_score = float(proba[1])

    safe_signals = []
    suspicious_signals = []

    if features['has_https']:
        safe_signals.append('HTTPS enabled')
    else:
        suspicious_signals.append('No HTTPS')

    if features['is_trusted_domain']:
        safe_signals.append(f"Trusted domain: {features['root_domain']}")
    if features['is_safe_tld']:
        safe_signals.append('Safe TLD')
    if features['valid_tld']:
        safe_signals.append('Valid top-level domain')
    if not features['has_ip']:
        safe_signals.append('No raw IP address in host')
    if not features['has_at']:
        safe_signals.append('No @ symbol')
    if not features['is_shortened']:
        safe_signals.append('Not a URL shortener')

    if features['trust_score'] >= 70:
        safe_signals.append('Strong domain trust score')
    elif features['trust_score'] < 40:
        suspicious_signals.append('Low domain trust score')

    if features['has_ip']:
        suspicious_signals.append('IP address used in host')
    if features['has_at']:
        suspicious_signals.append('Contains @ symbol')
    if features['is_shortened']:
        suspicious_signals.append('Uses URL shortening service')
    if features['suspicious_tld']:
        suspicious_signals.append('Suspicious top-level domain')
    if features['suspicious_words'] > 0:
        suspicious_signals.append('Suspicious keyword(s) present')
    if features['brand_impersonation']:
        suspicious_signals.append('Possible brand impersonation')
    if features['redirection']:
        suspicious_signals.append('Redirect syntax inside URL')
    if features['special_char_ratio'] > 0.18:
        suspicious_signals.append('Excessive special characters')
    if features['url_depth'] > 6:
        suspicious_signals.append('Deep URL path structure')
    if features['url_length'] > 120:
        suspicious_signals.append('Long URL structure')

    adjusted_score = phishing_score
    if (features['is_trusted_domain'] and features['has_https'] and features['is_safe_tld'] and
            features['suspicious_words'] == 0 and not features['has_ip'] and
            not features['has_at'] and not features['is_shortened']):
        adjusted_score *= 0.35
    elif features['is_trusted_domain'] and features['has_https']:
        adjusted_score *= 0.6

    adjusted_score = max(0.0, min(adjusted_score, 1.0))
    confidence = round(adjusted_score * 100, 2)
    prediction = 'Phishing' if adjusted_score >= 0.5 else 'Safe'

    if confidence >= 85:
        risk = 'High'
    elif confidence >= 60:
        risk = 'Medium'
    else:
        risk = 'Low'

    if prediction == 'Safe':
        if suspicious_signals and safe_signals:
            final_analysis = 'The URL appears legitimate despite minor concerns.'
        elif safe_signals:
            final_analysis = 'The website appears legitimate based on strong safe signals.'
        else:
            final_analysis = 'No strong phishing indicators were detected.'
    else:
        if safe_signals:
            final_analysis = 'The URL shows phishing risk despite some trusted signals.'
        else:
            final_analysis = 'The URL contains multiple phishing indicators and should be treated as suspicious.'

    analysis = {
        'url': url,
        'prediction': prediction,
        'confidence': confidence,
        'risk_level': risk,
        'trust_score': features['trust_score'],
        'safe_signals': safe_signals,
        'suspicious_signals': suspicious_signals,
        'final_analysis': final_analysis,
        'features': features
    }
    return analysis


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/about')
def about():
    return render_template('about.html')


@app.route('/features')
def features_page():
    return render_template('features.html')


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json() or {}
        url = data.get('url') or request.form.get('url')
        if not url:
            return jsonify({'error': 'URL is required'}), 400

        analysis = predict_url(url)
        return jsonify(analysis)
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        logger.exception('Prediction error')
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/predict')
def api_predict_get():
    # Simple GET for quick testing: /api/predict?url=...
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'url query param required'}), 400
    try:
        analysis = predict_url(url)
        return jsonify(analysis)
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        logger.exception('API prediction error')
        return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

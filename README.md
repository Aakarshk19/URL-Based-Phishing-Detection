# AI-Based Phishing Website Detection System

## Overview

AI-Based Phishing Website Detection is a beginner-friendly full-stack project that analyzes website URLs and predicts whether they are legitimate or phishing using machine learning. The app includes a Flask backend, URL feature extraction, model training scripts, and a responsive frontend.

## Features
- Real-time URL phishing prediction as you type
- URL feature extraction and breakdown
- Prediction history panel for recent scans
- Machine learning training and model selection (Logistic Regression, Decision Tree, Random Forest)
- REST API endpoints
- Responsive UI with analysis and risk indicators

## Tech Stack
- Python, Flask
- scikit-learn, pandas, numpy
- HTML/CSS/JavaScript
- joblib for model persistence

## Folder Structure

See repository root. Key folders:
- `ml/` : feature extraction and training scripts
- `templates/` and `static/` : frontend
- `dataset/` : sample CSV
- `model/` : saved models (created after training)
- `docs/` : API docs

## Installation (Windows)

1. Create virtual environment

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

2. Train model (optional but recommended)

```powershell
python -m ml.train_model --data dataset\phishing_dataset.csv --out model
```

Alternatively, if `scikit-learn` is difficult to install on your machine, use the lightweight trainer:

```powershell
python -m ml.train_simple
```

This creates `model/phishing_model.pkl` and `model/scaler.pkl` using a simple pure-Python classifier.

3. Run Flask app

```powershell
python app.py
```

Open http://127.0.0.1:5000 in your browser.

## Mac / Linux

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python ml/train_model.py --data dataset/phishing_dataset.csv --out model
python app.py
```

## API Endpoints
- `POST /predict` — JSON body `{ "url": "https://..." }`
- `GET /api/predict?url=...` — quick test endpoint

## ML Workflow
1. Load dataset from `dataset/phishing_dataset.csv`
2. Extract URL features using `ml/feature_extraction.py`
3. Train three classifiers, compare accuracy
4. Save best model to `model/phishing_model.pkl` and `model/scaler.pkl`

## Screenshots
Place screenshots in `screenshots/` (placeholder files included).

## Deployment

### Live Demo
**Try the app online**: [phishing-detector.onrender.com](https://phishing-detector.onrender.com) *(deployed on Render)*

### Deploy to Render (Free)
1. Push this repo to GitHub
2. Go to [render.com](https://render.com) and create account
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `gunicorn app:app`
6. Click "Create Web Service"
7. Your app will be live in ~3 minutes!

### Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select this repository
4. Railway auto-detects Flask and deploys automatically
5. Free tier includes $5/month credit

### Deploy with Docker

Build and run with Docker:

```bash
docker build -t ai-phishing .
docker run -p 5000:5000 ai-phishing
```

Or with docker-compose:

```bash
docker-compose up --build
```

## Browser Extension
This project also supports a browser extension workflow:
- The extension monitors visited URLs in the browser
- Suspicious sites are redirected to the React-style dashboard
- The dashboard loads analysis from the Flask `/api/predict` endpoint

To use it:
1. Run the Flask app locally with `python app.py`
2. Load the `extension/` folder in Chrome/Edge via `chrome://extensions`
3. Open an untrusted site and let the extension redirect to the dashboard

## Future Improvements
- WHOIS domain age lookup
- VirusTotal integration
- Add authentication and user history
- Dockerize the app

## License
MIT

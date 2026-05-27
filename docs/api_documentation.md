# API Documentation

## POST /predict

Request (JSON):

{
  "url": "https://example.com"
}

Response (200):

{
  "url": "https://example.com",
  "prediction": "Legitimate",
  "confidence": 12.34,
  "risk_level": "Low",
  "reasons": ["No HTTPS"],
  "features": { ... }
}

## GET /api/predict

Query: `?url=https://example.com`

Returns same JSON format. When model is missing, returns 503 with error message.

FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y build-essential gcc --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt || true

COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["gunicorn", "app:app", "-b", "0.0.0.0:5000", "--workers", "2"]

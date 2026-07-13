FROM python:3.9-slim

WORKDIR /app

# Install system dependencies if required by matplotlib/pandas
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=app.py
ENV PORT=5000

# Bind to 0.0.0.0 and dynamic port for Cloud Run/Render
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app

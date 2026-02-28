# ─────────────────────────────────────────────
#  Magnova Backend — Production Dockerfile
#  Base: python:3.11-slim (small, no extras)
# ─────────────────────────────────────────────

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install only OS-level dependencies needed at runtime
# (libgomp is required by some numpy/pandas builds on slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer cache — only re-installs when reqs change)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Railway injects $PORT at runtime; default to 8000 for local docker run
ENV PORT=8000

# Expose the port (documentation only — Railway reads $PORT automatically)
EXPOSE 8000

# Start uvicorn — binds to 0.0.0.0 so Railway's proxy can reach it
# Workers=1 keeps memory low on Railway's free/hobby tier
CMD uvicorn server:app --host 0.0.0.0 --port $PORT --workers 1

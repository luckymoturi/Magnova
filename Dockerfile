# ─────────────────────────────────────────────
#  Magnova Backend — Production Dockerfile
#  Build context: repo root (used by Railway)
#  App source:    backend/
# ─────────────────────────────────────────────

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install OS-level dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer cache — only re-installs when reqs change)
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the backend app source
COPY backend/server.py .
COPY backend/start.py .

# Railway injects $PORT at runtime; default to 8000 for local docker run
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Expose the port (documentation only — Railway reads $PORT automatically)
EXPOSE 8000

# Use Python entrypoint — reads PORT via os.environ (no shell expansion issues)
CMD ["python", "start.py"]

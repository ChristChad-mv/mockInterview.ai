# --- Final Image ---
FROM python:3.11-slim

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:0.8.13 /uv /uv/bin/uv
ENV PATH="/uv/bin:$PATH"

WORKDIR /app

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock* README.md ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source
COPY app ./app

# Copy the pre-built frontend assets from the local machine
# (Ensure they are built locally with 'npm run build' first)
COPY frontend/build ./frontend/build

# Metadata and Environment
ARG COMMIT_SHA=""
ENV COMMIT_SHA=${COMMIT_SHA}
ARG AGENT_VERSION=0.0.0
ENV AGENT_VERSION=${AGENT_VERSION}

# Standardize on port 8080 (Cloud Run default)
EXPOSE 8080

# Production run command
CMD ["uv", "run", "uvicorn", "app.fast_api_app:app", "--host", "0.0.0.0", "--port", "8080"]

# ==============================================================================
# Installation & Setup
# ==============================================================================

# Install dependencies using uv package manager
install:
	@command -v uv >/dev/null 2>&1 || { echo "uv is not installed. Installing uv..."; curl -LsSf https://astral.sh/uv/0.8.13/install.sh | sh; source $HOME/.local/bin/env; }
	uv sync && (cd frontend && npm install)

# ==============================================================================
# Playground Targets
# ==============================================================================

# Launch local dev playground
playground: build-frontend-if-needed
	@echo "==============================================================================="
	@echo "| 🚀 Starting MockInterview.ai...                                             |"
	@echo "|                                                                             |"
	@echo "| 🌐 Access your app at: http://localhost:8000                               |"
	@echo "| 🎤 Click 'Start Interview' and talk to your AI interviewer!                 |"
	@echo "|                                                                             |"
	@echo "| 👁️  Vision auto-enables — the AI can see your code editor.                  |"
	@echo "==============================================================================="
	@if [ -f .env ]; then set -a && . ./.env && set +a; fi && uv run uvicorn app.fast_api_app:app --host localhost --port 8000 --reload

# ==============================================================================
# Local Development Commands
# ==============================================================================

# Launch local development server with hot-reload
# Usage: make local-backend [PORT=8000] - Specify PORT for parallel scenario testing
local-backend:
	uv run uvicorn app.fast_api_app:app --host localhost --port $(or $(PORT),8000) --reload

# ==============================================================================
# ADK Live Commands
# ==============================================================================

# Build the frontend for production
build-frontend:
	(cd frontend && npm run build)

# Build the frontend only if needed (conditional build)
build-frontend-if-needed:
	@if [ ! -d "frontend/build" ] || [ ! -f "frontend/build/index.html" ]; then \
		echo "Frontend build directory not found or incomplete. Building..."; \
		$(MAKE) build-frontend; \
	elif [ "frontend/package.json" -nt "frontend/build/index.html" ] || \
		 find frontend/src -newer frontend/build/index.html 2>/dev/null | head -1 | grep -q .; then \
		echo "Frontend source files are newer than build. Rebuilding..."; \
		$(MAKE) build-frontend; \
	else \
		echo "Frontend build is up to date. Skipping build..."; \
	fi

# ==============================================================================
# Backend Deployment Targets
# ==============================================================================

# Deploy the agent remotely
deploy: build-frontend-if-needed
	@PROJECT_ID=$$(gcloud config get-value project) && \
	echo "🚀 Deploying to Project: $$PROJECT_ID" && \
	gcloud beta run deploy mockinterview \
		--source . \
		--memory "8Gi" \
		--cpu "4" \
		--min-instances 1 \
		--project $$PROJECT_ID \
		--region "us-central1" \
		--allow-unauthenticated \
		--no-cpu-throttling \
		--labels "created-by=adk" \
		--set-env-vars "GEMINI_API_KEY=$(shell grep GEMINI_API_KEY .env | cut -d '=' -f2)" \
		--set-env-vars "VITE_ADMIN_EMAIL=$(shell grep VITE_ADMIN_EMAIL .env | cut -d '=' -f2)" \
		--set-env-vars "VITE_FIREBASE_API_KEY=$(shell grep VITE_FIREBASE_API_KEY .env | cut -d '=' -f2)" \
		--set-env-vars "VITE_FIREBASE_AUTH_DOMAIN=$(shell grep VITE_FIREBASE_AUTH_DOMAIN .env | cut -d '=' -f2)" \
		--set-env-vars "VITE_FIREBASE_PROJECT_ID=$(shell grep VITE_FIREBASE_PROJECT_ID .env | cut -d '=' -f2)" \
		--set-env-vars "VITE_FIREBASE_STORAGE_BUCKET=$(shell grep VITE_FIREBASE_STORAGE_BUCKET .env | cut -d '=' -f2)" \
		--set-env-vars "VITE_FIREBASE_MESSAGING_SENDER_ID=$(shell grep VITE_FIREBASE_MESSAGING_SENDER_ID .env | cut -d '=' -f2)" \
		--set-env-vars "VITE_FIREBASE_APP_ID=$(shell grep VITE_FIREBASE_APP_ID .env | cut -d '=' -f2)" \
		--set-env-vars "VITE_FIREBASE_MEASUREMENT_ID=$(shell grep VITE_FIREBASE_MEASUREMENT_ID .env | cut -d '=' -f2)" \
		--set-env-vars "GOOGLE_CLOUD_PROJECT=$$PROJECT_ID" \
		--set-env-vars "GOOGLE_CLOUD_LOCATION=us-central1" \
		--set-env-vars "USE_VERTEXAI=True" \
		--set-env-vars "LOGS_BUCKET_NAME=mockinterview-ia-mockinterview-agent-logs" \
		--set-env-vars "RECORDINGS_BUCKET=mockinterview-ia-recordings" \
		--set-env-vars "ALLOWED_ORIGINS=https://mockinterview-105946928985.us-central1.run.app"

# Alias for 'make deploy' for backward compatibility
backend: deploy

# ==============================================================================
# Infrastructure Setup
# ==============================================================================

# Set up development environment resources using Terraform
setup-dev-env:
	PROJECT_ID=$$(gcloud config get-value project) && \
	(cd deployment/terraform && terraform init && terraform apply --var-file vars/env.tfvars --var project_id=$$PROJECT_ID --auto-approve)

# ==============================================================================
# Testing & Code Quality
# ==============================================================================

# Run unit and integration tests
test:
	uv sync --dev
	uv run pytest tests/unit && uv run pytest tests/integration

# Run code quality checks (codespell, ruff, ty)
lint:
	uv sync --dev --extra lint
	uv run codespell
	uv run ruff check . --diff
	uv run ruff format . --check --diff
	uv run ty check .
# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base

WORKDIR /app

# Pinned uv for reproducible, fast dependency management
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# Install production dependencies first for better layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Application source
COPY agents/ ./agents/
COPY shared/ ./shared/
# agents/ has no top-level __init__.py; add one so the package resolves cleanly
RUN touch agents/__init__.py

# Install the project itself into the virtualenv
RUN uv sync --frozen --no-dev

# Use the uv-managed virtualenv as the default interpreter so `python` sees deps
ENV PATH="/app/.venv/bin:$PATH"

# Run as non-root
RUN useradd --create-home appuser
USER appuser

EXPOSE 8080

# Selects which agent this container serves:
# orchestrator | knowledge | project_task | reporting | communication
ENV AGENT_NAME=orchestrator

# AgentCore Runtime contract: HTTP server on :8080 exposing /ping and /invocations
CMD ["python", "-m", "agents.common.server"]

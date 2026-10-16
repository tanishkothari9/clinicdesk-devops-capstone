FROM python:3.12-slim

ARG APP_VERSION=dev
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    APP_VERSION=${APP_VERSION}

WORKDIR /app

# Pick up Debian security fixes released after the base image was built.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser

COPY requirements.txt .
# pip is only needed at build time. Its vendored urllib3/msgpack/setuptools carry
# HIGH CVEs (found by Trivy), so remove it from the runtime image entirely.
RUN pip install -r requirements.txt \
    && python -m pip uninstall -y pip \
    && find / -xdev -path /proc -prune -o -type d -name "setuptools*" -path "*site-packages*" -prune -exec rm -rf {} +

COPY alembic.ini entrypoint.sh ./
COPY alembic ./alembic
COPY app ./app

USER 10001
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"
CMD ["./entrypoint.sh"]

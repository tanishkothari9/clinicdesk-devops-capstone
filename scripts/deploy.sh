#!/usr/bin/env bash
# Deploy a CI-built image (tagged with its Git commit SHA) to the current kube context.
#   ./scripts/deploy.sh                 # deploy HEAD's commit
#   ./scripts/deploy.sh <commit-sha>    # deploy a specific build
set -euo pipefail

SHA="${1:-$(git rev-parse HEAD)}"
OWNER="${OWNER:-tanishkothari9}"
VALUES="${VALUES:-helm/clinicdesk/values-dev.yaml}"

kubectl apply -f k8s/namespace.yaml
helm upgrade --install clinicdesk ./helm/clinicdesk \
  --namespace clinicdesk \
  -f "$VALUES" \
  --set backend.image.repository="ghcr.io/$OWNER/clinicdesk-backend" \
  --set frontend.image.repository="ghcr.io/$OWNER/clinicdesk-frontend" \
  --set backend.image.tag="$SHA" \
  --set frontend.image.tag="$SHA" \
  --wait --timeout 5m
kubectl get pods -n clinicdesk

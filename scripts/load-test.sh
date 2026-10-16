#!/usr/bin/env bash
# Generate CPU load on the backend from inside the cluster so the HPA scales it out.
#   ./scripts/load-test.sh            # 8 workers for 180s
#   WORKERS=12 DURATION=300 ./scripts/load-test.sh
set -euo pipefail

NAMESPACE="${NAMESPACE:-clinicdesk}"
TARGET="${TARGET:-http://clinicdesk-backend:8000/api/appointments/stats}"
WORKERS="${WORKERS:-8}"
DURATION="${DURATION:-180}"

echo "Hitting $TARGET with $WORKERS workers for ${DURATION}s (namespace $NAMESPACE)"
kubectl run clinicdesk-loadgen -n "$NAMESPACE" --rm -i --restart=Never --image=busybox:1.37 -- \
  sh -c "end=\$((\$(date +%s) + $DURATION)); \
         for w in \$(seq $WORKERS); do \
           (while [ \$(date +%s) -lt \$end ]; do wget -q -O /dev/null $TARGET; done) & \
         done; wait; echo 'load test finished'"

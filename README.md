# ClinicDesk: DevOps Final Capstone

[![ClinicDesk CI/CD](https://github.com/tanishkothari9/clinicdesk-devops-capstone/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/tanishkothari9/clinicdesk-devops-capstone/actions/workflows/ci-cd.yml)

**ClinicDesk** is a small appointment desk for an outpatient clinic. Front-desk staff register doctors, book patients into time slots, and move each visit through check-in → completed (or cancelled / no-show). Every request flows from a React UI through a FastAPI service into PostgreSQL. The backend refuses to double-book a doctor, and the dashboard shows today's schedule, load per doctor and the completion rate.

The application is my own domain. The DevOps layer follows the course architecture: Git → GitHub Actions (pytest, build, Trivy, GHCR) → Terraform (AWS VPC + EKS) → Helm on Kubernetes (Ingress, HPA) → Prometheus + Grafana, plus a troubleshooting lab.

| | |
|---|---|
| Student | Tanish Kothari |
| Repository | https://github.com/tanishkothari9/clinicdesk-devops-capstone |
| Pipeline run (green) | https://github.com/tanishkothari9/clinicdesk-devops-capstone/actions/runs/38907105678 |
| Images | `ghcr.io/tanishkothari9/clinicdesk-backend:<git-sha>`, `ghcr.io/tanishkothari9/clinicdesk-frontend:<git-sha>` |

![ClinicDesk overview](docs/screenshots/01-app-overview.png)

## Contents

1. [Architecture](#1-architecture)
2. [Repository layout](#2-repository-layout)
3. [M1: Application](#3-m1-application-frontend--backend--database)
4. [M2: Testing](#4-m2-testing-pytest)
5. [M3: Git and GitHub](#5-m3-git-and-github)
6. [M4: Docker](#6-m4-docker-dockerfiles--compose)
7. [M5: CI/CD](#7-m5-cicd-github-actions)
8. [M6: DevSecOps with Trivy](#8-m6-devsecops-trivy)
9. [M7: Terraform on AWS](#9-m7-terraform-aws-vpc--eks)
10. [M8: Kubernetes + Helm](#10-m8-kubernetes--helm)
11. [HPA](#11-horizontal-pod-autoscaler)
12. [M9: Observability](#12-m9-observability-prometheus--grafana)
13. [Troubleshooting lab](#13-troubleshooting-lab)
14. [M10: Live demo flow](#14-m10-live-demo-commit--pipeline--deployment)
15. [Submission checklist](#15-submission-checklist)

---

## 1. Architecture

```mermaid
flowchart TD
    dev[Developer laptop] -->|git push| gh[GitHub repo]
    gh --> ci{{GitHub Actions}}
    ci -->|1 test| t[pytest + vite build]
    t -->|2 build| b[docker build backend + frontend<br/>tag = commit SHA]
    b -->|3 scan| tr[Trivy: fail on HIGH/CRITICAL]
    tr -->|4 push| ghcr[(GHCR)]
    ghcr -->|5 deploy| helm[helm upgrade --install]
    tf[Terraform] --> aws[AWS VPC + EKS]
    helm --> k8s
    subgraph k8s [Kubernetes namespace: clinicdesk]
      ing[Ingress nginx<br/>/ → frontend, /api → backend] --> fe[frontend x2<br/>nginx-unprivileged]
      ing --> be[backend x2..5<br/>FastAPI + HPA]
      fe -->|/api proxy| be
      be --> pg[(PostgreSQL<br/>StatefulSet + PVC)]
    end
    prom[Prometheus] -->|ServiceMonitor scrapes /metrics| be
    graf[Grafana] --> prom
```

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite 5, plain responsive CSS, served by `nginxinc/nginx-unprivileged` |
| Backend | FastAPI, SQLAlchemy 2, Alembic, psycopg 3, `prometheus-fastapi-instrumentator` |
| Database | PostgreSQL 16 |
| Tests | pytest + FastAPI TestClient on an in-memory SQLite database |
| CI/CD | GitHub Actions → Trivy → GitHub Container Registry → Helm |
| Infrastructure | Terraform (`terraform-aws-modules/vpc` + `/eks`), region `ap-south-1` |
| Platform | Kubernetes, Helm, ingress-nginx, metrics-server, HPA |
| Observability | kube-prometheus-stack (Prometheus Operator + Grafana) |

## 2. Repository layout

```text
clinicdesk-devops-capstone/
├── backend/                  # FastAPI service
│   ├── app/                  # config, db, models, schemas, routers/
│   ├── alembic/versions/     # 0001 schema, 0002 demo doctors
│   ├── tests/                # 22 pytest cases
│   ├── Dockerfile            # non-root, runs migrations then uvicorn
│   └── entrypoint.sh
├── frontend/                 # React dashboard + nginx template
│   └── Dockerfile            # multi-stage: node build → nginx-unprivileged
├── docker-compose.yml        # postgres + backend + frontend
├── .github/workflows/ci-cd.yml
├── terraform/                # AWS VPC + EKS
├── k8s/namespace.yaml
├── helm/clinicdesk/          # chart: deployments, services, postgres, ingress, HPA, ServiceMonitor, dashboard
├── monitoring/               # kube-prometheus-stack values
├── troubleshooting/          # deliberately broken manifests
├── scripts/                  # deploy.sh, load-test.sh, seed-demo-data.py
└── docs/screenshots/
```

---

## 3. M1: Application (frontend + backend + database)

### Features

- **Overview:** today's schedule with one-click *Check in → Complete / Cancel / No-show*, KPI cards, load per doctor and a status breakdown.
- **Appointments:** filter by status, doctor and date. The table turns into cards on phones.
- **Doctors:** add or remove doctors. The API blocks deleting a doctor who still has appointments.
- **Business rule:** a doctor can't be double-booked. Overlapping slots return `409` with a readable message, back-to-back slots are fine, and a cancelled slot can be booked again.
- **States:** loading skeletons, empty states, and an "API offline" banner with Retry. The sidebar shows the running frontend and backend commit SHAs.

| Appointments | Doctors | Mobile (390px) |
|---|---|---|
| ![appointments](docs/screenshots/01-app-appointments.png) | ![doctors](docs/screenshots/01-app-doctors.png) | ![mobile](docs/screenshots/01-app-mobile.png) |

### REST API

| Method | Path | Purpose |
|---|---|---|
| GET | `/`, `/health`, `/api/health` | service info / liveness |
| GET | `/ready` | readiness: `SELECT 1` against Postgres, `503` if unreachable |
| GET | `/metrics` | Prometheus metrics |
| GET, POST | `/api/doctors` | list / create doctors |
| GET, PUT, DELETE | `/api/doctors/{id}` | read / update / delete (409 if the doctor has appointments) |
| GET, POST | `/api/appointments` | list (filters `status`, `doctor_id`, `date`) / book (409 on overlap) |
| GET, PUT, DELETE | `/api/appointments/{id}` | read / reschedule or change status / delete |
| GET | `/api/appointments/stats` | totals, today, upcoming, completion rate, by status, by doctor |

Swagger UI is at `/docs`:

![Swagger](docs/screenshots/03-swagger-docs.png)

### Database and migrations

Alembic manages two tables: `doctors`, and `appointments` with a foreign key to `doctors`, check constraints on status, visit type and duration, and indexes on doctor, time and status.

- `0001` creates the schema.
- `0002` seeds four demo doctors, so a new environment is usable right away.

Every backend replica runs `alembic upgrade head` on start-up. The migration holds a **Postgres advisory lock** (`alembic/env.py`), so two pods starting together can't race each other. `entrypoint.sh` retries while Postgres is still booting.

![Postgres tables inside the cluster](docs/screenshots/15-postgres-tables.png)

---

## 4. M2: Testing (pytest)

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -v
```

- **22 test cases** across `/health`, `/ready`, `/metrics`, `/api/doctors`, `/api/doctors/{id}`, `/api/appointments`, `/api/appointments/{id}` and `/api/appointments/stats`. They cover:
  - validation errors (422) and missing records (404)
  - double-booking and duplicate-email conflicts (409)
  - rescheduling into a taken slot, back-to-back slots and rebooking a cancelled slot
  - list filters and the stats maths
- **The tests never touch the real database.** `tests/conftest.py` overrides the `get_db` dependency with a fresh in-memory SQLite database (`StaticPool`) for every test.
- `pytest.ini` sets `testpaths`, `pythonpath`, and turns SQLAlchemy warnings into errors.

![pytest -v](docs/screenshots/02-pytest.png)

In CI, pytest is the first job. If it fails, no image is built or pushed.

---

## 5. M3: Git and GitHub

- Commits use conventional-commit messages (`feat(backend): …`, `ci: …`, `fix(backend): drop pip from runtime image to clear HIGH CVEs found by Trivy`).
- `.gitignore` excludes `.env*`, `__pycache__/`, `node_modules/`, `.venv/`, Terraform state and `*.tfvars`.
- `trivy fs --scanners secret` found no secrets in the repository. No AWS keys are committed: Terraform reads credentials from the local AWS profile.

![commit history](docs/screenshots/26-git-log.png)

---

## 6. M4: Docker (Dockerfiles + Compose)

| Image | How it is built | Runs as |
|---|---|---|
| `backend/Dockerfile` | `python:3.12-slim`. OS packages are patched with `apt-get upgrade`, pip is removed after installing dependencies (see M6), and a `HEALTHCHECK` hits `/health` | `appuser` (uid **10001**) |
| `frontend/Dockerfile` | **Multi-stage:** `node:22-alpine` runs `npm ci && vite build` → `nginxinc/nginx-unprivileged:1.29-alpine` serves `dist/`. Alpine packages are patched and curl removed. The nginx config is a template, so `BACKEND_URL` works for both Compose and Kubernetes | `nginx` (uid **101**), port 8080 |

```bash
docker compose up --build        # http://localhost:3000 (UI), http://localhost:8000/docs (API)
python3 scripts/seed-demo-data.py   # optional: book a week of demo appointments
docker compose down -v           # stop and drop the database volume
```

Postgres has a `pg_isready` healthcheck, and the backend waits for it with `depends_on: condition: service_healthy`.

![docker compose up --build](docs/screenshots/04-docker-compose-up.png)

The application at `http://localhost:3000` is in the [M1 screenshots](#3-m1-application-frontend--backend--database) above.

---

## 7. M5: CI/CD (GitHub Actions)

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) runs on every push and pull request to `main`, and on manual dispatch.

```text
test ──────────────► build-scan-push (matrix: backend, frontend) ──────────► deploy
pytest -v            docker build (tag = $GITHUB_SHA, gha layer cache)        helm upgrade --install
npm ci + vite build  Trivy: --severity HIGH,CRITICAL --exit-code 1            --set *.image.tag=$GITHUB_SHA
                     docker push ghcr.io/<owner>/clinicdesk-<component>:<sha>
```

- **Tests gate the images.** `build-scan-push` has `needs: test`, so a failing test stops the pipeline before anything is built.
- **Images are tagged only with the full commit SHA**, never `latest`. Every running pod traces back to one commit.
- **Pull requests build and scan but never push.**
- **The deploy job only runs when a cluster is configured.** It runs `helm upgrade --install` once a `KUBE_CONFIG_DATA` secret exists. Without it, the job skips with a notice instead of failing. The same Helm command lives in `scripts/deploy.sh` for clusters the runner can't reach (minikube on a laptop).
- **Trivy runs from the pinned `aquasec/trivy:0.76.0` image.** I deliberately didn't use a mutable third-party action tag.

Green run: https://github.com/tanishkothari9/clinicdesk-devops-capstone/actions/runs/38907105678

![GitHub Actions run](docs/screenshots/05-github-actions-run.png)

The images are pushed to GHCR with SHA tags (log of the *Push image to GHCR* step):

![GHCR push](docs/screenshots/05-ghcr-push-sha-tags.png)

<!-- GHCR package page screenshot goes here: docs/screenshots/27-ghcr-packages.png -->

---

## 8. M6: DevSecOps (Trivy)

Trivy scans both images in the pipeline. `--severity HIGH,CRITICAL --ignore-unfixed --exit-code 1` fails the build if any HIGH or CRITICAL vulnerability with an available fix is present.

**What Trivy found and what I changed.** The first scan of the backend image failed with four HIGH findings, all in packaging tooling that the API never uses at runtime:

- **GHSA-6v7p-g79w-8964:** msgpack, out-of-bounds read
- **CVE-2026-97687 and CVE-2026-97689:** urllib3, TLS override via HTTPS proxy, and unbounded memory allocation in the chunk parser (DoS)
- **CVE-2025-47273:** setuptools, path traversal in `PackageIndex`

msgpack and urllib3 were vendored inside pip. CVE-2026-97689, for example, lets a malicious server make urllib3 allocate memory without limit while parsing a chunked response, which can crash the process. That only matters if something runs pip or urllib3 inside the container, and nothing should. So the fix was not to pin newer versions but to **remove pip and setuptools from the runtime image** after installing dependencies (commit `fix(backend): drop pip from runtime image…`). That shrinks the attack surface instead of chasing versions.

The frontend's first scan reported **43 HIGH** findings in Alpine packages of the nginx base image: curl/libcurl, OpenSSL, expat, pcre2, libuuid and others. Adding `apk upgrade` and removing curl cleared them.

The pipeline's scans are now clean: 0 HIGH or CRITICAL in the Debian 13 packages and every Python package of the backend, and the same for the Alpine frontend.

| Before the fix (local scan of commit `7743803`) | In the pipeline after the fix |
|---|---|
| ![trivy before](docs/screenshots/06-trivy-findings-before-fix.png) | ![trivy ci backend](docs/screenshots/06-trivy-ci-backend.png) |

Frontend scan in CI:

![trivy ci frontend](docs/screenshots/06-trivy-ci-frontend.png)

---

## 9. M7: Terraform (AWS VPC + EKS)

[`terraform/`](terraform) provisions, in `ap-south-1`:

| Resource | Details |
|---|---|
| VPC | `10.42.0.0/16`, DNS hostnames on (`terraform-aws-modules/vpc ~> 6.7`) |
| Subnets | **2 public** (`10.42.0.0/24`, `10.42.1.0/24`) and 2 private (`10.42.10.0/24`, `10.42.11.0/24`) in two AZs, tagged for ELB discovery |
| NAT | a single NAT gateway, to keep costs down |
| EKS | cluster `clinicdesk-eks`, Kubernetes 1.35, public endpoint, creator gets cluster-admin (`terraform-aws-modules/eks ~> 21.29`) |
| Node group | managed `t3.medium` nodes, AL2023, min 1 / desired 2 / max 3 |
| Add-ons | vpc-cni, kube-proxy, coredns, eks-pod-identity-agent, and aws-ebs-csi-driver with a Pod Identity role, so the Postgres PVC gets an EBS volume |

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # optional overrides; no credentials go in here
terraform init
terraform fmt -check -recursive && terraform validate
terraform plan -out=tfplan
terraform apply tfplan
aws eks update-kubeconfig --region ap-south-1 --name clinicdesk-eks
VALUES=helm/clinicdesk/values-prod.yaml ./scripts/deploy.sh <git-sha>
terraform destroy                               # always, after the demo
```

> Cost: EKS control plane + one NAT gateway + two t3.medium nodes come to roughly USD 0.25–0.30 per hour in ap-south-1. Destroy as soon as the screenshots are taken.

![terraform init + validate](docs/screenshots/23-terraform-init-validate.png)

`terraform plan`: **60 resources to add, 0 errors**. This view is filtered to the resource list; the full plan is in the terminal.

![terraform plan](docs/screenshots/24-terraform-plan.png)

### Apply → verify → destroy

The stack was applied with a dedicated, temporary IAM user (`clinicdesk-capstone`) and torn down right after the screenshots were taken.

`terraform apply`: **60 added**. The EKS control plane took 8m25s and the managed node group 1m28s.

![terraform apply](docs/screenshots/28-terraform-apply.png)

`kubectl` against the new cluster: 2 × t3.medium nodes `Ready` in two AZs, the add-ons running (VPC CNI, CoreDNS, kube-proxy, Pod Identity agent, EBS CSI driver), cluster `ACTIVE`, and 2 public + 2 private subnets:

![EKS nodes and subnets](docs/screenshots/29-eks-cluster-nodes.png)

AWS Console, `ap-south-1`: EKS cluster `clinicdesk-eks` is Active on Kubernetes 1.35.

![AWS console EKS](docs/screenshots/30-aws-console-eks.png)

AWS Console: VPC `clinicdesk-dev-vpc` (`10.42.0.0/16`) and its resource map. It has a public and a private subnet in each of `ap-south-1a` and `ap-south-1b`, plus public and private route tables:

| VPC details | Resource map |
|---|---|
| ![AWS console VPC](docs/screenshots/31-aws-console-vpc.png) | ![VPC resource map](docs/screenshots/31-aws-console-vpc-resource-map.png) |

`terraform destroy`: everything removed, so no AWS resources are left running.

![terraform destroy](docs/screenshots/32-terraform-destroy.png)

---

## 10. M8: Kubernetes + Helm

The cluster used for the screenshots is a local **minikube** with the `ingress` and `metrics-server` add-ons. The same chart targets EKS through `values-prod.yaml` (gp2 storage, more replicas).

```bash
minikube start -p clinicdesk --cpus=4 --memory=5g --addons=ingress --addons=metrics-server
kubectl apply -f k8s/namespace.yaml
./scripts/deploy.sh <git-sha>     # helm upgrade --install clinicdesk ./helm/clinicdesk -f values-dev.yaml --set *.image.tag=<sha>
```

Chart highlights (`helm/clinicdesk`):

- **Workloads:**
  - backend and frontend `Deployment`s with 2 replicas each, rolling updates (`maxUnavailable: 0`), `runAsNonRoot`, all capabilities dropped and resource requests/limits
  - **startup, liveness and readiness probes**: backend on `/health` and `/ready`, frontend on `/nginx-health`
- **Database:** PostgreSQL `StatefulSet` with a `volumeClaimTemplate`. The password is generated once and kept across upgrades via Helm `lookup`.
- **Networking:** `ClusterIP` Services for backend, frontend and Postgres. The `Ingress` (class `nginx`, host `clinicdesk.local`) routes `/api`, `/docs` and `/openapi.json` → backend and `/` → frontend.
- **Scaling and monitoring:** `HorizontalPodAutoscaler`, a `ServiceMonitor`, and the Grafana dashboard as a labelled `ConfigMap`.

| Namespace | Helm install |
|---|---|
| ![namespace](docs/screenshots/07-namespace.png) | ![helm upgrade --install](docs/screenshots/08-helm-install.png) |

`kubectl get pods`: every pod is `Running`.

![kubectl get pods](docs/screenshots/09-kubectl-get-pods.png)

`kubectl get svc` (and their endpoints):

![kubectl get svc](docs/screenshots/10-kubectl-get-svc.png)

`helm list` and release history:

![helm list](docs/screenshots/11-helm-list.png)

Ingress rules:

![ingress](docs/screenshots/12-kubectl-get-ingress.png)

The application through the Ingress hostname `clinicdesk.local`, via `kubectl port-forward` of the ingress-nginx controller to port 8088, because the minikube docker driver on macOS doesn't expose the node IP:

![app via ingress](docs/screenshots/13-app-via-ingress.png)

![swagger via ingress](docs/screenshots/13-swagger-via-ingress.png)

---

## 11. Horizontal Pod Autoscaler

The backend HPA targets 60% CPU (requests are 100m) and scales between 2 and 5 replicas, with a 60s scale-down stabilisation window. `scripts/load-test.sh` starts a busybox pod inside the cluster with 12 parallel workers hitting `/api/appointments/stats`. The HPA went from **2 to 5 replicas** at 144% CPU.

![HPA scaling](docs/screenshots/14-hpa-scaling.png)

---

## 12. M9: Observability (Prometheus + Grafana)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f monitoring/kube-prometheus-stack-values.yaml
```

- **Metrics:** the backend exposes request counts and latency histograms per endpoint, method and status class at `/metrics`.
- **Scraping:** the chart's `ServiceMonitor` tells the Prometheus Operator to scrape every backend pod every 15s. The values file makes Prometheus pick up ServiceMonitors from all namespaces.
- **Dashboard:** the Grafana sidecar loads the `ClinicDesk API` dashboard from a ConfigMap shipped in the Helm chart. Its panels:
  - requests per second, 5xx ratio, p95 latency and ready backend pods
  - requests and p95 latency per endpoint, and responses by status class
  - CPU per backend pod, and HPA current vs desired replicas

`/metrics` output:

![metrics](docs/screenshots/16-metrics-endpoint.png)

Prometheus targets: every backend pod `UP`, including the ones the HPA added:

![prometheus targets](docs/screenshots/17-prometheus-targets.png)

Grafana during the load test (about 300 req/s, 0% errors, the HPA at 5 pods):

![grafana](docs/screenshots/18-grafana-dashboard.png)

---

## 13. Troubleshooting lab

### Drill 1: broken image (`troubleshooting/broken-image.yaml`)

A Deployment points at `clinicdesk-backend:v9.9.9-does-not-exist`.

- **Investigation:** `kubectl get pods` shows `ImagePullBackOff`. `kubectl describe pod` and the events show `Failed to pull image … not found`: the tag was never pushed.
- **Fix:** point the Deployment at a tag that CI actually built (a commit SHA). The rollout then completes.

| Symptom and investigation | Fix |
|---|---|
| ![broken image](docs/screenshots/19-troubleshoot-broken-image.png) | ![fixed](docs/screenshots/20-troubleshoot-broken-image-fixed.png) |

### Drill 2: broken Service (`troubleshooting/broken-service.yaml`)

A Service selects `app=clinicdesk-backned`, which has a typo.

- **Investigation:** requests to it fail with *connection refused*, and its EndpointSlice has no endpoints. Comparing with `kubectl get pods -L app` shows the pods are labelled `app=clinicdesk-backend`.
- **Root cause:** a Service routes only to pods whose labels match its selector. No match means no endpoints, which means no traffic.
- **Fix:** correct the selector. Endpoints appear and `/health` answers.

| Symptom and investigation | Fix |
|---|---|
| ![broken service](docs/screenshots/21-troubleshoot-broken-service.png) | ![fixed](docs/screenshots/22-troubleshoot-broken-service-fixed.png) |

---

## 14. M10: Live demo (commit → pipeline → deployment)

1. Change the app. Here there are two changes:
   - `b3a9ff5`: the Overview subtitle now shows how many patients are still to be seen
   - `6356562`: the sidebar shows short commit SHAs instead of overflowing with the full 40-character one
2. `git commit` and `git push` to `main`.
3. GitHub Actions runs pytest → build → Trivy → push `:<new-sha>` to GHCR ([run 38908916603](https://github.com/tanishkothari9/clinicdesk-devops-capstone/actions/runs/38908916603), [run 38909437524](https://github.com/tanishkothari9/clinicdesk-devops-capstone/actions/runs/38909437524)).
4. `./scripts/deploy.sh <new-sha>` (or the deploy job, when `KUBE_CONFIG_DATA` is set) runs `helm upgrade`. Kubernetes rolls the pods with zero downtime (`maxUnavailable: 0`), and the sidebar shows the new commit. `helm history` shows each revision, so `helm rollback clinicdesk <rev>` can undo a bad release.

| Before (`c8c718e`) | After the pipeline and Helm upgrade (`6356562`) |
|---|---|
| ![before](docs/screenshots/25-demo-before.png) | ![after](docs/screenshots/25-demo-after.png) |

![pipeline + rollout](docs/screenshots/25-demo-pipeline-and-rollout.png)

---

## 15. Submission checklist

| Item | Evidence |
|---|---|
| Application runs via `docker compose up --build` | §6 |
| ≥ 4 REST endpoints, Alembic migration | §3 (`backend/alembic/versions/`) |
| pytest passes, ≥ 5 tests | §4: 22 tests |
| Non-root, multi-stage Dockerfiles | §6 |
| Workflow on push to `main`; pytest, frontend build, both images, GHCR, SHA tags | §7 |
| Trivy in the pipeline, fails on HIGH/CRITICAL; findings explained | §8 |
| `terraform init/validate/plan` | §9 |
| VPC + EKS applied (AWS Console) and `terraform destroy` | §9 |
| Namespace, Helm chart, pods Running, Services, `helm list`, Ingress | §10 |
| HPA | §11 |
| `/metrics`, Prometheus target `UP`, Grafana dashboard | §12 |
| Troubleshooting | §13 |
| README + live demo flow | this file, §14 |

# 📊 Monitoring Stack — Prometheus + Grafana + Alertmanager

Production-ready monitoring stack deployed on AWS EC2 using Docker Compose.
Monitors a live Node.js application with custom metrics, dashboards, and alerting.

---

## 🏗️ Architecture

```
AWS EC2 (Ubuntu 22.04 - t2.micro)
    │
    └── Docker Compose
            ├── Prometheus      :9090   (metrics collection & storage)
            ├── Grafana         :3000   (dashboards & visualization)
            ├── Alertmanager    :9093   (alert routing — Slack/PagerDuty)
            ├── Node Exporter   :9100   (host/EC2 metrics)
            └── Node.js App     :3001   (sample app with custom metrics)
```

---

## ✅ Prerequisites

- AWS Account (Free Tier)
- EC2 Key Pair (.pem file)
- Security Group with these ports open:

| Port | Service |
|------|---------|
| 22 | SSH |
| 3000 | Grafana |
| 9090 | Prometheus |
| 9093 | Alertmanager |
| 9100 | Node Exporter |
| 3001 | Node.js App |

---

## 🚀 Step 1 — Launch EC2 Instance

1. AWS Console → **EC2 → Launch Instance**

| Setting | Value |
|---------|-------|
| Name | `monitoring-stack` |
| AMI | `Ubuntu 22.04 LTS` |
| Instance Type | `t2.micro` (Free Tier) |
| Key Pair | Create new → download .pem |
| Storage | 8 GB |

2. Add inbound rules in Security Group (ports above)
3. Click **Launch Instance**
4. Note down the **Public IP**

---

## 🔐 Step 2 — SSH into EC2

```bash
# Fix key permissions
chmod 400 ~/Downloads/monitoring-key.pem

# SSH into instance
ssh -i ~/Downloads/monitoring-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```

---

## 🐳 Step 3 — Install Docker on EC2

```bash
# Update packages
sudo apt-get update -y

# Install dependencies
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repo
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 📁 Step 4 — Clone the Repo

```bash
git clone https://github.com/devopswithchaitanya/monitoring-stack.git
cd monitoring-stack
ls -la
```

---

## ▶️ Step 5 — Start the Monitoring Stack

```bash
# Start all services
docker compose up -d

# Verify all containers are running
docker compose ps
```

Expected output:
```
NAME            STATUS    PORTS
prometheus      Up        0.0.0.0:9090->9090/tcp
grafana         Up        0.0.0.0:3000->3000/tcp
alertmanager    Up        0.0.0.0:9093->9093/tcp
node-exporter   Up        0.0.0.0:9100->9100/tcp
```

---

## 🌐 Step 6 — Access the UIs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | `http://<EC2-IP>:3000` | admin / admin123 |
| **Prometheus** | `http://<EC2-IP>:9090` | none |
| **Alertmanager** | `http://<EC2-IP>:9093` | none |

---

## 📈 Step 7 — Add Prometheus Data Source in Grafana

1. Open Grafana → `http://<EC2-IP>:3000`
2. Login: `admin` / `admin123`
3. Click **"Add your first data source"**
4. Choose **Prometheus**
5. URL: `http://prometheus:9090`
6. Click **"Save & Test"** → ✅ green

---

## 📊 Step 8 — Import Node Exporter Dashboard

1. Grafana → **"+"** → **Import**
2. Dashboard ID: **`1860`**
3. Click **Load** → Select Prometheus → **Import**

Shows: CPU, Memory, Disk I/O, Network traffic of EC2.

---

## 🚀 Step 9 — Start Node.js App with Custom Metrics

The app is inside `app/` folder with:
- `app.js` — Express app with prom-client metrics
- `Dockerfile` — containerized
- `package.json` — dependencies

```bash
# Build and start the Node.js app
docker compose up -d --build nodejs-app

# Verify it's running
docker compose ps

# Test the app
curl http://localhost:3001

# Check metrics endpoint
curl http://localhost:3001/metrics
```

---

## 📡 Custom Metrics Exposed by the App

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total requests by method, route, status |
| `http_request_duration_seconds` | Histogram | Request duration |
| `active_users` | Gauge | Simulated active users (updates every 5s) |
| `nodejs_heap_size_used_bytes` | Gauge | Node.js memory usage |
| `nodejs_gc_duration_seconds` | Histogram | Garbage collection time |

---

## 🎯 Step 10 — Generate Traffic & Verify Metrics

```bash
# Generate traffic to create real metrics data
for i in {1..20}; do curl -s http://localhost:3001/ > /dev/null; done
for i in {1..10}; do curl -s http://localhost:3001/api/users > /dev/null; done
for i in {1..5}; do curl -s http://localhost:3001/health > /dev/null; done
```

Go to Prometheus → `http://<EC2-IP>:9090` → try these queries:

```promql
# Total requests by route
http_requests_total

# Active users
active_users

# Request rate per second
rate(http_requests_total[5m])

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

---

## 🔄 Step 11 — Reload Prometheus Config

After any config change:
```bash
curl -X POST http://localhost:9090/-/reload
```

Check targets are UP:
```
http://<EC2-IP>:9090/targets
```

Expected:
```
✅ prometheus     — UP
✅ node-exporter  — UP
✅ nodejs-app     — UP
```

---

## 📊 Step 12 — Create Custom Grafana Dashboard

1. Grafana → **Dashboards** → **New** → **New Dashboard**
2. Click **"Add visualization"**
3. Add these 4 panels:

### Panel 1 — HTTP Requests by Route
```promql
sum by(route) (http_requests_total{job="nodejs-app"})
```
Visualization: **Bar Chart** | Title: `HTTP Requests by Route`

### Panel 2 — Active Users
```promql
active_users{job="nodejs-app"}
```
Visualization: **Stat** | Title: `Active Users`

### Panel 3 — Request Rate
```promql
rate(http_requests_total{job="nodejs-app"}[5m])
```
Visualization: **Time series** | Title: `Request Rate`

### Panel 4 — Avg Response Duration
```promql
rate(http_request_duration_seconds_sum{job="nodejs-app"}[5m]) / rate(http_request_duration_seconds_count{job="nodejs-app"}[5m])
```
Visualization: **Time series** | Title: `Avg Response Duration`

4. Save dashboard → Name: `NodeJS App Monitoring`

---

## 🔔 Step 13 — Check Alerts

Alerts defined in `prometheus/alerts.yml`:

| Alert | Condition | Severity |
|-------|-----------|----------|
| `HighCPUUsage` | CPU > 85% for 5min | warning |
| `HighMemoryUsage` | Memory > 85% for 5min | warning |
| `DiskSpaceLow` | Disk > 80% for 10min | critical |
| `PodCrashLooping` | K8s pod restarts > 5 | critical |

Check alerts in Prometheus:
```
http://<EC2-IP>:9090/alerts
```

---

## 🛑 Useful Commands

```bash
# Stop all containers
docker compose down

# Restart a single service
docker compose restart prometheus

# View live logs
docker compose logs -f grafana
docker compose logs -f nodejs-app

# Check resource usage
docker stats

# Rebuild app after code changes
docker compose up -d --build nodejs-app
```

---

## 🗂️ Project Structure

```
monitoring-stack/
├── docker-compose.yml              # All 5 services
├── app/
│   ├── app.js                      # Node.js app with prom-client metrics
│   ├── Dockerfile                  # Multi-stage Docker build
│   └── package.json                # Dependencies (express, prom-client)
├── prometheus/
│   ├── prometheus.yml              # Scrape configs (prometheus, node-exporter, nodejs-app)
│   ├── alerts.yml                  # Alert rules
│   └── alertmanager.yml            # Slack/PagerDuty routing
├── grafana/
│   └── dashboards/                 # Pre-built dashboard JSONs
├── k8s/
│   ├── namespace.yaml              # monitoring namespace
│   ├── prometheus-deployment.yaml  # Prometheus on K8s
│   └── grafana-deployment.yaml     # Grafana on K8s
└── README.md
```

---

## 🧹 Cleanup (Avoid AWS Charges)

```bash
# Stop containers
docker compose down

# Exit EC2
exit
```

AWS Console → EC2 → Select instance → **Stop or Terminate**

---

## 💡 Interview Talking Points

> *"I deployed a full observability stack on AWS EC2 using Docker Compose with
> Prometheus, Grafana, Alertmanager, and Node Exporter. I wrote a Node.js
> application using prom-client to expose custom metrics — HTTP request counts,
> response durations, and active users. I configured Prometheus to scrape the
> app every 15 seconds, verified all targets were UP, and built custom Grafana
> dashboards to visualize the metrics. I also configured alert rules for CPU,
> memory, and disk thresholds with Alertmanager routing to Slack."*

---

## Tech Stack
`Prometheus` `Grafana` `Alertmanager` `Node Exporter` `Docker Compose` `AWS EC2` `Node.js` `prom-client` `Ubuntu 22.04`

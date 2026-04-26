# 🎯 Interview Prep — Monitoring Stack
## Prometheus + Grafana + Alertmanager + Node Exporter

---

## 📌 SECTION 1 — Prometheus

### Q1. What is Prometheus and how does it work?
**Answer:**
Prometheus is an open-source monitoring and alerting toolkit. It works on a **pull model** — meaning Prometheus scrapes metrics from targets at regular intervals (every 15s by default).

```
Target (app/node) exposes /metrics
        ↑
Prometheus scrapes every 15s
        ↓
Stores in Time Series DB (TSDB)
        ↓
Grafana queries & visualizes
```

---

### Q2. What is the difference between Pull vs Push model?

| Pull (Prometheus) | Push (Graphite, InfluxDB) |
|-------------------|--------------------------|
| Prometheus scrapes targets | Targets push metrics to server |
| Easier to detect if target is down | Target controls when to send |
| Better for dynamic environments | Good for short-lived jobs |

> Prometheus uses **Pushgateway** for short-lived jobs that can't be scraped.

---

### Q3. What are the metric types in Prometheus?

| Type | Description | Example |
|------|-------------|---------|
| **Counter** | Only increases, never decreases | `http_requests_total` |
| **Gauge** | Can go up and down | `active_users`, memory usage |
| **Histogram** | Samples observations in buckets | `http_request_duration_seconds` |
| **Summary** | Similar to histogram, calculates quantiles | response time percentiles |

---

### Q4. What is PromQL? Give examples.

PromQL is Prometheus Query Language used to query time series data.

```promql
# Simple metric
http_requests_total

# Filter by label
http_requests_total{job="nodejs-app", status="200"}

# Rate — requests per second over last 5 min
rate(http_requests_total[5m])

# Sum by route
sum by(route) (http_requests_total)

# CPU usage percentage
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

---

### Q5. What is a scrape interval and evaluation interval?

```yaml
global:
  scrape_interval: 15s      # How often Prometheus scrapes targets
  evaluation_interval: 15s  # How often alert rules are evaluated
```

---

### Q6. What is the prometheus.yml file?
It's the main config file with:
- `global` — default intervals
- `alerting` — alertmanager connection
- `rule_files` — alert rule files
- `scrape_configs` — list of targets to scrape

---

### Q7. How do you reload Prometheus config without restart?
```bash
curl -X POST http://localhost:9090/-/reload
```
This requires `--web.enable-lifecycle` flag when starting Prometheus.

---

### Q8. What is Node Exporter?
Node Exporter is a Prometheus exporter that exposes **host-level metrics** like:
- CPU usage
- Memory usage
- Disk I/O
- Network traffic
- Filesystem usage

It runs as a container/service and exposes metrics at `:9100/metrics`

---

### Q9. What are Prometheus labels?
Labels are key-value pairs that identify time series data.

```
http_requests_total{method="GET", route="/", status="200"} 21
                    ↑ these are labels
```

Labels allow filtering and grouping of metrics.

---

### Q10. What is a target in Prometheus?
A target is an endpoint that Prometheus scrapes for metrics.

In our project:
```
✅ prometheus     → localhost:9090
✅ node-exporter  → node-exporter:9100
✅ nodejs-app     → nodejs-app:3001
```

---

## 📌 SECTION 2 — Grafana

### Q11. What is Grafana?
Grafana is an open-source visualization tool that connects to data sources like Prometheus and displays metrics as dashboards and graphs.

---

### Q12. What is a Data Source in Grafana?
A data source is the backend where Grafana fetches data from. In our case — **Prometheus** is the data source.

```
Grafana → queries → Prometheus → returns metrics → Grafana visualizes
```

---

### Q13. What types of visualizations does Grafana support?
- Time series (line/area charts)
- Bar chart
- Stat (single value)
- Gauge
- Table
- Heatmap
- Logs panel

---

### Q14. What is a Grafana dashboard?
A dashboard is a collection of panels. Each panel shows one metric/query.

In our project we used:
- **Dashboard 1860** — Node Exporter Full (host metrics)
- **Custom dashboard** — NodeJS App Monitoring

---

### Q15. How do you import a dashboard in Grafana?
1. Left sidebar → **Dashboards → Import**
2. Enter Dashboard ID (e.g. `1860`)
3. Click Load → Select data source → Import

Dashboard IDs come from **grafana.com/grafana/dashboards**

---

## 📌 SECTION 3 — Alertmanager

### Q16. What is Alertmanager?
Alertmanager handles alerts sent by Prometheus. It:
- Deduplicates alerts
- Groups related alerts
- Routes to correct receiver (Slack, PagerDuty, Email)
- Silences alerts

---

### Q17. What is the difference between Prometheus alerts and Alertmanager?

| Prometheus | Alertmanager |
|------------|-------------|
| Defines alert rules | Handles fired alerts |
| Evaluates conditions | Routes to Slack/PagerDuty |
| Fires alerts when condition is true | Deduplicates & groups |

---

### Q18. Explain the alert lifecycle in Prometheus.

```
Rule defined in alerts.yml
        ↓
Prometheus evaluates every 15s
        ↓
Condition true → state: PENDING
        ↓
Condition true for "for" duration → state: FIRING
        ↓
Alert sent to Alertmanager
        ↓
Alertmanager routes to Slack/PagerDuty
```

---

### Q19. What is the "for" field in alert rules?
```yaml
- alert: HighCPUUsage
  expr: cpu_usage > 85
  for: 5m        # ← must be true for 5 minutes before firing
```
This prevents false alarms from brief spikes.

---

### Q20. What are alert severities?
```yaml
labels:
  severity: warning   # non-critical
  severity: critical  # needs immediate action
```
Alertmanager routes different severities to different receivers.

---

## 📌 SECTION 4 — Node.js App + prom-client

### Q21. What is prom-client?
`prom-client` is a Node.js library to expose custom Prometheus metrics from your application.

```javascript
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register }); // CPU, memory, GC
```

---

### Q22. What custom metrics did you add?

```javascript
// Counter — total requests (only goes up)
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  labelNames: ['method', 'route', 'status']
});

// Histogram — request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Gauge — active users (goes up and down)
const activeUsers = new client.Gauge({
  name: 'active_users'
});
```

---

### Q23. How does Prometheus scrape your Node.js app?
The app exposes a `/metrics` endpoint:
```javascript
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

Prometheus config:
```yaml
- job_name: 'nodejs-app'
  static_configs:
    - targets: ['nodejs-app:3001']
  metrics_path: /metrics
```

---

## 📌 SECTION 5 — Docker Compose

### Q24. Why did you use Docker Compose for this project?
Docker Compose allows running multiple containers as a single stack with one command. All services share the same network and can communicate by container name.

```bash
docker compose up -d    # start all
docker compose down     # stop all
docker compose ps       # check status
docker compose logs -f  # view logs
```

---

### Q25. How do containers communicate in Docker Compose?
All services in docker-compose.yml on the same network can reach each other by **service name**.

Example:
- Prometheus reaches Alertmanager at `alertmanager:9093`
- Prometheus reaches Node.js app at `nodejs-app:3001`
- Grafana reaches Prometheus at `prometheus:9090`

---

## 📌 SECTION 6 — Scenario Based Questions

### Q26. Production went down. CPU alert fired. Walk me through your response.

> "First I check Alertmanager to see what alert fired and its severity.
> Then I go to Grafana and open the Node Exporter dashboard to see the CPU
> spike timeline. I use Prometheus to query `rate(node_cpu_seconds_total[5m])`
> to identify which process is consuming CPU. I SSH into the server, run
> `top` or `htop` to find the culprit process, and take action — restart,
> scale, or rollback depending on the root cause."

---

### Q27. How would you monitor 50 microservices?
> "I would use Kubernetes service discovery in Prometheus instead of static
> configs. With `kubernetes_sd_configs`, Prometheus automatically discovers
> all pods annotated with `prometheus.io/scrape: true`. This way adding a
> new microservice just requires adding the annotation — no Prometheus config
> change needed."

---

### Q28. What is the difference between monitoring and observability?

| Monitoring | Observability |
|------------|---------------|
| Watching known metrics | Understanding unknown failures |
| Alerts on thresholds | Ask new questions about system |
| Dashboard based | Metrics + Logs + Traces (3 pillars) |

The **3 pillars of observability:**
- **Metrics** — Prometheus/Grafana
- **Logs** — ELK/EFK Stack
- **Traces** — Jaeger/Zipkin

---

### Q29. How do you prevent alert fatigue?
> "By grouping related alerts in Alertmanager, setting appropriate `for`
> durations to avoid false alarms, using severity levels to route only
> critical alerts to PagerDuty and warnings to Slack, and silencing
> known maintenance windows."

---

### Q30. What would you improve in this monitoring setup?
> "I would add:
> 1. **Persistent storage** for Prometheus data (currently in-memory)
> 2. **Loki** for log aggregation alongside metrics
> 3. **Tempo** for distributed tracing
> 4. **Grafana alerting** directly instead of separate Alertmanager
> 5. **Service discovery** instead of static configs for dynamic environments"

---

## 📌 Quick Reference — Commands

```bash
# Start stack
docker compose up -d

# Check targets
curl http://localhost:9090/targets

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload

# Check app metrics
curl http://localhost:3001/metrics

# Generate traffic
for i in {1..20}; do curl -s http://localhost:3001/; done

# View logs
docker compose logs -f prometheus

# Stop stack
docker compose down
```

---

## 📌 Quick Reference — PromQL Cheat Sheet

```promql
# CPU usage %
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage %
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage %
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100

# HTTP request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# 99th percentile response time
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Active users
active_users
```

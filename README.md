# 📊 Monitoring Stack — Prometheus + Grafana + Alertmanager

Production-ready monitoring stack for Kubernetes and Docker environments. Includes Prometheus scraping, Grafana dashboards, and Alertmanager for PagerDuty/Slack alerting.

## Stack

| Component | Purpose |
|-----------|---------|
| Prometheus | Metrics collection & storage |
| Grafana | Visualization & dashboards |
| Alertmanager | Alert routing (Slack, PagerDuty) |
| Node Exporter | Host-level metrics |
| kube-state-metrics | Kubernetes object metrics |

## Quick Start (Docker Compose)

```bash
docker-compose up -d
# Grafana: http://localhost:3000  (admin/admin)
# Prometheus: http://localhost:9090
# Alertmanager: http://localhost:9093
```

## Kubernetes Deploy

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

## Alerting

Alerts are configured in `prometheus/alerts.yml` and routed via `prometheus/alertmanager.yml`.

Supported receivers:
- Slack (`#alerts` channel)
- PagerDuty (critical severity)

## Tech Stack
`Prometheus` `Grafana` `Alertmanager` `Docker Compose` `Kubernetes` `Node Exporter`

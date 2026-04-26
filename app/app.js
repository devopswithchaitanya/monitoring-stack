const express = require('express');
const client = require('prom-client');

const app = express();

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of active users',
  registers: [register]
});

// Simulate active users
setInterval(() => {
  activeUsers.set(Math.floor(Math.random() * 100));
}, 5000);

// Middleware to track requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });
    httpRequestDuration.observe(
      { method: req.method, route: req.path },
      duration
    );
  });
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from monitored app!', timestamp: new Date() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/api/users', (req, res) => {
  res.json({ users: ['Alice', 'Bob', 'Charlie'] });
});

// Metrics endpoint — Prometheus scrapes this
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3001, () => {
  console.log('App running on port 3001');
  console.log('Metrics available at http://localhost:3001/metrics');
});

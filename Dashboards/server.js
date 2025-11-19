//
// MCP Dashboard Backend (FINAL VERSION)
// --------------------------------------
// Features:
//  - Serves static dashboard UI from /public
//  - Stores recent MCP/AI events in memory
//  - Exposes /api/events (GET/POST)
//  - Exposes /metrics for Prometheus scraping
//  - Pulls CPU metrics from Prometheus via /api/metrics
//  - Watches Kubernetes deployment state
//

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const k8s = require('@kubernetes/client-node');
const axios = require('axios');
const path = require('path');
const promClient = require('prom-client');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Environment
const PORT = process.env.PORT || 3000;
const TARGET_NAMESPACE = process.env.TARGET_NAMESPACE || "default";
const TARGET_DEPLOYMENT = process.env.TARGET_DEPLOYMENT || "sample-app";
const PROM_ENDPOINT = process.env.PROM_ENDPOINT ||
  "http://prometheus-operated.monitoring.svc.cluster.local:9090";

// ----------------------------
//  Event Store
// ----------------------------
let eventStore = [];

// Register Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const eventCounter = new promClient.Counter({
  name: "mcp_events_total",
  help: "Total number of MCP/AI events received",
  labelNames: ["type"]
});

register.registerMetric(eventCounter);

// Helper to push events
function pushEvent(evt) {
  evt.ts = new Date().toISOString();
  if (!evt.type) evt.type = "unknown";
  if (!evt.message) evt.message = JSON.stringify(evt);

  eventStore.unshift(evt);
  if (eventStore.length > 200) eventStore.pop();

  // increment Prometheus counter
  eventCounter.inc({ type: evt.type });
}

// ----------------------------
// Serve Dashboard UI
// ----------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------
// Event API
// ----------------------------
app.post('/api/events', (req, res) => {
  const evt = req.body || {};
  pushEvent(evt);
  res.json({ ok: true });
});

app.get('/api/events', (req, res) => {
  res.json(eventStore.slice(0, 50));
});

// ----------------------------
// Kubernetes Deployment Polling
// ----------------------------
async function startKubeWatch() {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromCluster();
    const k8sApi = kc.makeApiClient(k8s.AppsV1Api);

    setInterval(async () => {
      try {
        const d = await k8sApi.readNamespacedDeployment(TARGET_DEPLOYMENT, TARGET_NAMESPACE);
        const replicas = d.body.status?.replicas ?? 0;
        const available = d.body.status?.availableReplicas ?? 0;

        pushEvent({
          type: "deploy-status",
          source: "kube",
          deployment: TARGET_DEPLOYMENT,
          replicas,
          available
        });
      } catch (e) {
        // ignore errors silently
      }
    }, 15000);

  } catch (err) {
    console.error("Kube watch failed:", err.message);
  }
}

startKubeWatch();

// ----------------------------
// Runtime CPU metrics from Prometheus
// ----------------------------
app.get('/api/metrics', async (req, res) => {
  try {
    const query = `sum(rate(container_cpu_usage_seconds_total{namespace="${TARGET_NAMESPACE}",pod=~"${TARGET_DEPLOYMENT}.*"}[1m]))`;
    const r = await axios.get(`${PROM_ENDPOINT}/api/v1/query`, { params: { query }, timeout: 5000 });
    const value = r.data?.data?.result?.[0]?.value?.[1] || "0";

    res.json({ cpu: parseFloat(value) });
  } catch (err) {
    res.json({ cpu: 0, error: "prometheus_unavailable" });
  }
});

// ----------------------------
// Prometheus Scrape Endpoint
// ----------------------------
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// ----------------------------
app.listen(PORT, () => {
  console.log(`MCP Dashboard running on port ${PORT}`);
});

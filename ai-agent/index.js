const axios = require('axios');
const k8s = require('@kubernetes/client-node');

const PROM_URL = process.env.PROM_ENDPOINT || 'http://prometheus-operated.monitoring.svc.cluster.local:9090';
const AI_API = process.env.AI_API_URL;
const AI_KEY = process.env.CLAUDE_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet';
const TARGET_DEPLOYMENT = process.env.TARGET_DEPLOYMENT || 'sample-app';
const TARGET_NAMESPACE = process.env.TARGET_NAMESPACE || 'default';
const POLL_MS = (parseInt(process.env.POLL_SEC || '30',10) * 1000);
const COOLDOWN_MS = (parseInt(process.env.COOLDOWN_SEC || '120',10) * 1000);
const MAX_REPLICAS = parseInt(process.env.MAX_REPLICAS || '10',10);
const MIN_REPLICAS = parseInt(process.env.MIN_REPLICAS || '1',10);

const kc = new k8s.KubeConfig();
kc.loadFromCluster();
const appsApi = kc.makeApiClient(k8s.AppsV1Api);

function log(...args){ console.log(new Date().toISOString(), ...args); }

async function queryProm(query){
  try {
    const res = await axios.get(`${PROM_URL}/api/v1/query`, { params: { query }, timeout: 8000 });
    if(res.data.status !== 'success') return null;
    return res.data.data.result;
  } catch(e) {
    log('Prometheus query error', e.message || e);
    return null;
  }
}

async function getReplicas(){
  const res = await appsApi.readNamespacedDeployment(TARGET_DEPLOYMENT, TARGET_NAMESPACE);
  return res.body.spec.replicas || 1;
}

async function patchReplicas(n){
  if(n < MIN_REPLICAS) n = MIN_REPLICAS;
  if(n > MAX_REPLICAS) n = MAX_REPLICAS;
  const patch = [{ op: 'replace', path: '/spec/replicas', value: n }];
  await appsApi.patchNamespacedDeployment(TARGET_DEPLOYMENT, TARGET_NAMESPACE, patch, undefined, undefined, undefined, undefined, { headers: { 'Content-Type': 'application/json-patch+json' }});
  log('Patched replicas to', n);
}

// Build a strict prompt that asks for JSON only
function buildPrompt(context){
  return `You are a Kubernetes autoscaling assistant. Return ONLY a valid JSON object matching this schema:
{
  "action": "scale" | "noop" | "restart",
  "replicas": integer|null,
  "reason": string,
  "confidence": number
}
Context: ${JSON.stringify(context)}
Rules:
- If "scale", replicas must be between ${MIN_REPLICAS} and ${MAX_REPLICAS}.
- If unsure, return {"action":"noop","replicas":null,"reason":"uncertain","confidence":0}.
Respond with JSON only, no explanation.`;
}

async function callClaude(prompt){
  if(!AI_API || !AI_KEY) throw new Error('AI_API or AI_KEY not set');

  // Generic POST. You MUST set AI_API to the Anthropic endpoint you have access to.
  const payload = {
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300
  };

  const res = await axios.post(AI_API, payload, {
    headers: { 'Content-Type': 'application/json', 'x-api-key': AI_KEY },
    timeout: 20000
  });

  // Try to extract text. The exact path depends on the Anthropic endpoint you use.
  // Typical: res.data.choices[0].message.content or res.data.completion
  const text = res.data?.choices?.[0]?.message?.content || res.data?.completion || JSON.stringify(res.data);
  return text;
}

let lastActionTs = 0;

async function mainLoop(){
  while(true){
    try{
      const currentReplicas = await getReplicas();
      const cpuQuery = `sum(rate(container_cpu_usage_seconds_total{namespace="${TARGET_NAMESPACE}", pod=~"${TARGET_DEPLOYMENT}.*"}[1m]))`;
      const cpuRes = await queryProm(cpuQuery);
      const cpuVal = cpuRes?.[0]?.value?.[1] ? parseFloat(cpuRes[0].value[1]) : 0;

      const ctx = { time: (new Date()).toISOString(), deployment: TARGET_DEPLOYMENT, namespace: TARGET_NAMESPACE, currentReplicas, cpu: cpuVal };

      log('Context:', ctx);

      if(Date.now() - lastActionTs < COOLDOWN_MS){
        log('Cooldown active; skipping');
      } else {
        const prompt = buildPrompt(ctx);
        const raw = await callClaude(prompt);
        log('Raw response from Claude:', raw);

        let decision;
        try {
          decision = JSON.parse(raw);
        } catch(e) {
          log('Failed to parse JSON from Claude; skipping action');
          decision = { action: 'noop', replicas: null, reason: 'bad-json', confidence: 0.0 };
        }

        if(decision.action === 'scale' && Number.isInteger(decision.replicas)){
          await patchReplicas(decision.replicas);
          lastActionTs = Date.now();
          log('AI action executed', decision);
        } else if(decision.action === 'restart'){
          const body = [{ op: 'add', path: '/spec/template/metadata/annotations/ai-restart-ts', value: new Date().toISOString() }];
          await appsApi.patchNamespacedDeployment(TARGET_DEPLOYMENT, TARGET_NAMESPACE, body, undefined, undefined, undefined, undefined, { headers: { 'Content-Type': 'application/json-patch+json' }});
          lastActionTs = Date.now();
          log('Restart executed by AI');
        } else {
          log('AI decision: noop', decision.reason);
        }
      }

    } catch(err){
      log('Loop error', err?.response?.data || err?.message || err);
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }
}

mainLoop().catch(e => { console.error(e); process.exit(1); });

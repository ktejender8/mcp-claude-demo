# MCP + Claude Autoscaling Demo for AKS

This repo deploys:
- Prometheus + Grafana (via Helm) (optional but recommended)
- sample-app (CPU-stressable service)
- load generator (job)
- ai-agent (NodeJS) that queries Prometheus, calls Claude, and patches deployments
- mcp/kubernetes container included in the pod for demonstration (optional)

**IMPORTANT**: You must provide:
- A container registry (Docker Hub or ACR) and set `REGISTRY` in scripts
- Anthropic / Claude API key

Follow the "Serial Runbook" in this README to run end-to-end.


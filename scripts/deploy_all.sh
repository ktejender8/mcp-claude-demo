#!/usr/bin/env bash
set -euo pipefail

REGISTRY=${1:-"<your-registry>"}
TAG=${2:-"v1"}
CLAUDE_KEY=${3:-"<replace-with-claude-key>"}

echo "Create namespace"
kubectl apply -f k8s/namespace.yaml

echo "Create secret for Claude"
kubectl create secret generic claude-secret \
  --from-literal=apiKey="${CLAUDE_KEY}" -n default --dry-run=client -o yaml | kubectl apply -f -

echo "Apply RBAC for agent"
kubectl apply -f k8s/ai-agent-rbac.yaml

echo "Deploy sample app (update image with registry)"
sed "s|<REGISTRY>|${REGISTRY}|g; s|<TAG>|${TAG}|g" k8s/sample-app-deploy.yaml | kubectl apply -f -

echo "Deploy HPA (for comparison)"
kubectl apply -f k8s/sample-app-hpa.yaml

echo "Deploy MCP + ai-agent (substitute images)"
sed "s|<REGISTRY>|${REGISTRY}|g; s|<TAG>|${TAG}|g" k8s/mcp-with-agent.yaml | kubectl apply -f -

echo "Done."

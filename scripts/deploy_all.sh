#!/bin/bash
set -e
export REGISTRY=${REGISTRY:-test12311.azurecr.io}
export TAG=${TAG:-v1}
export CLAUDE_KEY=${CLAUDE_KEY:-<your-claude-api-key>}

echo "🔐 Creating Claude secret..."
kubectl delete secret claude-secret --ignore-not-found
kubectl create secret generic claude-secret --from-literal=apiKey=${CLAUDE_KEY}

echo "📦 Deploying components..."
for file in ./k8s/*.yaml; do
  sed "s|<REGISTRY>|${REGISTRY}|g; s|<TAG>|${TAG}|g" $file | kubectl apply -f -
done

echo "⏳ Waiting for deployments..."
kubectl wait --for=condition=available deployment --all --timeout=180s

kubectl get pods -o wide
kubectl get svc -o wide

echo "🎉 Done! Forward dashboard with:"
echo "kubectl port-forward svc/mcp-dashboard 8080:80"
echo "Open http://localhost:8080"

#!/bin/bash
set -e

echo "🔧 Building images..."
docker build -t ${REGISTRY}/sample-app:${TAG} ./sample-app
docker push ${REGISTRY}/sample-app:${TAG}

docker build -t ${REGISTRY}/ai-agent:${TAG} ./ai-agent
docker push ${REGISTRY}/ai-agent:${TAG}

echo "✅ Build and push complete!"

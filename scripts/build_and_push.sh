#!/usr/bin/env bash
set -euo pipefail

# Usage: ./build_and_push.sh <registry> <tag>
REGISTRY=${1:-"<your-registry>"}   # e.g. myacr.azurecr.io or dockerhubuser
TAG=${2:-"v1"}

echo "Building and pushing sample-app..."
docker build -t ${REGISTRY}/sample-app:${TAG} ./sample-app
docker push ${REGISTRY}/sample-app:${TAG}

echo "Building and pushing ai-agent..."
docker build -t ${REGISTRY}/ai-agent:${TAG} ./ai-agent
docker push ${REGISTRY}/ai-agent:${TAG}

echo "Done. Images:"
echo " - ${REGISTRY}/sample-app:${TAG}"
echo " - ${REGISTRY}/ai-agent:${TAG}"

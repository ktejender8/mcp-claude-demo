# mcp-kubernetes/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Add minimal package.json
COPY package.json ./
RUN npm install --production || true

COPY server.js ./

# Keep container alive (replace sleep with actual MCP server later)
CMD ["/bin/sh", "-c", "sleep 3600"]

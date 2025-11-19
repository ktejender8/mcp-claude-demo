# Dashboard Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy dependencies
COPY package.json package-lock.json* ./

RUN npm install --production

# Copy the server and static assets
COPY server.js ./
COPY public ./public

# Expose dashboard port
EXPOSE 3000

CMD ["node", "server.js"]

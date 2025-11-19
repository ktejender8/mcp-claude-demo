FROM node:18-alpine

WORKDIR /app

# Copy package.json + package-lock first (important for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

EXPOSE 8080

CMD ["node", "index.js"]

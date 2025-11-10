FROM node:18-alpine
WORKDIR /app
COPY server.js .
RUN npm init -y && npm i express
EXPOSE 3000
CMD ["node","server.js"]

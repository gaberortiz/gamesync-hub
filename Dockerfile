# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

# Copy root and client package definitions
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build client
RUN npm run build

# Expose server port
EXPOSE 4000
ENV PORT=4000
ENV NODE_ENV=production

# Start server
CMD ["node", "server/server.js"]

FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json* ./
RUN npm install --production --no-audit --no-fund

# Copy source
COPY . .

# Expose port used by the app
EXPOSE 3000

# Use non-root user where possible
RUN addgroup -S appgroup && adduser -S appuser -G appgroup || true
USER appuser

# Start the server directly with node to avoid unsupported flags
CMD ["node", "src/server.js"]

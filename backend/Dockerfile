FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install Chromium for server-side PDF generation.
# Alpine v3.21 ships Chromium 136, which produces different PDF font embedding.
# Use edge community to get the newer Chromium build used by the working PDF.
RUN printf '%s\n' \
    'https://dl-cdn.alpinelinux.org/alpine/v3.21/main' \
    'https://dl-cdn.alpinelinux.org/alpine/v3.21/community' \
    'https://dl-cdn.alpinelinux.org/alpine/edge/main' \
    'https://dl-cdn.alpinelinux.org/alpine/edge/community' \
    > /etc/apk/repositories \
  && apk add --no-cache chromium nss freetype harfbuzz ttf-dejavu

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

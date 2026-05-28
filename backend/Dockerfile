FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install Chromium and the Microsoft core fonts used by the PDF template.
# Alpine v3.21 ships Chromium 136, so we use edge community for Chromium 148.
RUN printf '%s\n' \
    'https://dl-cdn.alpinelinux.org/alpine/v3.21/main' \
    'https://dl-cdn.alpinelinux.org/alpine/v3.21/community' \
    'https://dl-cdn.alpinelinux.org/alpine/edge/main' \
    'https://dl-cdn.alpinelinux.org/alpine/edge/community' \
    > /etc/apk/repositories \
  && apk add --no-cache chromium nss freetype harfbuzz fontconfig msttcorefonts-installer \
  && update-ms-fonts \
  && fc-cache -f

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

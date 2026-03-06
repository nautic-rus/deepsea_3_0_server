FROM node:18-alpine

WORKDIR /app

# Install dependencies first (use package.json from repo)
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

EXPOSE 3000

CMD ["npm", "start"]

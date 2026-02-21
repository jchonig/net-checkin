FROM node:20-bookworm

WORKDIR /app

# Install dependencies first (cached unless package*.json changes)
COPY package*.json ./
RUN npm ci

# Install Chromium and its OS-level dependencies
# This always installs the exact browser revision the npm package expects
RUN npx playwright install --with-deps chromium

COPY . .

CMD ["npx", "playwright", "test"]

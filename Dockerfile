# -----------------------------
# Stage 1 – Builder
# -----------------------------
FROM node:20-alpine AS builder

# Install build tools
RUN apk add --no-cache bash python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy the full project
COPY . .

# Build TypeScript
RUN npx tsc -p tsconfig.json


# -----------------------------
# Stage 2 – Runtime
# -----------------------------
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy compiled output
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin

EXPOSE 3000

CMD ["node", "dist/index.js", "--mode=api"]

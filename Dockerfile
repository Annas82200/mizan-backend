# AGENT_CONTEXT_ULTIMATE.md Compliance: Node 20+ required (Line 810)
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application (if needed)
# RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npx", "tsx", "index.ts"]

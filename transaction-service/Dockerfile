# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk update --no-check-certificate && apk add --no-cache --no-check-certificate \
    postgresql-client \
    curl

# Copy package files
COPY package*.json ./

# Configure npm for SSL certificate issues
RUN npm config set strict-ssl false && \
    npm config set registry https://registry.npmjs.org/

# Install Node.js dependencies
RUN npm install --omit=dev && npm cache clean --force

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# Start the application
CMD ["npm", "start"]
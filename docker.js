# Use official Node LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Create session dir
RUN mkdir -p /usr/src/app/session

# Expose port if web UI used (optional)
EXPOSE 3000

# Start the bot
CMD [ "node", "index.js" ]
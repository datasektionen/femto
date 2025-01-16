# Use Node.js base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app code to the container
COPY . .

# Build the TypeScript code into JavaScript
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Run the app using the built JavaScript
CMD ["node", "dist/index.js"]

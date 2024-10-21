# Use the pre-built image with both Node.js and Python
FROM nikolaik/python-nodejs:python3.13-nodejs20

# # Set the working directory for the app
# WORKDIR /usr/src/app
# 
# ### API SETUP ###
# # Copy package.json and package-lock.json
# COPY veridion-api/package*.json ./
# 
# # Install app dependencies
# RUN npm ci --loglevel verbose
# 
# # Bundle app source
# COPY veridion-api/. .
# 
# # Build the TypeScript files
# RUN npm run build
# 
# # Install PM2 globally
# RUN npm install -g pm2
# 
# # Expose port 3000
# EXPOSE 3000
# 
# ### PYTHON ###
# 
# # Install Python dependencies
# RUN pip install -r /usr/src/app/scripts/requirements.txt
# 
# # Start the app
# CMD npm run start && pm2 logs
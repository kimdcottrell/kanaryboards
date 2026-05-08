# the official image is weirdly buggy and unpredictable.
FROM node:25-trixie

# NOTES:
# - you need to setup the ssh stuff, playwright malfunctions without it
# - import the package.json so playwright stuff installs at the right version
# - we only need some packages: npm install @playwright/test typescript --no-save
# - install the damn browsers: npx playwright install
# - certain flags should be emphasized: ENV CI=true
# - things should now be runnable: npx playwright test 
# - you may need: PW_DISABLE_TS_ESM=true

# Set the working directory 
WORKDIR /usr/src/app 

# Copy package.json and package-lock.json (if available) 
COPY package*.json ./ 

# Install dependencies 
RUN npm install @playwright/test typescript --no-save

# Copy the rest of the application
COPY tests /usr/src/app/tests
COPY playwright.config.ts /usr/src/app/playwright.config.ts
COPY images/playwright-trigger.js /usr/src/app/trigger-server.js

# Install Playwright browsers 
RUN npx playwright install chromium firefox webkit --with-deps

# Set the environment to use the right display drivers 
ENV CI=true 
 
# Traefik IP must be added to the /etc/hosts file in order for all 
#   playwright browsers to be able to hit kanary.local.dev
CMD ["sh", "-c", "echo \"$(getent hosts traefik | awk '{print $1}') kanary.local.dev\" >> /etc/hosts && node /usr/src/app/trigger-server.js"]

# docker build -f images/playwright.Dockerfile -t pw .
# docker run -i --rm --init pw bash
# curl -k --resolve kanary.local.dev:443:$(getent hosts traefik | awk '{print $1}') 


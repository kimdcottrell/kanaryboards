# the official image is weirdly buggy and unpredictable.
FROM node:25-trixie

ARG LOCAL_MACHINE_GID=${LOCAL_MACHINE_GID:-984}
ARG LOCAL_MACHINE_UID=${LOCAL_MACHINE_UID:-1000}

RUN groupmod -g ${LOCAL_MACHINE_GID} node; \
    usermod -u ${LOCAL_MACHINE_UID} -g ${LOCAL_MACHINE_GID} node;

# gosu is used in the entrypoint to drop from root to node after writing /etc/hosts
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    sudo \
    xvfb \
    x11-apps \
    && rm -rf /var/lib/apt/lists/*;

RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

COPY images/playwright/entrypoint.sh /usr/local/bin/entrypoint.sh 
RUN chmod +x /usr/local/bin/entrypoint.sh

# Fix ownership so the node user can access everything it needs
RUN mkdir -p /usr/src/app; \
    chown -R node:node /usr/src/app

# Set the working directory
WORKDIR /usr/src/app 

USER node

# Copy package.json and package-lock.json (if available) 
COPY package*.json ./ 

# Required to add in JSR packages
RUN npm config set @jsr:registry https://npm.jsr.io --location=project

# Install dependencies 
RUN npm install @playwright/test typescript --no-save

# sudo is installed specifically for this command, 
#   as deps must be installed by a root-level user
RUN npx playwright install chromium firefox webkit --with-deps

# Copy the rest of the application
COPY tests /usr/src/app/tests
COPY playwright.config.ts /usr/src/app/playwright.config.ts

# Set the environment to use the right display drivers
ENV CI=true

# The build completes by the time the entrypoint is ran, 
#   so we can modify /etc/hosts since it now exists.
#   We will swap to root for this.
#   gosu is used to drop back down into node before CMD
USER root
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

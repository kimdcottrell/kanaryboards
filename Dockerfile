# syntax=docker/dockerfile:1
FROM denoland/deno:2.7.13 as dev 

# Prefer not to run as root.
ARG LOCAL_MACHINE_GID=${LOCAL_MACHINE_GID:-1000}
ARG LOCAL_MACHINE_UID=${LOCAL_MACHINE_UID:-1000}
RUN groupmod -g ${LOCAL_MACHINE_GID} deno; \
    usermod -u ${LOCAL_MACHINE_UID} -g ${LOCAL_MACHINE_GID} deno;

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get upgrade && apt-get update && apt-get --no-install-recommends install -y \
        git \
        tzdata \
        curl \
        sudo \
        iptables \
        ipset \
        iproute2 \
        dnsutils \
        openssl \
        openssh-client \
        ca-certificates \
        jq \
        aggregate \
        && \
        apt-get clean && rm -rf /var/lib/apt/lists/*; \
    git config --global --add safe.directory /var/dev

SHELL ["/bin/bash", "-c"]

# Setup VSCode specific things
COPY .devcontainer/init-firewall.sh /usr/local/bin/init-firewall.sh
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "deno ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/deno-firewall && \
  chmod 0440 /etc/sudoers.d/deno-firewall; \
  # now fix a problem with the claude executable when in the terminal of vscode \
  mkdir -p /home/deno && touch /home/deno/.claude.json;

# fix all the permissions issues for deno
RUN mkdir -p /var/dev /home/.deno/bin; \
    chown -R deno:deno /home; \
    chown -R deno:deno /var/dev; \
    chown -R deno:deno /deno-dir; \
    chown -R deno:deno /tmp; \
    chown -R deno:deno /usr/local/bin;

# scripts that require node in the shebang of /usr/env/bin/ need this
RUN ln -s /usr/bin/deno /usr/bin/node

USER deno

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deno.json will download and compile _all_ external files used in main.ts.
COPY ./deno.jsonc .

RUN --mount=type=cache,target=${DENO_DIR},uid=${LOCAL_MACHINE_UID},gid=${LOCAL_MACHINE_GID} \
    deno install

# These steps will be re-run upon each file change in your working directory:
COPY . /var/dev

WORKDIR /var/dev

# Compile the main app so that it doesn't need to be compiled each startup/entry.
# RUN deno cache main.ts
ENV PATH="$PATH:/var/dev/node_modules/.bin/:$HOME/.local/bin"

# The port that your application listens to.
EXPOSE 4321
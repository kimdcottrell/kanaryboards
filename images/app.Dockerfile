# syntax=docker/dockerfile:1
FROM denoland/deno:2.9.3 as dev 

# Prefer not to run as root.
ARG LOCAL_MACHINE_GID=${LOCAL_MACHINE_GID:-1000}
ARG LOCAL_MACHINE_UID=${LOCAL_MACHINE_UID:-1000}

RUN groupmod -g ${LOCAL_MACHINE_GID} deno; \
    usermod -u ${LOCAL_MACHINE_UID} -g ${LOCAL_MACHINE_GID} deno;

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get upgrade -y && apt-get --no-install-recommends install -y \
        git \
        gh \ 
        tzdata \
        curl \
        wget \ 
        sudo \
        iptables \
        ipset \
        iproute2 \
        dnsutils \
        openssl \
        openssh-client \
        ca-certificates \
        jq \
        procps \
        aggregate \
        vim \
        zsh \
        unzip \
        && \
        apt-get clean && rm -rf /var/lib/apt/lists/*; \
    git config --global --add safe.directory /var/dev

SHELL ["/bin/bash", "-c"]

# Jail Claude to only be able to access the network and filesystem in the ways we allow with iptables and ipset.
COPY .devcontainer/init-firewall.sh /usr/local/bin/init-firewall.sh
RUN chmod +x /usr/local/bin/init-firewall.sh && \
    echo "deno ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/deno-firewall && \
    chmod 0440 /etc/sudoers.d/deno-firewall; 

# Add in some lines to sudoers so the deno user can run a handful of commands as root
RUN echo "deno ALL=(ALL) NOPASSWD: /usr/bin/vim, /usr/bin/rm, /usr/bin/dpkg, /usr/bin/chown, /usr/bin/chmod, /usr/bin/apt, /usr/bin/apt-get" \
    > /etc/sudoers.d/deno && chmod 440 /etc/sudoers.d/deno

# fix all the permissions issues for deno
RUN mkdir -p /var/dev /home/deno /home/.deno/bin; \
    touch /home/deno/.claude.json; \
    chown -R deno:deno /home; \
    chown -R deno:deno /var/dev; \
    chown -R deno:deno /deno-dir; \
    chown -R deno:deno /tmp; \
    chown -R deno:deno /usr/local/bin;

# scripts that require node in the shebang of /usr/env/bin/ need this
RUN ln -s /usr/bin/deno /usr/bin/node

USER deno

COPY . /var/dev

WORKDIR /var/dev

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deno.json will download and compile _all_ external files used in main.ts.
RUN --mount=type=cache,target=${DENO_DIR},uid=${LOCAL_MACHINE_UID},gid=${LOCAL_MACHINE_GID} \
    deno install

# Compile the main app so that it doesn't need to be compiled each startup/entry.
# RUN deno cache main.ts
ENV PATH="$PATH:/var/dev/node_modules/.bin/:$HOME/.local/bin"

RUN deno run --allow-all husky

# The port that your application listens to.
EXPOSE 4321

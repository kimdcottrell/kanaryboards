# syntax=docker/dockerfile:1
FROM denoland/deno:2.7.12
# COPY --from=denoland/deno:bin-2.7.4 /deno /usr/local/bin/deno

# Prefer not to run as root.
ARG LOCAL_MACHINE_GID=${LOCAL_MACHINE_GID:-1000}
ARG LOCAL_MACHINE_UID=${LOCAL_MACHINE_UID:-1000}
RUN groupmod -g ${LOCAL_MACHINE_GID} deno; \
    usermod -u ${LOCAL_MACHINE_UID} -g ${LOCAL_MACHINE_GID} deno;

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    echo "deb http://deb.debian.org/debian trixie main" > /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian trixie-updates main" >> /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian-security trixie-security main" >> /etc/apt/sources.list && \
    apt-get update && apt-get --no-install-recommends install -y git tzdata && \
    git config --global --add safe.directory /var/dev

# fix all the permissions issues for deno
RUN mkdir -p /home/deno /var/dev /home/.deno/bin; \
    chown -R deno:deno /home; \
    chown -R deno:deno /var/dev; \
    chown -R deno:deno /deno-dir; 

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

ENV PATH="$PATH:/var/dev/node_modules/.bin/"

# The port that your application listens to.
EXPOSE 4321

CMD ["deno", "task", "dev"]

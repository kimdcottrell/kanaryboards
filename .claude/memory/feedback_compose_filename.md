---
name: feedback_compose_filename
description: This project uses compose.yaml (not docker-compose.yml) — always look for compose.yaml first
metadata:
  type: feedback
---

When searching for Docker Compose config in this project, look for `compose.yaml` first — that is the actual filename used here.

**Why:** Docker Compose V2 made `compose.yaml` the preferred name. Claude defaulted to the older `docker-compose.y*ml` glob, which missed the file entirely.

**How to apply:** Any time a task involves Docker Compose (starting services, reading config, checking ports), check `compose.yaml` first before falling back to `docker-compose.yml`/`docker-compose.yaml`.

#!make
sinclude .env

.PHONY: help setup-ssh-agent

.DEFAULT_GOAL := help

nuke: ## Kill your entire system's Docker containers and prune all containers, images, and volumes
	docker ps -aq | xargs --no-run-if-empty docker kill
	docker system prune -af --volumes

# NOTES:
# may also require `sudo pacman -S xorg-xhost` on Arch Linux
codegen: ## Generate a Playwright test script by interacting with the browser. The generated script will be saved to tests/playwright/generated.spec.ts
	xhost +local:docker; \
	docker compose exec -e "CI=false" -u node playwright \
	npx playwright codegen \
	--output /usr/src/app/tests/playwright/generated.spec.ts \
	https://kanary.local.dev \
	--ignore-https-errors \
	--browser firefox

setup-ssh-agent: ## Add ssh_agent_reload function and SSH_AUTH_SOCK export to your shell profile (~/.bash_profile and ~/.bashrc)
	@profile=$$HOME/.bash_profile; \
	bashrc=$$HOME/.bashrc; \
	if [ -f "$$profile" ]; then \
		if ! grep -q 'ssh_agent_reload' "$$profile"; then \
			{ echo ''; \
			  echo 'ssh_agent_reload() {'; \
			  echo '  if ps aux | grep -q "[s]sh/agent\.sock"; then kill -9 $$(pgrep -f "[s]sh/agent\.sock"); fi'; \
			  echo '  rm -f "$$HOME/.ssh/agent.sock"'; \
			  echo '  eval $$(ssh-agent -s -a "$$HOME/.ssh/agent.sock") > /dev/null'; \
			  echo '  for key in "$$HOME"/.ssh/id_*; do [[ "$$key" == *.pub ]] || ssh-add -S "$$HOME/.ssh/agent.sock" "$$key"; done'; \
			  echo '}'; \
			  echo ''; \
			  echo 'ssh_agent_reload'; \
			} >> "$$profile"; \
			echo "  -> Added ssh_agent_reload to $$profile"; \
		else \
			echo "  -> ssh_agent_reload already in $$profile, skipping"; \
		fi; \
	else \
		echo "  -> $$profile not found, skipping"; \
	fi; \
	if [ -f "$$bashrc" ]; then \
		if ! grep -q 'SSH_AUTH_SOCK' "$$bashrc"; then \
			{ echo ''; \
			  echo 'export SSH_AUTH_SOCK="$$HOME/.ssh/agent.sock"'; \
			} >> "$$bashrc"; \
			echo "  -> Added SSH_AUTH_SOCK export to $$bashrc"; \
		else \
			echo "  -> SSH_AUTH_SOCK already in $$bashrc, skipping"; \
		fi; \
	else \
		echo "  -> $$bashrc not found, skipping"; \
	fi; \
	echo "  -> Running ssh_agent_reload on host..."; \
	bash -lc 'ssh_agent_reload'

coffee: ## Get your terminal caffeinated
	@echo -e '(ﾉ ^ヮ^)ﾉ *:･ﾟ✧ \342\230\225\012'

# This will output the help for each task
# thanks to https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help: ## Magic terminal on my screen, what is the fairest help menu of them all?
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

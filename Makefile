#!make
sinclude .env

.PHONY: help

.DEFAULT_GOAL := help

nuke: ## Kill your entire system's Docker containers and prune all containers, images, and volumes
	docker ps -aq | xargs --no-run-if-empty docker kill 
	docker system prune -af --volumes

codegen: ## Generate a Playwright test script by interacting with the browser. The generated script will be saved to tests/playwright/generated.spec.ts
	docker compose exec -e "CI=false" -u node playwright \
	npx playwright codegen \
	--output /usr/src/app/tests/playwright/generated.spec.ts \
	https://kanary.local.dev \
	--ignore-https-errors \
	--browser firefox

coffee: ## Get your terminal caffeinated
	@echo -e '(ﾉ ^ヮ^)ﾉ *:･ﾟ✧ \342\230\225\012'

# This will output the help for each task
# thanks to https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help: ## Magic terminal on my screen, what is the fairest help menu of them all?
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)



.PHONY: install build dev test lint typecheck clean docker-build docker-run check

install:
	npm install

build:
	npx tsc

dev:
	npx tsx src/index.ts

dev-sse:
	MCP_TRANSPORT=sse npx tsx src/index.ts

test:
	npx vitest run

test-watch:
	npx vitest

lint:
	npx eslint src/

typecheck:
	npx tsc --noEmit

clean:
	rm -rf dist/ node_modules/

docker-build:
	docker build -t linkedin-mcp-server .

docker-run:
	docker run --env-file .env -p 3001:3001 linkedin-mcp-server

check: typecheck test
	@echo "All checks passed"

.PHONY: test lint build

test:
	npm test -- --passWithNoTests

lint:
	npm run lint

build:
	docker build --target production -t frontend .

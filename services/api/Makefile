.PHONY: test lint build

test:
	pytest tests/ -v

lint:
	ruff check app/ tests/

build:
	docker build --target production -t api .

IMAGE := api

.PHONY: test lint build _dev-image

_dev-image:
	docker build --target development -t $(IMAGE):dev .

test: _dev-image
	docker run --rm $(IMAGE):dev pytest tests/ -v

lint: _dev-image
	docker run --rm $(IMAGE):dev ruff check app/ tests/

build:
	docker build --target production -t $(IMAGE):latest .

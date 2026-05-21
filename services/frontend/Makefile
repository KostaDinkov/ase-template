IMAGE := frontend

.PHONY: test lint build _dev-image

_dev-image:
	docker build --target development -t $(IMAGE):dev .

test: _dev-image
	docker run --rm $(IMAGE):dev npm test -- --passWithNoTests

lint: _dev-image
	docker run --rm $(IMAGE):dev npm run lint

build:
	docker build --target production -t $(IMAGE):latest .

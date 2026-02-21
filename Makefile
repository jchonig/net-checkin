all: test

build:
	docker compose build

test:	build
	-docker compose run --rm tests
	@echo "Report: file://$${PWD}/playwright-report/index.html"

clean:
	-docker compose rm -f

true: ;

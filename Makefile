# Agentic-coding model tracker — the Makefile is the only interface.
# Code and data are versioned separately: VERSION / data_version, tags code-v* / data-v*.

CV      := $(file <VERSION)
DV      := $(shell sed -n 's/^[[:space:]]*"data_version":[[:space:]]*"\([^"]*\)".*/\1/p' data/agentic-model-timeline.json)
STAMP   := c$(CV)_d$(DV)
OUT     := out
VERIFY  := /tmp/verifica

.PHONY: all check build test clean package verify release-code release-data versions docker docker-image

all: build test

versions:
	@echo "code v$(CV)  data v$(DV)"

check: docker-image

build: docker-image
	@set -eu; \
	container=$$(docker create agentic-tracker:$(STAMP) /unused); \
	trap 'docker rm -f "$$container" >/dev/null' EXIT; \
	mkdir -p dist; \
	docker cp "$$container:/app/dist/agentic-model-timeline.html" dist/agentic-model-timeline.html; \
	docker cp "$$container:/app/CHANGELOG.data.md" CHANGELOG.data.md

docker-image:
	docker build -t agentic-tracker:$(STAMP) .

test: build

# BUMP=major|minor|patch  MSG="what changed"
release-code: test
	$(PY) tools/release.py code $(BUMP) "$(MSG)"

release-data: test
	$(PY) tools/release.py data $(BUMP) "$(MSG)"

# Versioned deliverables: the single-file page and a source zip carrying the git history.
package: test
	@test -z "$$(git status --porcelain)" || (echo "tree dirty: release first" >&2; exit 1)
	mkdir -p $(OUT)
	cp dist/agentic-model-timeline.html $(OUT)/agentic-model-timeline_$(STAMP).html
	rm -f $(OUT)/agentic-tracker-src_$(STAMP).zip
	zip -qr $(OUT)/agentic-tracker-src_$(STAMP).zip . -x 'node_modules/*' 'dist/*' 'out/*'
	@ls -l $(OUT)

# Unpack the zip into a clean directory, rebuild from scratch, compare byte-for-byte.
verify: package
	rm -rf $(VERIFY) && mkdir -p $(VERIFY)
	cd $(VERIFY) && unzip -q $(CURDIR)/$(OUT)/agentic-tracker-src_$(STAMP).zip
	$(MAKE) -C $(VERIFY) test
	cmp $(VERIFY)/dist/agentic-model-timeline.html $(OUT)/agentic-model-timeline_$(STAMP).html
	cd $(VERIFY) && git describe --tags --match 'code-v*' --abbrev=0 && git describe --tags --match 'data-v*' --abbrev=0
	@echo "verify ok: $(STAMP)"

docker:
	docker-image
	@set -eu; \
	container=$$(docker create agentic-tracker:$(STAMP) /unused); \
	trap 'docker rm -f "$$container" >/dev/null' EXIT; \
	mkdir -p $(OUT); \
	docker cp "$$container:/app/dist/agentic-model-timeline.html" $(OUT)/agentic-model-timeline_$(STAMP).docker.html

clean:
	rm -rf dist out

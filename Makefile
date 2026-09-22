# Agentic-coding model tracker — the Makefile is the only interface.
# Code and data are versioned separately: VERSION / data_version, tags code-v* / data-v*.

PY      ?= python3
CV      := $(shell cat VERSION)
DV      := $(shell $(PY) -c "import json;print(json.load(open('data/agentic-model-timeline.json'))['data_version'])")
STAMP   := c$(CV)_d$(DV)
OUT     := out
VERIFY  := /tmp/verifica

.PHONY: all check build test clean package verify release-code release-data versions docker

all: build test

versions:
	@echo "code v$(CV)  data v$(DV)"

check:
	$(PY) tools/build.py check

build:
	$(PY) tools/build.py build

node_modules: package.json
	npm install --no-audit --no-fund --silent
	@touch node_modules

test: build node_modules
	node --test test/*.test.mjs

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
	docker build -t agentic-tracker:$(STAMP) .
	docker create --name at-export agentic-tracker:$(STAMP) >/dev/null
	mkdir -p $(OUT) && docker cp at-export:/app/dist/agentic-model-timeline.html $(OUT)/agentic-model-timeline_$(STAMP).docker.html
	docker rm at-export >/dev/null

clean:
	rm -rf dist out node_modules

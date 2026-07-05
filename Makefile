# Ouija test & diagnostics runner.
# One entry point for the whole pyramid: smoke (hardware self-test) → unit →
# regression (golden/determinism) → e2e (cross-stack brain bridge). Every
# target runs on synthetic data — no hardware, no personal recordings.
#
#   make install     # install both stacks' deps
#   make smoke       # fast hardware/connector health check
#   make test        # unit + regression, both stacks
#   make e2e         # cross-stack Python→frontend bridge
#   make all         # smoke + test + e2e + typecheck (what CI runs)

FRONTEND := frontend
PY := python

.DEFAULT_GOAL := all
.PHONY: install install-py install-web smoke unit regression e2e test typecheck build all clean

install: install-py install-web ## install every dependency

install-py: ## install the Python converter deps
	$(PY) -m pip install -r converters/requirements.txt

install-web: ## install the frontend deps
	cd $(FRONTEND) && npm install --legacy-peer-deps

smoke: ## hardware/connector diagnostics — every ingest path, end to end
	$(PY) -m converters.diagnostics --verbose

unit: ## unit + regression tests, both stacks
	$(PY) -m pytest converters/tests -q
	cd $(FRONTEND) && npm test

# Regression = the deterministic/golden subset (simulate determinism + the
# cross-stack brain-bridge contract). Kept as its own target for a fast
# "did behaviour drift?" check.
regression: ## golden/determinism regression subset
	$(PY) -m pytest converters/tests/test_brain_bridge.py -q -k "golden or bridge"
	cd $(FRONTEND) && npx vitest run tests/e2e

e2e: ## cross-stack Python→frontend brain-bridge contract
	$(PY) -m pytest converters/tests/test_brain_bridge.py -q
	cd $(FRONTEND) && npx vitest run tests/e2e

e2e-browser: build ## real-browser e2e (diagnostic renders live in Chromium)
	cd $(FRONTEND) && npm run test:e2e:browser

typecheck: ## frontend TypeScript typecheck
	cd $(FRONTEND) && npm run typecheck

build: ## production build smoke (catches SSR/prerender breakage)
	cd $(FRONTEND) && npm run build

test: unit ## alias: unit + regression

all: smoke unit e2e typecheck ## full gate — what CI runs

clean: ## drop generated/test artifacts
	rm -rf $(FRONTEND)/.next $(FRONTEND)/out
	find . -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
	find . -name '.pytest_cache' -type d -prune -exec rm -rf {} + 2>/dev/null || true

help: ## list targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

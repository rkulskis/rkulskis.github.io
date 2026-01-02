SCRIPT_PATH := ./.github/workflows
BUILD_DIR := build

.PHONY: all build clean

all: build

build:
	@rm -rf $(BUILD_DIR) _minted-*
	@$(SCRIPT_PATH)/utils.sh build
	@# Copy top-level non-.org files and directories without .org files
	@for item in * .*; do \
		[ "$$item" = "." ] || [ "$$item" = ".." ] || \
		[ "$$item" = "build" ] || [ "$$item" = ".git" ] || [ "$$item" = ".github" ] || \
		[ "$${item##*.}" = "org" ] || \
		[ "$${item##*.}" = "html" ] || \
		{ [ -d "$$item" ] && find "$$item" -name "*.org" -print -quit | grep -q .; } || \
		cp -a "$$item" build/; \
	done
	@# Copy non-.org files from directories that contain .org files
	@for dir in */; do \
		[ "$$dir" = "build/" ] || [ "$$dir" = ".git/" ] || [ "$$dir" = ".github/" ] || [ ! -d "$$dir" ] || \
		{ find "$$dir" -name "*.org" -print -quit | grep -q . && \
		  find "$$dir" -type f ! -name "*.org" ! -name "*.html" -exec sh -c '\
		    rel="$${1#./}"; \
		    mkdir -p "build/$$(dirname "$$rel")"; \
		    cp -a "$$1" "build/$$rel"' _ {} \;; } || :; \
	done

clean:
	@rm -rf $(BUILD_DIR) _minted-*
	@find . -type f \( -name "*~" -o -name "#*" \) -exec rm -rf {} +

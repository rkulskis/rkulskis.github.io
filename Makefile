SCRIPT_PATH := ./.github/workflows
BUILD_DIR := build

.PHONY: all build clean

all: build

build:
	@rm -rf $(BUILD_DIR) _minted-*
	@$(SCRIPT_PATH)/utils.sh build
	@# Copy non-.org files and directories without .org files
	@for item in * .*; do \
		[ "$$item" = "." ] || [ "$$item" = ".." ] || \
		[ "$$item" = "build" ] || [ "$$item" = ".git" ] || [ "$$item" = ".github" ] || \
		[ "$${item##*.}" = "org" ] || \
		{ [ -d "$$item" ] && find "$$item" -name "*.org" -print -quit | grep -q .; } || \
		cp -a "$$item" build/; \
	done

clean:
	@rm -rf $(BUILD_DIR) _minted-*
	@find . -type f \( -name "*~" -o -name "#*" \) -exec rm -rf {} +

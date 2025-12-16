SCRIPT_PATH := ./.github/workflows
BUILD_DIR := build

.PHONY: all build html_export clean submodules

all: submodules build

submodules:
	git submodule update --init --remote

build: submodules
	@rm -rf $(BUILD_DIR) _minted-*
	@$(SCRIPT_PATH)/utils.sh build

html_export: build

clean:
	@rm -rf $(BUILD_DIR) _minted-*
	@find . -type f \( -name "*~" -o -name "#*" \) -exec rm -rf {} +

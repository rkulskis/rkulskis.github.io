SCRIPT_PATH := ./.github/workflows
BUILD_DIR := build

.PHONY: all build clean

all: build

build:
	@rm -rf $(BUILD_DIR) _minted-*
	@$(SCRIPT_PATH)/utils.sh build

clean:
	@rm -rf $(BUILD_DIR) _minted-*
	@find . -type f \( -name "*~" -o -name "#*" \) -exec rm -rf {} +

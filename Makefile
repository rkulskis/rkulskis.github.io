SCRIPT_PATH=./.github/workflows

all: new_header html_export 

new_header:
	@$(SCRIPT_PATH)/utils.sh clear_header || true
	@$(SCRIPT_PATH)/utils.sh add_header || true

html_export:
	@$(SCRIPT_PATH)/utils.sh html_export || true

clean:
	@find . -type f \( -name "*.html" -o -name "*~" -o -name "#*" \) \
	-exec rm -rf {} +

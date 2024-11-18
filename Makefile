all: new_header html_export

new_header:
	@./utils.sh clear_header || true
	@./utils.sh add_header || true

html_export:
	@./utils.sh html_export || true

clean:
	@find . -type f \( -name "*.html" -o -name "*~" -o -name "#*" \) \
	-exec rm -rf {} +

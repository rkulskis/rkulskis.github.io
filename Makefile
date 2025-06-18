SCRIPT_PATH=./.github/workflows

all: new_header html_export build_philsaxioms

new_header:
	@$(SCRIPT_PATH)/utils.sh clear_header || true
	@$(SCRIPT_PATH)/utils.sh add_header || true

html_export:
	@$(SCRIPT_PATH)/utils.sh html_export || true

build_philsaxioms:
	@echo "Building PhilsAxioms static site..."
	@cd philsaxioms && \
	if [ ! -d "node_modules" ]; then \
		npm install --silent --no-fund --no-audit; \
	fi && \
	npm run build:static && \
	npm run build --workspace=packages/backend && \
	mkdir -p packages/backend/public && \
	cp -r packages/frontend/dist/* packages/backend/public/ && \
	rm -f index.html && \
	rm -rf assets && \
	cp packages/backend/public/index.html . && \
	cp -r packages/backend/public/assets . && \
	cp packages/frontend/public/graph-data.json . && \
	cp packages/frontend/public/questionnaire.json . || true

serve:
	@echo "Stopping any existing servers on port 8080..."
	@-pkill -f ":8080" 2>/dev/null || true
	@sleep 1
	@if command -v python3 >/dev/null 2>&1; then \
		python3 serve.py; \
	elif command -v python >/dev/null 2>&1; then \
		python serve.py; \
	else \
		echo "Error: Python not found. Please install Python to use the preview server."; \
		echo "Alternatively, you can use any other HTTP server to serve the current directory."; \
		exit 1; \
	fi

preview: all serve

clean:
	@find . -type f \( -name "*.html" -o -name "*~" -o -name "#*" \) \
	! -path "./philsaxioms/packages/frontend/index.html" \
	-exec rm -rf {} +
	@cd philsaxioms && rm -rf packages/frontend/dist/ assets/ || true

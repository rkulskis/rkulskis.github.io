#!/bin/bash

HEADER="| "
TOP_DIR="$(pwd)"

clear_header() {
    file="$1"
		if grep -q '^#+OPTIONS: toc:nil num:nil' "$file"; then
				sed -i '0,/^#+OPTIONS: toc:nil num:nil/d' "$file"
		fi
}

declare -A EXCEPTIONS=(
    ["cv"]="[[file:cv/rossMikulskisResume.pdf][CV]]"
    ["images"]=""
    ["index"]="[[file:./index.html][./]]"
    ["philsaxioms"]="[[file:philsaxioms/][PhilsAxioms]]"
)

capitalize() {
    input="$1"
    echo "$input" | sed -E 's/(^|_)([a-z])/\U\2/g'
}

generate_header() {
    dir="$1"
    is_top="$2"
    header="$HEADER"

    if [[ "$is_top" -eq 0 ]]; then
        header+="[[file:../index.html][../]] | "
    fi

    # Files loop
    while IFS= read -r -d '' file; do
        filename=$(basename "$file" .org)
        if [[ ${EXCEPTIONS[$filename]+_} ]]; then
            header+="${EXCEPTIONS[$filename]} | "
        else
            filename_capitalized=$(capitalize "$filename")
            header+="[[file:$filename.html][$filename_capitalized]] | "
        fi
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -type f -name "*.org" ! -name ".*" -print0 | sort -z)

    # Directories loop
    while IFS= read -r -d '' subdir; do
        subname=$(basename "$subdir")
        if [[ ${EXCEPTIONS[$subname]+_} ]]; then
            header+="${EXCEPTIONS[$subname]} | "
        else
            subname_capitalized=$(capitalize "$subname")
            header+="[[file:$subname/index.html][$subname_capitalized/]] | "
        fi
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -type d ! -name ".*" -print0 | sort -z)

    echo "$header\n#+OPTIONS: toc:nil num:nil"
}

add_header() {
    dir="$1"
    is_top="$2"
    header=$(generate_header "$dir" "$is_top")

    for file in "$dir"/*.org; do
        [ -e "$file" ] || continue
        echo -e "$header\n$(cat "$file")" > "$file"
    done
}

export_html() {
    local org_file="$1"
    emacs --batch --load ./.github/workflows/elisp/batch-htmlize.el "$org_file"
}

process_files() {
    dir="$1"
    operation="$2"
    is_top="$3"

    case "$operation" in
        clear_header)
            for file in "$dir"/*.org; do
                [ -e "$file" ] || continue
                clear_header "$file"
            done
            ;;
        add_header)
            add_header "$dir" "$is_top"
            ;;
        html_export)
            for file in "$dir"/*.org; do
                [ -e "$file" ] || continue
                export_html "$file"
            done
            ;;
    esac
    # if index.org does not exist, create a symlink for index.html (but not if index.html already exists)
    if [ ! -e "$dir/index.org" ] && [ ! -e "$dir/index.html" ]; then
        html_file=$(find "$dir" -maxdepth 1 -type f -name "*.html" | head -n 1)
        if [ -n "$html_file" ]; then
            ln -sf "$(basename "$html_file")" "$dir/index.html"
        fi
    fi		

    for subdir in "$dir"/*/; do
        # Skip philsaxioms directory from org-mode processing
        if [[ "$(basename "$subdir")" == "philsaxioms" ]]; then
            continue
        fi
        [ -d "$subdir" ] && process_files "$subdir" "$operation" 0
    done
}

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 {clear_header|add_header|html_export}"
    exit 1
fi

rm -rf _minted-index

case "$1" in
    clear_header|add_header|html_export) process_files "." "$1" 1 ;;
    *) echo "Invalid argument. Use clear_header, add_header, or html_export."; exit 1 ;;
esac

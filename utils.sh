#!/bin/bash

generate_prefix() {
    local depth=$(echo "$1" | grep -o "/" | wc -l)
    local prefix=""
    for ((i=2; i<depth; i++)); do
        prefix="../$prefix"
    done
    echo "$prefix"
}

clear_header() {
    local file="$1"
    if grep -q "contact\.html" "$file"; then
        sed -i '1,/contact\.html/d' "$file"
    else
        echo "contact.html not found in $file. No lines cleared."
    fi
}

declare -A EXCEPTIONS=(
    ["index.html"]="About Me"
    ["cv"]="[[file:${prefix}cv/rossMikulskisResume.pdf][CV]]"
    ["research"]="[[file:${prefix}research/][Research]]"		
)

capitalize() {
    local input="$1"
    echo "$input" | sed -E 's/(^|_)([a-z])/\U\2/g'
}

add_header() {
    local file="$1"
    local prefix=$(generate_prefix "$file")
    local dir=$(dirname "$file")

    local HEADER="#+OPTIONS: toc:nil num:nil\n"
		
    for item in "$dir"/*; do
        if [ -d "$item" ]; then
            local dir_name=$(basename "$item")
            if [[ -n "${EXCEPTIONS[$dir_name]}" ]]; then
                HEADER="$HEADER ${EXCEPTIONS[$dir_name]} |"
            else
                local dir_item=$(capitalize "$dir_name")
                HEADER="$HEADER \
[[file:${prefix}${dir_name}/index.html][$dir_item]] |"
            fi
        elif [ -f "$item" ] && [[ "$item" == *.org ]]; then
            local file_name=$(basename "$item" .org)
            local html_name="${file_name}.html"
            if [[ -n "${EXCEPTIONS[$html_name]}" ]]; then
                HEADER="$HEADER \
[[file:${prefix}${html_name}][${EXCEPTIONS[$html_name]}]] |"
            else
                local file_item=$(capitalize "$file_name")
                HEADER="$HEADER [[file:${prefix}${html_name}][$file_item]] |"
            fi
        fi
    done

    if ! grep -q "About Me" "$file"; then
        echo -e "$HEADER\n$(cat "$file")" > "$file"
    fi
}

export_html() {
    local org_file="$1"
    emacs --batch "$org_file" \
          --eval "(progn
                     (require 'org)
                     (let ((output (org-html-export-to-html)))
                       (message \"Exported %s to %s\" \"$org_file\" output)))"
}

process_files() {
    local dir="$1"
    local operation="$2"

    for file in "$dir"/*.org; do
        [ -e "$file" ] || continue
        case "$operation" in
            clear_header) clear_header "$file" ;;
            add_header) add_header "$file" ;;
            html_export) export_html "$file" ;;
        esac
    done

    for subdir in "$dir"/*/; do
        [ -d "$subdir" ] && process_files "$subdir" "$operation"
    done
}

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 {clear_header|add_header|html_export}"
    exit 1
fi

case "$1" in
    clear_header|add_header|html_export) process_files "." "$1" ;;
    *) echo "Invalid argument. Use clear_header, add_header, or html_export."; exit 1 ;;
esac

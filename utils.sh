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

    for file in $(find "$dir" -mindepth 1 -maxdepth 1 -type f -name "*.org" ! -name ".*" | sort); do
        filename=$(basename "$file" .org)
        if [[ -n "${EXCEPTIONS[$filename]}" ]]; then
            header+="${EXCEPTIONS[$filename]} | "
        else
            filename_capitalized=$(capitalize "$filename")
            header+="[[file:$filename.html][$filename_capitalized]] | "
        fi
    done

    for subdir in $(find "$dir" -mindepth 1 -maxdepth 1 -type d ! -name ".*" | sort); do
        subname=$(basename "$subdir")
        if [[ -n "${EXCEPTIONS[$subname]}" ]]; then
            header+="${EXCEPTIONS[$subname]} | "
        else
            subname_capitalized=$(capitalize "$subname")
            header+="[[file:$subname/index.html][$subname_capitalized/]] | "
        fi
    done

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
    org_file="$1"
    emacs --batch "$org_file" \
          --eval "(progn
                     (require 'org)
                     (let ((output (org-html-export-to-html)))
                       (message \"Exported %s to %s\" \"$org_file\" output)))"
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

    for subdir in "$dir"/*/; do
        [ -d "$subdir" ] && process_files "$subdir" "$operation" 0
    done
}

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 {clear_header|add_header|html_export}"
    exit 1
fi

case "$1" in
    clear_header|add_header|html_export) process_files "." "$1" 1 ;;
    *) echo "Invalid argument. Use clear_header, add_header, or html_export."; exit 1 ;;
esac

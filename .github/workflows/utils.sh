#!/bin/bash
HEADER="| "
TOP_DIR="$(pwd)"
BUILD_DIR="build"

declare -A EXCEPTIONS=(
    ["cv"]="[[file:../cv/rossMikulskisResume.pdf][CV]]"
    ["images"]=""
    ["index"]=""
    ["build"]=""
)

capitalize() {
    input="$1"
    echo "$input" | sed -E 's/(^|_)([a-z])/\U\2/g'
}

generate_header() {
    dir="$1"
    is_top="$2"
    header="$HEADER"
    header+="[[file:./index.html][./]] | "
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
            # Skip if no .org files in this directory
            if ! compgen -G "$subdir"/*.org > /dev/null; then
                continue
            fi
            subname_capitalized=$(capitalize "$subname")
            header+="[[file:$subname/index.html][$subname_capitalized/]] | "
        fi
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -type d ! -name ".*" ! -name "$BUILD_DIR" -print0 | sort -z)
    
    # Calculate relative path to typography.css
    local depth=$(echo "$dir" | tr -cd '/' | wc -c)
    local css_path=""
    if [[ "$is_top" -eq 1 ]]; then
        css_path="typography.css"
    else
        for ((i=1; i<depth; i++)); do
            css_path="../$css_path"
        done
        css_path="${css_path}typography.css"
    fi
    
    echo "#+HTML_HEAD: <link rel=\"stylesheet\" type=\"text/css\" href=\"$css_path\" />"
    echo "#+HTML_HEAD: <link rel=\"stylesheet\""
    echo "#+HTML_HEAD:       href=\"https://fonts.googleapis.com/css2?family=Ubuntu+Sans+Mono:wght@400;700&display=swap\">"
    echo "$header"
    echo "#+OPTIONS: toc:nil num:nil"
}

create_build_file() {
    source_file="$1"
    build_file="$2"
    dir="$3"
    is_top="$4"
    
    # Calculate relative path from build file to source file
    local rel_path=$(realpath --relative-to="$(dirname "$build_file")" "$source_file")
    
    # Generate header for this directory context
    header=$(generate_header "$dir" "$is_top")
    
    # Create the build file with header and include directive
    {
        echo "$header"
        echo ""
        echo "#+INCLUDE: \"$rel_path\""
    } > "$build_file"
}

export_html() {
    local org_file="$1"
    emacs --batch --load ./.github/workflows/elisp/batch-htmlize.el "$org_file"
}

process_files() {
    dir="$1"
    is_top="$2"
    
    # Calculate corresponding build directory
    if [[ "$is_top" -eq 1 ]]; then
        build_subdir="$BUILD_DIR"
    else
        rel_dir="${dir#./}"
        build_subdir="$BUILD_DIR/$rel_dir"
    fi
    
    # Create build subdirectory
    mkdir -p "$build_subdir"
    
    # Process each .org file in the directory
    for source_file in "$dir"/*.org; do
        [ -e "$source_file" ] || continue
        
        filename=$(basename "$source_file")
        build_file="$build_subdir/$filename"
        
        create_build_file "$source_file" "$build_file" "$dir" "$is_top"
        export_html "$build_file"
    done
    
    # Create index.html symlink if needed in build directory
    if [ ! -e "$build_subdir/index.org" ] && [ ! -e "$build_subdir/index.html" ]; then
        html_file=$(find "$build_subdir" -maxdepth 1 -type f -name "*.html" ! -name "index.html" | head -n 1)
        if [ -n "$html_file" ]; then
            ln -sf "$(basename "$html_file")" "$build_subdir/index.html"
        fi
    fi
    
    # Recurse into subdirectories
    for subdir in "$dir"/*/; do
        [ -d "$subdir" ] && [[ "$(basename "$subdir")" != "$BUILD_DIR" ]] && process_files "$subdir" 0
    done
}

if [[ $# -ne 1 ]] || [[ "$1" != "build" ]]; then
    echo "Usage: $0 build"
    exit 1
fi

# Clean up old artifacts
rm -rf _minted-index "$BUILD_DIR"

# Create build directory
mkdir -p "$BUILD_DIR"

# Process all files
process_files "." 1

echo "Build complete. Output in $BUILD_DIR/"

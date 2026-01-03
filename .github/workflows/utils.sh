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

# Function to determine the current page name for highlighting
# Set this variable before calling generate_header to underline the current item
# Example: CURRENT_PAGE="projects" or CURRENT_PAGE="./" or CURRENT_PAGE="CV"
get_current_page() {
    local file="$1"
    local basename_file=$(basename "$file" .org)
    
    # If it's index.org or README.org, return "./" to highlight the current directory
    if [[ "$basename_file" == "index" || "$basename_file" == "README" ]]; then
        echo "./"
    else
        echo "$basename_file"
    fi
}

generate_header() {
    dir="$1"
    is_top="$2"
    
    # Get current working directory relative path
    if [[ "$is_top" -eq 1 ]]; then
        cwd="~"
    else
        # Remove leading ./ and clean up double slashes, prepend with ~
        cwd="~/"$(echo "$dir" | sed 's|^\./||' | sed 's|//*|/|g' | sed 's|/$||')
    fi
    
    # Collect all files and directories
    declare -A items_map
    declare -a items_temp
    
    # Files loop - only process .org files (excluding index.org)
    while IFS= read -r -d '' file; do
        filename=$(basename "$file" .org)
        
        # Skip index.org
        if [[ "$filename" == "index" ]]; then
            continue
        fi
        
        if [[ ${EXCEPTIONS[$filename]+_} ]]; then
            # Use the exception mapping
            exception_value="${EXCEPTIONS[$filename]}"
            # Extract the actual filename from org-mode link syntax if present
            if [[ "$exception_value" =~ \[\[file:([^\]]+)\]\[([^\]]+)\]\] ]]; then
                actual_file="${BASH_REMATCH[1]}"
                display_name="${BASH_REMATCH[2]}"
                items_map["$display_name"]="$actual_file|file|$filename"
                items_temp+=("$display_name")
            else
                items_map["$filename"]="$exception_value|file|$filename"
                items_temp+=("$filename")
            fi
        else
            items_map["$filename"]="$filename.html|file|$filename"
            items_temp+=("$filename")
        fi
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -type f -name "*.org" ! -name ".*" -print0 | sort -z)
    
    # Directories loop - only include directories with .org files
    while IFS= read -r -d '' subdir; do
        subname=$(basename "$subdir")
        
        # Skip if no .org files in this directory
        if ! compgen -G "$subdir"/*.org > /dev/null; then
            continue
        fi
        
        if [[ ${EXCEPTIONS[$subname]+_} ]]; then
            exception_value="${EXCEPTIONS[$subname]}"
            if [[ "$exception_value" =~ \[\[file:([^\]]+)\]\[([^\]]+)\]\] ]]; then
                actual_file="${BASH_REMATCH[1]}"
                display_name="${BASH_REMATCH[2]}"
                items_map["$display_name/"]="$actual_file|dir|$subname"
                items_temp+=("$display_name/")
            else
                items_map["$subname/"]="$exception_value|dir|$subname"
                items_temp+=("$subname/")
            fi
        else
            items_map["$subname/"]="$subname/index.html|dir|$subname"
            items_temp+=("$subname/")
        fi
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -type d ! -name ".*" ! -name "$BUILD_DIR" -print0 | sort -z)
    
    # Sort items alphabetically (case-insensitive)
    IFS=$'\n' items_sorted=($(sort -f <<<"${items_temp[*]}"))
    unset IFS
    
    # Build final order: ./, ../ (if exists), then sorted items
    declare -a items_order
    items_map["./"]="./index.html|dir|./"
    items_order+=("./")
    
    if [[ "$is_top" -eq 0 ]]; then
        items_map["../"]="../index.html|dir|../"
        items_order+=("../")
    fi
    
    items_order+=("${items_sorted[@]}")
    
    # Calculate max item length for column width
    local max_len=0
    for item in "${items_order[@]}"; do
        local len=${#item}
        if (( len > max_len )); then
            max_len=$len
        fi
    done
    
    # Add padding for column spacing
    local col_width=$((max_len + 2))
    
    # Calculate relative path to CSS and JS files
    local depth=$(echo "$dir" | tr -cd '/' | wc -c)
    local css_path=""
    local ctree_css_path=""
    local ctree_js_path=""
    if [[ "$is_top" -eq 1 ]]; then
        css_path="typography.css"
        ctree_css_path="ctree-highlight.css"
        ctree_js_path="ctree-highlight.js"
    else
        for ((i=1; i<depth; i++)); do
            css_path="../$css_path"
        done
        css_path="${css_path}typography.css"
        ctree_css_path="${css_path%typography.css}ctree-highlight.css"
        ctree_js_path="${css_path%typography.css}ctree-highlight.js"
    fi
    
    # Output HTML head
    echo "#+HTML_HEAD: <link rel=\"stylesheet\""
    echo "#+HTML_HEAD:       href=\"https://fonts.googleapis.com/css2?family=Ubuntu+Sans+Mono:wght@400;700&display=swap\">"
    echo "#+HTML_HEAD: <link rel=\"stylesheet\""
    echo "#+HTML_HEAD: href=\"https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap\">"
    echo "#+HTML_HEAD: <link rel=\"stylesheet\" type=\"text/css\" href=\"$css_path\" />"
    echo "#+HTML_HEAD: <link rel=\"stylesheet\" type=\"text/css\" href=\"$ctree_css_path\" />"
    echo "#+HTML_HEAD: <script src=\"$ctree_js_path\"></script>"
    
    # Move terminal above title by inserting it before the content starts
    # This requires using #+BEGIN_EXPORT html at the very start
    echo "#+OPTIONS: toc:nil num:nil html-postamble:nil"
    echo ""
    
    # Generate terminal-style header with clickable links
    echo "#+BEGIN_EXPORT html"
    echo "<div style=\"background: #232627; color: #ffffff; font-family: 'Ubuntu Sans Mono', monospace; font-size: 16px; padding: 8px; border-radius: 0; margin-bottom: 20px; overflow-wrap: normal;\">"
    echo "<div style=\"margin-bottom: 10px;\">visitor@rkulskis.github.io:$cwd\$ echo LINKS: \$(ls -a)</div>"

    echo "<div style=\"border-left: 4px solid #1d99f3; padding-left: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(${col_width}ch, 1fr)); gap: 0;\">LINKS: "
    
    # Generate clickable items in order with column alignment
    for item in "${items_order[@]}"; do
        IFS='|' read -r link type orig_name <<< "${items_map[$item]}"
        
        # Check if this is the current page (use CURRENT_PAGE variable)
        local underline_style=""
        # Match against the original filename (without extension or display transformation)
        if [[ -n "${CURRENT_PAGE}" && "${CURRENT_PAGE}" == "${orig_name}" ]]; then
            underline_style="text-decoration: underline;"
        else
            underline_style="text-decoration: none;"
        fi
        
        # Calculate padding needed
        local item_len=${#item}
        local padding=$((col_width - item_len))
        local padding_str=$(printf '%*s' "$padding" '')
        
        if [[ "$type" == "dir" ]]; then
            # Directory - bold cyan (ANSI cyan #CC0000)
            echo "<span style=\"white-space: pre;\"><a href=\"$link\" style=\"color: #1d99f3; font-weight: bold; ${underline_style}\">${item}</a>${padding_str}</span>"
        else
            # File - white (ANSI white #FFFFFF)
            echo "<span style=\"white-space: pre;\"><a href=\"$link\" style=\"color: #FFFFFF; ${underline_style}\">${item}</a>${padding_str}</span>"
        fi
    done
    
    echo "</div>"
    echo "</div>"
    echo "#+END_EXPORT"
    echo ""
}

create_build_file() {
    source_file="$1"
    build_file="$2"
    dir="$3"
    is_top="$4"
    
    # Ensure the parent directory exists
    mkdir -p "$(dirname "$build_file")"
    
    # Get absolute paths for reliable relative path calculation
    local abs_source=$(realpath "$source_file")
    local abs_build_dir=$(realpath "$(dirname "$build_file")")
    local rel_path=$(realpath --relative-to="$abs_build_dir" "$abs_source")

    # Set CURRENT_PAGE based on the actual file being processed
    CURRENT_PAGE=$(get_current_page "$(basename "$source_file")")
    header=$(generate_header "$dir" "$is_top")
    
    {
        echo "$header"
        echo ""
        echo "#+INCLUDE: \"$rel_path\""
    } > "$build_file"
    
    # Debug: show what was created
    echo "Created $build_file:"
    echo "  Source: $source_file"
    echo "  Current page: $CURRENT_PAGE"
    echo "  Relative path: $rel_path"
    echo "---"
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
        # Remove ./ prefix and trailing slash
        rel_dir="${dir#./}"
        rel_dir="${rel_dir%/}"
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

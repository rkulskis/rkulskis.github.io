#!/bin/bash

BUILD_DIR="build"
CURRENT_PAGE=""

declare -A EXCEPTIONS=(
    ["cv"]="[[file:../cv/rossMikulskisResume.pdf][resume.pdf]]"
)

get_current_page() {
    local file=$(basename "$1" .org)
    local dir="$2"
    if [[ "$file" =~ ^(index|README)$ ]]; then
        # Check if we're in a submodule
        if is_submodule "$dir"; then
            # Return submodule_name/README.org for matching
            echo "$(basename "$dir")/README.org"
        else
            echo "."
        fi
    else
        echo "$file"
    fi
}

# Check if directory is a git submodule
is_submodule() {
    local dir="$1"
    [[ -f "$dir/.git" ]] && return 0
    return 1
}

# Add item with exception handling
add_item() {
    local name="$1" url="$2" type="$3"
    
    if [[ -v EXCEPTIONS[$name] ]]; then
        local exc="${EXCEPTIONS[$name]}"
        if [[ "$exc" =~ \[\[file:([^\]]+)\]\[([^\]]+)\]\] ]]; then
            items_map["${BASH_REMATCH[2]}"]="${BASH_REMATCH[1]}|file|$name"
            items_temp+=("${BASH_REMATCH[2]}")
        elif [[ "$exc" =~ \[\[(https?://[^\]]+)\]\[([^\]]+)\]\] ]]; then
            items_map["${BASH_REMATCH[2]}"]="${BASH_REMATCH[1]}|link|$name"
            items_temp+=("${BASH_REMATCH[2]}")
        else
            items_map["$name"]="$exc|$type|$name"
            items_temp+=("$name")
        fi
    else
        items_map["$name"]="$url|$type|$name"
        items_temp+=("$name")
    fi
}

# Collect all navigation items
collect_items() {
    local dir="$1"
    declare -gA items_map
    declare -ga items_temp=()
    
    # LINK_ files
    while IFS= read -r -d '' file; do
        local name="${file#*LINK_}" url=$(head -n 1 "$file" | tr -d '\r\n')
        name=$(basename "$name")
        [[ -n "$url" ]] && items_map["$name"]="$url|link|$name" && items_temp+=("$name")
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -type f -name "LINK_*" -print0 | sort -z)
    
    # .org files (skip index.org)
    while IFS= read -r -d '' file; do
        local name=$(basename "$file" .org)
        [[ "$name" == "index" ]] && continue
        add_item "$name" "$name.html" "file"
        # Update display name to include .org extension if not exception
        [[ ! -v EXCEPTIONS[$name] ]] && {
            local last="${items_temp[-1]}"
            items_temp[-1]="$last.org"
            items_map["$last.org"]="${items_map[$last]}"
            unset items_map["$last"]
        }
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -type f -name "*.org" -print0 | sort -z)
    
    # URL symlinks
    while IFS= read -r -d '' link; do
        local name=$(basename "$link") target=$(readlink "$link")
        [[ "$target" =~ ^https?:// ]] && add_item "$name" "$target" "link"
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -type l -print0 | sort -z)
    
    # Directories with .org files
    while IFS= read -r -d '' subdir; do
        local name=$(basename "$subdir")
        if compgen -G "$subdir"/*.org > /dev/null; then
            # Check if it's a submodule
            if is_submodule "$subdir"; then
                # Add as README.org file with path name/README.org
                items_temp+=("$name/README.org")
                items_map["$name/README.org"]="$name/README.html|file|$name/README.org"
            else
                add_item "$name" "$name/index.html" "dir"
            fi
        elif [[ -v EXCEPTIONS[$name] ]]; then
            # Directory exists and has an exception defined
            add_item "$name" "" "dir"
        fi
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -type d ! -name ".*" ! -name "$BUILD_DIR" -print0 | sort -z)
}

# Adjust links for submodule (prepend ../)
adjust_links_for_submodule() {
    declare -gA items_map
    local -a new_temp=()
    
    for item in "${items_temp[@]}"; do
        IFS='|' read -r link type orig_name <<< "${items_map[$item]}"
        
        # Adjust relative links (not external URLs)
        if [[ "$type" != "link" || ! "$link" =~ ^https?:// ]]; then
            link="../$link"
        fi
        
        items_map["$item"]="$link|$type|$orig_name"
        new_temp+=("$item")
    done
    
    items_temp=("${new_temp[@]}")
}

# Generate navigation header
generate_header() {
    local dir="$1" is_top="$2"
    local cwd="~" depth=0
    local is_submod=0
    
    if [[ "$is_top" -eq 0 ]]; then
        # Fix: Remove leading ./ and normalize path
        local clean_dir="${dir#./}"
        clean_dir="${clean_dir%/}"  # Remove trailing slash
        cwd="~/${clean_dir}"
        depth=$(echo "$clean_dir" | tr -cd '/' | wc -c)
    fi
    
    # Check if this is a submodule
    if is_submodule "$dir"; then
        is_submod=1
        # Use parent directory's navigation
        local parent_dir=$(dirname "$dir")
        local submod_name=$(basename "$dir")
        collect_items "$parent_dir"
        adjust_links_for_submodule
        
        # The submodule is already added as name/README.org by collect_items
        # Just need to adjust its link to be relative
        for i in "${!items_temp[@]}"; do
            if [[ "${items_temp[$i]}" == "$submod_name/README.org" ]]; then
                items_map["$submod_name/README.org"]="./README.html|file|$submod_name/README.org"
                break
            fi
        done
        
        # Fix the cwd path for submodules - stay in parent directory
        local clean_parent="${parent_dir#./}"
        clean_parent="${clean_parent%/}"
        [[ -n "$clean_parent" ]] && cwd="~/${clean_parent}" || cwd="~"
    else
        collect_items "$dir"
    fi
    
    # Build item order
    local -a items_order=(".")
    [[ "$is_top" -eq 0 ]] && items_order+=("..")
    readarray -t sorted < <(printf '%s\n' "${items_temp[@]}" | sort -f)
    items_order+=("${sorted[@]}")
    
    # Adjust navigation items for submodules
    if [[ "$is_submod" -eq 1 ]]; then
        items_map["."]="../index.html|dir|."
        items_map[".."]="../../index.html|dir|.."
    else
        items_map["."]="./index.html|dir|."
        [[ "$is_top" -eq 0 ]] && items_map[".."]="../index.html|dir|.."
    fi
    
    # Calculate column width
    local max_len=0
    for item in "${items_order[@]}"; do
        (( ${#item} > max_len )) && max_len=${#item}
    done
    local col_width=$((max_len + 2))
    
    # Calculate prefix for CSS paths based on depth
    local prefix=""
    if [[ "$is_top" -eq 0 ]]; then
        local actual_depth=$((depth + 1))
        for ((i=0; i<actual_depth; i++)); do 
            prefix="../$prefix"
        done
    fi
    # Set CSS path
    local css_path="typography.css"
    [[ -n "$prefix" ]] && css_path="${prefix}typography.css"
    
    # Output header
    cat <<EOF
#+HTML_HEAD: <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ubuntu+Sans+Mono:wght@400;700&display=swap">
#+HTML_HEAD: <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap">
#+HTML_HEAD: <link rel="stylesheet" type="text/css" href="$css_path" />
#+HTML_HEAD: <link rel="stylesheet" type="text/css" href="${css_path%typography.css}ctree-highlight.css" />
#+HTML_HEAD: <script src="${css_path%typography.css}ctree-highlight.js"></script>
#+OPTIONS: toc:nil num:nil html-postamble:nil

#+BEGIN_EXPORT html
<div style="background: #232627; color: #ffffff; font-family: 'Ubuntu Sans Mono', monospace; font-size: 16px; padding: 8px; border-radius: 0; margin-bottom: 20px;">
<div style="margin-bottom: 10px;">guest@rkulskis.github.io:$cwd\$ echo LINKS: \$(ls -a)</div>
<div style="border-left: 4px solid #1d99f3; padding-left: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(${col_width}ch, 1fr)); gap: 0;">LINKS: 
EOF

    # Generate links
    for item in "${items_order[@]}"; do
        IFS='|' read -r link type orig_name <<< "${items_map[$item]}"
        local underline="text-decoration: none;" color="#FFFFFF" style=""
        [[ -n "$CURRENT_PAGE" && "$CURRENT_PAGE" == "$orig_name" ]] && underline="text-decoration: underline;"
        
        case "$type" in
            dir) color="#1d99f3"; style="font-weight: bold;" ;;
            link) color="#1abc9c"; style="font-weight: bold;" ;;
        esac
        
        printf '<span style="white-space: pre;"><a href="%s" style="color: %s; %s %s">%s</a>%-*s</span>\n' \
            "$link" "$color" "$style" "$underline" "$item" $((col_width - ${#item})) ""
    done
    
    echo "</div></div>
#+END_EXPORT
"
}

# Create build file with header
create_build_file() {
    local source="$1" build="$2" dir="$3" is_top="$4"
    mkdir -p "$(dirname "$build")"
    
    CURRENT_PAGE=$(get_current_page "$source" "$dir")
    local rel_path=$(realpath --relative-to="$(realpath "$(dirname "$build")")" "$(realpath "$source")")
    
    { generate_header "$dir" "$is_top"; echo "#+INCLUDE: \"$rel_path\""; } > "$build"
}

# Export org to HTML
export_html() {
    emacs --batch --load ./.github/workflows/elisp/batch-htmlize.el "$1"
}

# Process directory recursively
process_files() {
    local dir="$1" is_top="$2"
    local build_subdir="${dir#./}"
    [[ "$is_top" -eq 1 ]] && build_subdir="$BUILD_DIR" || build_subdir="$BUILD_DIR/${build_subdir%/}"
    
    mkdir -p "$build_subdir"
    
    # Process .org files
    for source in "$dir"/*.org; do
        [[ -e "$source" ]] || continue
        local build="$build_subdir/$(basename "$source")"
        create_build_file "$source" "$build" "$dir" "$is_top"
        export_html "$build"
    done
    
    # Create index.html symlink if needed
    if [[ ! -e "$build_subdir/index.org" && ! -e "$build_subdir/index.html" ]]; then
        local html=$(find "$build_subdir" -maxdepth 1 -type f -name "*.html" ! -name "index.html" | head -n 1)
        [[ -n "$html" ]] && ln -sf "$(basename "$html")" "$build_subdir/index.html"
    fi
    
    # Recurse into subdirectories
    for subdir in "$dir"/*/; do
        [[ -d "$subdir" && "$(basename "$subdir")" != "$BUILD_DIR" ]] && process_files "$subdir" 0
    done
}

# Main
[[ $# -eq 1 && "$1" == "build" ]] || { echo "Usage: $0 build"; exit 1; }

rm -rf _minted-index "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
process_files "." 1
echo "Build complete. Output in $BUILD_DIR/"

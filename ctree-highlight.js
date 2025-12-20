// ctree-highlight.js
document.addEventListener("DOMContentLoaded", function () {
  // Function to parse ctree implicit format
  function parseCtreeImplicit(text) {
    const lines = text.split('\n');
    const result = [];
    
    for (let line of lines) {
      if (!line.trim()) {
        result.push('');
        continue;
      }
      
      // Check for comment (everything after ' # ')
      let commentMatch = line.match(/^(.+?)( # .+)$/);
      let mainPart = commentMatch ? commentMatch[1] : line;
      let commentPart = commentMatch ? commentMatch[2] : '';
      
      // Count trailing spaces before comment
      let spaceMatch = mainPart.match(/^(.+?)( *)$/);
      let content = spaceMatch ? spaceMatch[1] : mainPart;
      let spaces = spaceMatch ? spaceMatch[2].length : 0;
      
      // Determine file type based on trailing spaces
      let fileType = null;
      if (spaces === 0) fileType = 'dir';
      else if (spaces === 1) fileType = 'link';
      else if (spaces === 2) fileType = 'socket';
      else if (spaces === 3) fileType = 'fifo';
      else if (spaces === 4 || spaces === 5) fileType = 'device';
      else if (spaces === 6) fileType = 'exec';
      else if (spaces === 7) fileType = null; // regular file, no color
      
      // Apply color class if needed
      let styledContent = content;
      if (fileType) {
        // Extract tree characters and actual name
        let treeMatch = content.match(/^((?:[ │├└]|[─├└]{3} )*)(.*)/);
        if (treeMatch) {
          let treeChars = treeMatch[1];
          let name = treeMatch[2];
          styledContent = treeChars + '<span class="ctree-' + fileType + '">' + 
                         escapeHtml(name) + '</span>';
        } else {
          styledContent = '<span class="ctree-' + fileType + '">' + 
                         escapeHtml(content) + '</span>';
        }
      } else {
        styledContent = escapeHtml(content);
      }
      
      // Add comment if present
      if (commentPart) {
        styledContent += '<span class="ctree-comment">' + 
                        escapeHtml(commentPart) + '</span>';
      }
      
      result.push(styledContent);
    }
    
    return result.join('\n');
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Find all pre.src.src-ctree blocks
  document.querySelectorAll("pre.src.src-ctree").forEach(pre => {
    const parsed = parseCtreeImplicit(pre.textContent);
    pre.innerHTML = parsed;
  });
});

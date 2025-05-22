;; Add htmlize to load-path dynamically
(let* ((default-directory (expand-file-name "./.emacs.d/elpa/"))
       (htmlize-dir (car (directory-files default-directory t "^htmlize-[0-9.]+$"))))
  (when htmlize-dir
    (add-to-list 'load-path htmlize-dir)))

(require 'org)
(require 'htmlize)

(setq org-html-htmlize-output-type 'inline-css)

;; Set custom faces (optional, you can tweak colors)
(custom-set-faces
 '(default                      ((t (:foreground "#ffffff" :background "black"))))
 '(font-lock-builtin-face       ((t (:foreground "#ff0000"))))
 '(font-lock-comment-face       ((t (:foreground "#b22222"))))
 '(font-lock-constant-face      ((t (:foreground "magenta"))))
 '(font-lock-function-name-face ((t (:foreground "#0000ff"))))
 '(font-lock-keyword-face       ((t (:foreground "#a020f0"))))
 '(font-lock-string-face        ((t (:foreground "light blue"))))
 '(font-lock-type-face          ((t (:foreground "#228b22"))))
 '(font-lock-variable-name-face ((t (:foreground "#a0522d"))))
 '(font-lock-warning-face       ((t (:foreground "red")))))

(setq htmlize-use-rgb-map 'force)

;; Open the org file passed as first command-line arg
(let ((file (pop command-line-args-left)))
  (find-file file)
  ;; Export to HTML with inline CSS and print output file path
  (let ((output (org-html-export-to-html)))
    (message "Exported %s to %s" file output)))

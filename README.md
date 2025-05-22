# Simple personal website

This template allows you to present information about yourself in an
easy, quick way with minimal files or thoughts about code. Simply
create a `file.org` in your repo tree, and run top-level `make` to
compile the website locally (this is done automatically for each commit
to origin using a GitHub workflow).

Every compiled HTML has a header with a unix-like listing of files
which you can traverse (i.e. use `../` to goes up a directory). Each
directory main page corresponds to an `index.org`. If none is provided,
it defaults to create just the header with a link to your compiled HTML
files in the directory. Enjoy!

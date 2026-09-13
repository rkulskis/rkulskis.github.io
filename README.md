# Simple personal website

This repo is just content: `.org` files, images and a `website.conf`.
[website_dot_org](https://github.com/plumbus-tech/website_dot_org)
compiles it into the site on every push to `main` (see
`.github/workflows/pages.yml`).

Every page has a header with a unix-like listing of files which you can
traverse (i.e. use `..` to go up a directory). Each directory's main
page is its `index.org`; if none is provided, the page is just the
header.

Preview locally:

```sh
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/site" \
    ghcr.io/plumbus-tech/website_dot_org build . build
python3 -m http.server -d build
```

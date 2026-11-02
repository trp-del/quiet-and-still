#!/bin/sh
# Builds the zip Logseq installs, by hand, with no GitHub Actions: sh scripts/release.sh
# The zip holds one folder, quiet-and-still/, with what Logseq loads: package.json, icon.svg, README.md and the built
# dist/index.html and dist/index.js. It is written to dist/quiet-and-still-v<version>.zip, the version read from
# package.json. Then tag v<version>, push, and attach the zip to a GitHub release of that tag. Logseq's
# "Install plugin from GitHub release" takes the latest release's zip.
set -eu
cd "$(dirname "$0")/.."
version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -1)
[ -n "$version" ] || { echo "no version in package.json"; exit 1; }
npm run build --silent
stage=dist/stage/quiet-and-still
rm -rf dist/stage && mkdir -p "$stage/dist"
cp package.json icon.svg README.md "$stage/"
cp dist/index.html dist/index.js "$stage/dist/"
zipfile="dist/quiet-and-still-v$version.zip"
rm -f "$zipfile"
(cd dist/stage && zip -q -r -X "../../$zipfile" quiet-and-still)
rm -rf dist/stage
echo "built $zipfile ($(du -h "$zipfile" | cut -f1)); tag it v$version"

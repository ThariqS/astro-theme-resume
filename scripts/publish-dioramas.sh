#!/bin/sh
# Copy the pixel dioramas the site uses from the lab (where they're made) into public/ (where they're served).
#   sh scripts/publish-dioramas.sh
# The homepage banner's scene list lives in src/components/DioramaBanner.astro; keep the two in step.
set -e
cd "$(dirname "$0")/.."
SCENES="ring-world laundromat wheat-lighthouse"
mkdir -p public/dioramas/lib
cp lab/dioramas/lib/runtime.js lab/dioramas/lib/util.js lab/dioramas/lib/pix.js public/dioramas/lib/
for s in $SCENES; do
  mkdir -p "public/dioramas/$s"
  cp "lab/dioramas/$s/index.html" "lab/dioramas/$s/main.js" "public/dioramas/$s/"
done
echo "published: $SCENES"

#!/bin/bash
set -e
cd "$(dirname "$0")/../src/icons"

# resvg, not ImageMagick: magick's internal SVG renderer silently drops the
# arrow path and leaves only the boxes.
for size in 16 32 48 128; do
  resvg -w "$size" -h "$size" icon.svg "icon-$size.png"
done

#!/bin/bash
set -e
cd "$(dirname "$0")/../src/icons"

# resvg, not ImageMagick: magick's internal SVG renderer silently drops the
# arrow path and leaves only the boxes.

# Toolbar: the site's favicon (paper card), readable at small sizes.
for size in 16 32; do
  resvg -w "$size" -h "$size" icon.svg "icon-$size.png"
done

# Extension icon: the site's app icon (ink-down tile).
for size in 48 96; do
  resvg -w "$size" -h "$size" icon-app.svg "icon-$size.png"
done

# The Chrome Web Store asks for 96x96 artwork inside a 128x128 canvas with
# 16px of transparent padding.
resvg -w 96 -h 96 icon-app.svg icon-app-96.tmp.png
magick -size 128x128 xc:none icon-app-96.tmp.png -gravity center -composite PNG32:icon-128.png
rm icon-app-96.tmp.png

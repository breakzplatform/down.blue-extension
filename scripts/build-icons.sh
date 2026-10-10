#!/bin/bash
set -e
cd "$(dirname "$0")/../src/icons"

magick -background none icon.svg -resize 16x16 icon-16.png
magick -background none icon.svg -resize 32x32 icon-32.png
magick -background none icon.svg -resize 48x48 icon-48.png
magick -background none icon.svg -resize 128x128 icon-128.png

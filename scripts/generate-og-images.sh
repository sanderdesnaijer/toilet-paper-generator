#!/usr/bin/env bash

set -euo pipefail

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick is required. Install it and rerun this script."
  exit 1
fi

SOURCE="public/logo.png"
TARGET_DIR="public/og"

mkdir -p "${TARGET_DIR}"

magick "${SOURCE}" -resize "1200x630^" -gravity center -extent 1200x630 -quality 88 "${TARGET_DIR}/og-image-1200x630.webp"
magick "${SOURCE}" -resize "1600x900^" -gravity center -extent 1600x900 -quality 88 "${TARGET_DIR}/og-image-1600x900.webp"
echo "Generated OG images in ${TARGET_DIR}"


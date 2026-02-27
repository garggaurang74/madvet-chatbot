#!/bin/bash
# Run this once from your project root to download fonts into public/fonts/
mkdir -p public/fonts

curl -L "https://fonts.gstatic.com/s/oswald/v53/TK3iWkUHHAIjg752GT8Dl-1pkiHLQoiFwdk.woff" \
  -o public/fonts/oswald-bold.woff

curl -L "https://fonts.gstatic.com/s/notosansdevanagari/v26/TuGOUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b6RFZz-SyFsRGMxDwF4FqhCO.woff" \
  -o public/fonts/noto-devanagari.woff

curl -L "https://fonts.gstatic.com/s/barlowcondensed/v12/HTxwL3I-JCGChYJ8VI-L6OO_au7B467nGYUAuAU.woff" \
  -o public/fonts/barlow-condensed.woff

echo "Fonts downloaded:"
ls -lah public/fonts/

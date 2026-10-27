#!/usr/bin/env bash
# بناء FFmpeg/ffprobe لماك بترخيص LGPLv3 (الدستور VI، research.md R4، T006).
# يُشغَّل على macOS (محلياً أو في CI macos-latest). لا --enable-gpl، لا x264/x265/libfdk_aac.
# المخرجات: resources/ffmpeg/darwin-<arch>/{ffmpeg,ffprobe,LICENSES/,BUILD-INFO.txt}
set -euo pipefail

FFMPEG_TAG="${FFMPEG_TAG:-n8.1.3}"          # نفس فرع BtbN المستخدم لويندوز (scripts/ffmpeg-build/fetch-win.sh)
ARCH="$(uname -m)"                           # arm64 | x86_64
case "$ARCH" in arm64) OUT_ARCH=arm64 ;; x86_64) OUT_ARCH=x64 ;; *) echo "arch غير مدعوم: $ARCH" >&2; exit 1 ;; esac
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/resources/ffmpeg/darwin-$OUT_ARCH"
WORK="${WORK:-$ROOT/out/ffmpeg-build-$OUT_ARCH}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "هذا السكربت يعمل على macOS فقط (يحتاج VideoToolbox). على Linux استخدم fetch-win.sh لجلب linux64-lgpl للتطوير." >&2
  exit 2
fi

command -v brew >/dev/null || { echo "Homebrew مطلوب: https://brew.sh" >&2; exit 1; }
# مكتبات متساهلة الترخيص فقط: opus (BSD-3)، zimg (WTFPL)، pkg-config، nasm للبناء.
brew list opus >/dev/null 2>&1 || brew install opus
brew list zimg >/dev/null 2>&1 || brew install zimg
brew list pkg-config >/dev/null 2>&1 || brew install pkg-config
brew list nasm >/dev/null 2>&1 || brew install nasm

mkdir -p "$WORK" "$OUT/LICENSES"
cd "$WORK"
if [[ ! -d ffmpeg ]]; then
  git clone --depth 1 --branch "$FFMPEG_TAG" https://git.ffmpeg.org/ffmpeg.git ffmpeg
fi
cd ffmpeg

# --enable-version3 → LGPLv3 (يسمح بـ opus/zimg). ممنوع: --enable-gpl، --enable-nonfree.
./configure \
  --prefix="$WORK/prefix" \
  --enable-version3 \
  --disable-gpl --disable-nonfree \
  --disable-debug --disable-doc \
  --disable-ffplay \
  --enable-static --disable-shared \
  --enable-pic \
  --enable-libopus \
  --enable-libzimg \
  --enable-videotoolbox \
  --enable-audiotoolbox \
  --pkg-config-flags="--static"

if ./ffbuild/config.sh 2>/dev/null | grep -q -- '--enable-gpl' ; then echo "خطأ: البناء يحوي --enable-gpl" >&2; exit 1; fi
make -j"$(sysctl -n hw.ncpu)"
make install

cp "$WORK/prefix/bin/ffmpeg" "$WORK/prefix/bin/ffprobe" "$OUT/"
chmod +x "$OUT/ffmpeg" "$OUT/ffprobe"

# فحص الترخيص على الثنائي الناتج (T006): لا gpl في buildconf، والترخيص LGPL version 3
"$OUT/ffmpeg" -hide_banner -buildconf 2>&1 | tee "$OUT/BUILD-INFO.txt"
if grep -q -- '--enable-gpl' "$OUT/BUILD-INFO.txt"; then echo "خطأ: buildconf يحوي --enable-gpl" >&2; exit 1; fi
"$OUT/ffmpeg" -hide_banner -L 2>&1 | head -3 | tee -a "$OUT/BUILD-INFO.txt"
"$OUT/ffmpeg" -hide_banner -L 2>&1 | grep -q 'Lesser General Public License (LGPL) version 3' || { echo "خطأ: الترخيص ليس LGPLv3" >&2; exit 1; }
"$OUT/ffmpeg" -hide_banner -encoders 2>&1 | grep -E 'h264_videotoolbox|aac' | tee -a "$OUT/BUILD-INFO.txt"

cp COPYING.LGPLv3 "$OUT/LICENSES/COPYING.LGPLv3"
cp COPYING.LGPLv2.1 "$OUT/LICENSES/COPYING.LGPLv2.1"
cp "$(brew --prefix opus)/COPYING" "$OUT/LICENSES/opus-COPYING" 2>/dev/null || true
cp "$(brew --prefix zimg)/COPYING" "$OUT/LICENSES/zimg-COPYING" 2>/dev/null || true
{
  echo "source: https://git.ffmpeg.org/ffmpeg.git tag $FFMPEG_TAG"
  echo "built: $(date -u +%Y-%m-%dT%H:%M:%SZ) on $(sw_vers -productVersion) $ARCH"
  echo "script: scripts/ffmpeg-build/build-mac.sh (this file is published with the app, LGPL §4 compliance)"
} > "$OUT/LICENSES/SOURCE.txt"
shasum -a 256 "$OUT/ffmpeg" "$OUT/ffprobe" | tee "$OUT/SHA256SUMS"
echo "تم: $OUT"

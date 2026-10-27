#!/usr/bin/env bash
# جلب FFmpeg LGPL الجاهز من BtbN (T005): win64 للشحن مع نسخة ويندوز، وlinux64 للتطوير وCI فقط.
# الوسم والبصمات مثبّتة في ffmpeg.lock؛ أي تحديث = تعديل اللوك بعد التحقق اليدوي.
# الاستخدام: fetch-win.sh [win|linux|all]   (الافتراضي: all)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK="$ROOT/scripts/ffmpeg-build/ffmpeg.lock"
WHAT="${1:-all}"
# shellcheck disable=SC1090
source "$LOCK"   # يعرّف: BTBN_TAG, WIN_ASSET, WIN_SHA256, LINUX_ASSET, LINUX_SHA256
BASE="https://github.com/BtbN/FFmpeg-Builds/releases/download/$BTBN_TAG"
TMP="$ROOT/out/ffmpeg-fetch"; mkdir -p "$TMP"

fetch() { # $1=asset $2=sha $3=outdir $4=kind(win|linux)
  local asset="$1" sha="$2" outdir="$3" kind="$4" file="$TMP/$1"
  if [[ -x "$outdir/ffmpeg" || -x "$outdir/ffmpeg.exe" ]] && [[ -f "$outdir/SHA256SUMS" ]] && grep -q "$sha" "$outdir/SHA256SUMS"; then
    echo "موجود ومطابق: $outdir"; return 0
  fi
  if [[ -f "$file" ]] && echo "$sha  $file" | sha256sum -c --quiet 2>/dev/null; then
    echo "الأرشيف موجود ومطابق: $asset"
  else
    echo "تنزيل $asset"
    curl -sSL --retry 5 --retry-delay 5 -o "$file" "$BASE/$asset"
    echo "$sha  $file" | sha256sum -c --quiet || { echo "بصمة SHA-256 خاطئة لـ $asset — أوقف." >&2; rm -f "$file"; exit 1; }
  fi
  rm -rf "$outdir"; mkdir -p "$outdir/LICENSES"
  local x="$TMP/x-$kind"; rm -rf "$x"; mkdir -p "$x"
  if [[ "$kind" == win ]]; then unzip -q "$file" -d "$x"; else tar -xJf "$file" -C "$x"; fi
  local inner; inner="$(find "$x" -maxdepth 1 -mindepth 1 -type d | head -1)"
  if [[ "$kind" == win ]]; then
    cp "$inner/bin/ffmpeg.exe" "$inner/bin/ffprobe.exe" "$outdir/"
  else
    cp "$inner/bin/ffmpeg" "$inner/bin/ffprobe" "$outdir/"; chmod +x "$outdir/ffmpeg" "$outdir/ffprobe"
  fi
  cp "$inner/LICENSE.txt" "$outdir/LICENSES/LICENSE.txt" 2>/dev/null || true
  [[ -d "$inner/doc" ]] && cp -r "$inner/doc" "$outdir/doc" || true
  # فحص الترخيص على الثنائي قبل اعتماده: لا gpl في buildconf (الدستور VI). FFmpeg يطبع -L و-buildconf على stderr.
  if [[ "$kind" == linux ]]; then
    "$outdir/ffmpeg" -hide_banner -buildconf > "$outdir/BUILD-INFO.txt" 2>&1
    if grep -q -- '--enable-gpl' "$outdir/BUILD-INFO.txt"; then echo "خطأ: buildconf يحوي --enable-gpl" >&2; rm -rf "$outdir"; exit 1; fi
    "$outdir/ffmpeg" -hide_banner -L 2>&1 | head -5 >> "$outdir/BUILD-INFO.txt"
    grep -q 'Lesser General Public License' "$outdir/BUILD-INFO.txt" || { echo "خطأ: الترخيص ليس LGPL" >&2; rm -rf "$outdir"; exit 1; }
  fi
  {
    echo "$sha  $asset"
    echo "source: BtbN/FFmpeg-Builds $BTBN_TAG ($asset) — LGPLv3 (no --enable-gpl)"
    echo "fetched: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$outdir/SHA256SUMS"
  echo "تم: $outdir"
}

case "$WHAT" in
  win)   fetch "$WIN_ASSET" "$WIN_SHA256" "$ROOT/resources/ffmpeg/win32-x64" win ;;
  linux) fetch "$LINUX_ASSET" "$LINUX_SHA256" "$ROOT/resources/ffmpeg/linux-x64" linux ;;
  all)   fetch "$LINUX_ASSET" "$LINUX_SHA256" "$ROOT/resources/ffmpeg/linux-x64" linux; fetch "$WIN_ASSET" "$WIN_SHA256" "$ROOT/resources/ffmpeg/win32-x64" win ;;
  *) echo "استخدام: $0 [win|linux|all]" >&2; exit 2 ;;
esac

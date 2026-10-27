#!/usr/bin/env bash
# توليد عيّنات الاختبار الاصطناعية (T095، القرار 25) بـ FFmpeg النظامي أو المجلوب.
# لا تسجيلات بشرية هنا؛ مقاطع الكلام (talk-ar-*) تُعتمد من المالك ثم تُجلب بـ fetch.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/tests/fixtures"
# التوليد يحتاج مشفّر H.264 برمجياً. بناؤنا LGPL بلا x264 عمداً (الدستور VI)، لذا نستخدم ffmpeg النظام
# (أداة تطوير فقط، لا تُشحن) إن وُجد فيه libx264/openh264؛ وإلا المشفّر العتادي في بنائنا.
FF="${FFMPEG:-}"
VENC="${VENC:-}"
pick() { local f="$1"; [[ -x "$f" ]] || return 1; local enc; enc="$("$f" -hide_banner -encoders 2>&1)"
  for e in libx264 libopenh264 h264_videotoolbox h264_nvenc h264_vaapi; do grep -qE " $e " <<<"$enc" && { FF="$f"; VENC="$e"; return 0; }; done; return 1; }
if [[ -z "$FF" ]]; then
  for c in "$(command -v ffmpeg || true)" "$ROOT/resources/ffmpeg/darwin-arm64/ffmpeg" "$ROOT/resources/ffmpeg/darwin-x64/ffmpeg" "$ROOT/resources/ffmpeg/linux-x64/ffmpeg"; do
    [[ -n "$c" ]] && pick "$c" && break
  done
fi
[[ -n "$FF" && -n "$VENC" ]] || { echo "لا يوجد ffmpeg بمشفّر H.264 (libx264/openh264/عتادي) لتوليد العيّنات؛ ثبّت ffmpeg النظام (apt install ffmpeg / brew install ffmpeg)" >&2; exit 1; }
echo "ffmpeg: $FF (مشفّر $VENC)"
PRESET=(); [[ "$VENC" == libx264 ]] && PRESET=(-preset ultrafast)
mkdir -p "$OUT"
gen() { local name="$1"; shift; if [[ -f "$OUT/$name" ]]; then echo "موجود: $name"; else echo "توليد: $name"; "$FF" -hide_banner -loglevel error -y "$@" "$OUT/$name"; fi; }

# عيّنات صغيرة لاختبارات التكامل (probe/audio/mux) — ثوانٍ قليلة
gen tiny-5s.mp4           -f lavfi -i "testsrc2=size=320x180:rate=30" -f lavfi -i "sine=frequency=440:sample_rate=48000" -t 5 -c:v "$VENC" "${PRESET[@]}" -pix_fmt yuv420p -c:a aac -b:a 64k -movflags +faststart
gen tiny-noaudio-5s.mp4   -f lavfi -i "testsrc2=size=320x180:rate=30" -t 5 -an -c:v "$VENC" "${PRESET[@]}" -pix_fmt yuv420p -movflags +faststart
gen tiny-ntsc-5s.mp4      -f lavfi -i "testsrc2=size=320x180:rate=30000/1001" -f lavfi -i "sine=frequency=440:sample_rate=48000" -t 5 -c:v "$VENC" "${PRESET[@]}" -pix_fmt yuv420p -c:a aac -b:a 64k
# VFR: إسقاط إطارات بشكل غير منتظم ثم -fps_mode vfr → طوابع زمنية متغيرة (القرار 13)
gen tiny-vfr-5s.mp4       -f lavfi -i "testsrc2=size=320x180:rate=30" -t 5 -vf "select='not(mod(n,7))+not(mod(n,3))'" -fps_mode vfr -an -c:v "$VENC" "${PRESET[@]}" -pix_fmt yuv420p
# الدوران: -display_rotation خيار إدخال، فنولّد 180×320 ثم نعيد الحزم مع علامة دوران 90 (كما تفعل الجوالات)
if [[ ! -f "$OUT/tiny-rotated-5s.mp4" ]]; then echo "توليد: tiny-rotated-5s.mp4"
  "$FF" -hide_banner -loglevel error -y -f lavfi -i "testsrc2=size=180x320:rate=30" -t 5 -an -c:v "$VENC" "${PRESET[@]}" -pix_fmt yuv420p "$OUT/.rot-tmp.mp4"
  "$FF" -hide_banner -loglevel error -y -display_rotation 90 -i "$OUT/.rot-tmp.mp4" -c copy "$OUT/tiny-rotated-5s.mp4" && rm -f "$OUT/.rot-tmp.mp4"
else echo "موجود: tiny-rotated-5s.mp4"; fi

# الحالات الحدّية في quickstart (FR-019، FR-022، القرار 24)
gen music-only.mp4        -f lavfi -i "color=c=0x202830:size=1280x720:rate=30" -f lavfi -i "sine=frequency=220:sample_rate=48000,aeval=val(0)*0.3*(1+sin(2*PI*t*0.5))" -t 60 -c:v "$VENC" "${PRESET[@]}" -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart
gen long-16min.mp4        -f lavfi -i "testsrc2=size=320x180:rate=30" -f lavfi -i "anullsrc=r=48000:cl=mono" -t 970 -c:v "$VENC" "${PRESET[@]}" -pix_fmt yuv420p -c:a aac -b:a 32k -movflags +faststart
gen phone-4k.mp4          -f lavfi -i "testsrc2=size=3840x2160:rate=30" -f lavfi -i "anullsrc=r=48000:cl=stereo" -t 3 -c:v "$VENC" "${PRESET[@]}" -pix_fmt yuv420p -c:a aac -b:a 64k

# مقطع 15 دقيقة 1080p30 لقياس S3/S8 (ذاكرة المعاينة، زمن -count_frames) — بلا كلام
gen synthetic-15min-1080p.mp4 -f lavfi -i "testsrc2=size=1920x1080:rate=30" -f lavfi -i "sine=frequency=330:sample_rate=48000" -t 900 -c:v "$VENC" "${PRESET[@]}" -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart

echo "تم. العيّنات في $OUT (الكبيرة خارج git)."

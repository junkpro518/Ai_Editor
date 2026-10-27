#!/usr/bin/env bash
# جلب عيّنات الاختبار الحقيقية (تسجيلات كلام) بالبصمة من fixtures.lock (T095، القرار 25).
# الصيغة في fixtures.lock: <اسم الملف> <sha256> <رابط> <ترخيص>
# لا يُضاف أي ملف هنا قبل موافقة المالك على المرشح (القرار 25).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/tests/fixtures"
LOCK="$ROOT/scripts/fixtures/fixtures.lock"
mkdir -p "$OUT"
[[ -f "$LOCK" ]] || { echo "لا يوجد fixtures.lock بعد — مقاطع الكلام بانتظار موافقة المالك (tests/fixtures/README.md)."; exit 0; }
grep -vE '^\s*(#|$)' "$LOCK" | while read -r name sha url license; do
  dest="$OUT/$name"
  if [[ -f "$dest" ]] && echo "$sha  $dest" | sha256sum -c --quiet 2>/dev/null; then echo "موجود وصحيح: $name"; continue; fi
  echo "تنزيل: $name ($license) من $url"
  curl -sSL --retry 5 --retry-delay 3 -o "$dest.part" "$url"
  echo "$sha  $dest.part" | sha256sum -c --quiet || { echo "بصمة خاطئة: $name" >&2; rm -f "$dest.part"; exit 1; }
  mv "$dest.part" "$dest"
done
echo "تم."

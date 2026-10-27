# ثنائيات FFmpeg (خارج git)

- `win32-x64/`: BtbN `win64-lgpl` مثبّت بالوسم والبصمة في `scripts/ffmpeg-build/ffmpeg.lock` → `pnpm ffmpeg:fetch win`.
- `linux-x64/`: BtbN `linux64-lgpl` **للتطوير وCI فقط** (لا يُشحن؛ مستثنى في `electron-builder.yml`) → `pnpm ffmpeg:fetch linux`.
- `darwin-arm64/`، `darwin-x64/`: بناء ذاتي LGPLv3 على ماك → `pnpm ffmpeg:build-mac` (T006).

كل مجلد يحوي `ffmpeg`، `ffprobe`، `LICENSES/`، `SHA256SUMS`، `BUILD-INFO.txt` (buildconf بلا `--enable-gpl`). الدستور VI: FFmpeg عملية منفصلة، LGPL فقط، لا x264/x265/libfdk_aac.

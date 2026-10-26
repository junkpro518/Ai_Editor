# https://x.com/kebura_p/status/2095736887034212809?s=46&t=ZCUUW3Z_ndyn4Iqtzmj4ng

**الملف الأصلي:** `https:::x.com:kebura_p:status:2095736887034212809?s=46&t=ZCUUW3Z_ndyn4Iqtzmj4ng.txt`  
**المصدر:** الأرشيف  
**جُلب:** 2026-10-26 عبر fxtwitter

---

**الكاتب:** shogo kajiyama (@kebura_P)  
**التاريخ:** Fri Sep 04 04:53:05 +0000 2026

FFmpegをAIエージェントからちゃんと使えるようにするSkillを作りました。

「この動画を9:16にして」
「無音部分をカットして」
「字幕を入れて」
「iPhoneのHDRをSDRにして」
「X向けに書き出して」

みたいな指示をするだけで、FFmpeg/ffprobeを使って処理。

単なるコマンド集ではなく、

・まず素材をprobe
・可能なら無劣化処理
・必要な場合だけ再エンコード
・処理後に結果を検証
・納品仕様もチェック

までAIにやらせる構成。

Claude Code / Cursor / Codex対応。
MCPも入れてます。

しかもローカル処理なので、動画をクラウドにアップロードする必要なし。

「AIに動画編集させたいけど、FFmpegが面倒」という人向け。

https://github.com/kajisho5/ffmpeg-skill

**روابط:**
- https://github.com/kajisho5/ffmpeg-skill

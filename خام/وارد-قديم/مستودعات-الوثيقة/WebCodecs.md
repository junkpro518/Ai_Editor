# WebCodecs

**الرابط:** https://github.com/w3c/webcodecs  
**لماذا في الوثيقة:** تقنية (§11) فك/ترميز في المتصفح  
**جُلب:** 2026-10-26

---

## بيانات المستودع

- **archived:** False
- **description:** WebCodecs is a flexible web API for encoding and decoding audio and video.
- **forks:** 193
- **full_name:** w3c/webcodecs
- **homepage:** https://w3c.github.io/webcodecs/
- **language:** HTML
- **license:** NOASSERTION
- **pushed_at:** 2026-10-26T15:10:50Z
- **stars:** 1299
- **topics:** []

## README (كامل)

# WebCodecs

The [WebCodecs API](https://w3c.github.io/webcodecs/) allows web applications
to encode and decode audio and video.

Many Web APIs use media codecs internally to support APIs for particular uses:
- HTMLMediaElement and Media Source Extensions
- WebAudio (decodeAudioData)
- MediaRecorder
- WebRTC

But there’s no general way to flexibly configure and use these media codecs.
Because of this, many web applications have resorted to implementing
media codecs in JavaScript or WebAssembly, despite the disadvantages:
- Increased bandwidth to download codecs already in the browser.
- Reduced performance
- Reduced power efficiency

It's great for:
- Live streaming
- Cloud gaming
- Media file editing and transcoding

See the [explainer](https://github.com/w3c/webcodecs/blob/main/explainer.md) for more info.

## Code samples

Please see https://w3c.github.io/webcodecs/samples/

## WebCodecs registries

This repository also contains two registries:

* The [WebCodecs Codec Registry](https://w3c.github.io/webcodecs/codec_registry.html)
provides the means to identify and avoid collisions among codec strings
used in WebCodecs and provides a mechanism to define codec-specific members of
WebCodecs codec configuration dictionaries. Codec-specific registrations entered
in the registry are also maintained in the repository, please refer to the
registry for a comprehensive list.

* The [WebCodecs VideoFrame Metadata Registry](https://w3c.github.io/webcodecs/video_frame_metadata_registry.html)
enumerates the metadata fields that can be attached to
[VideoFrame](https://w3c.github.io/webcodecs/#videoframe-interface) objects via the
[VideoFrameMetadata](https://w3c.github.io/webcodecs/#dictdef-videoframemetadata) dictionary.
Metadata registrations entered in the registry may be maintained in this repository
or elsewhere. Please refer to the registry for a comprehensive list.

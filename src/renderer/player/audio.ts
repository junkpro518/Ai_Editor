import type { Rational } from '../../core/time';
import { frameToUs, usToFrame } from '../../core/time';

/** مسار الصوت: عنصر <audio> على نفس media:// هو ساعة التشغيل؛ الفيديو يتبعه. */
export interface AudioTrack {
  seekTo(frameIndex: number): void;
  play(): Promise<void>;
  pause(): void;
  currentFrame(): number;
  dispose(): void;
}

export function createAudio(url: string, fps: Rational): AudioTrack {
  const el = document.createElement('audio');
  el.preload = 'auto';
  el.src = url;
  return {
    seekTo(frameIndex) {
      el.currentTime = frameToUs(frameIndex, fps) / 1e6;
    },
    play: () => el.play(),
    pause: () => el.pause(),
    currentFrame: () => usToFrame(Math.max(0, Math.round(el.currentTime * 1e6)), fps),
    dispose() {
      el.pause();
      el.removeAttribute('src');
      el.load();
    },
  };
}

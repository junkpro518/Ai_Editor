import { rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { ProjectDocument, Transcript } from '../../core/contracts/types';
import { fromDeepgram } from '../../core/transcript/providers/deepgram';
import { fromElevenLabs } from '../../core/transcript/providers/elevenlabs';
import type { ConvertMeta } from '../../core/transcript/providers/types';
import { extractUploadAudio } from '../ffmpeg/audio';
import type { FfmpegBins } from '../ffmpeg/paths';
import { transcribe } from '../providers';
import type { ProviderName } from '../providers';
import type { Secrets } from '../secrets';
import type { SettingsStore } from '../storage/settings';

export type JobState = ProjectDocument['transcriptJob']['state'];

export interface JobDeps {
  bins: FfmpegBins;
  secrets: Secrets;
  settings: SettingsStore;
  /** <userData>/projects/<id>/cache — الصوت المؤقت والاستجابة الخام */
  projectCacheDir: string;
  sourcePath: string;
  provider: ProviderName;
  model: string;
  language: string;
  /** اسم السر في المخزن الآمن؛ الاتفاقية: اسم المزود */
  secretName?: string;
  baseUrl?: string;
  now?: () => string;
  onProgress: (state: JobState, progress: number) => void;
}

const AUDIO_FILE = 'audio.webm';
const RAW_FILE = 'transcript-raw.json';

/**
 * extracting_audio → uploading → transcribing → done | failed (data-model §3).
 * المزوّدان متزامنان (طلب POST واحد): «uploading» يغطي الرحلة الشبكية كلها و«transcribing» التحويل المحلي.
 * المفتاح يُفك داخل withSecret لحظة الطلب فقط ولا يُسجَّل (القرار 18).
 */
export async function runTranscriptionJob(deps: JobDeps, signal?: AbortSignal): Promise<Transcript> {
  const now = deps.now ?? (() => new Date().toISOString());
  const audioPath = join(deps.projectCacheDir, AUDIO_FILE);
  try {
    deps.onProgress('extracting_audio', 0);
    const audio = await extractUploadAudio(deps.bins, deps.sourcePath, audioPath, {
      signal,
      onProgress: (f) => deps.onProgress('extracting_audio', Math.min(0.3, f * 0.3)),
    });

    deps.onProgress('uploading', 0.3);
    const { raw, modelParams } = await deps.secrets.withSecret(deps.secretName ?? deps.provider, (apiKey) =>
      transcribe(deps.provider, { audioPath: audio.path, apiKey, language: deps.language, model: deps.model, baseUrl: deps.baseUrl, signal }),
    );

    deps.onProgress('transcribing', 0.8);
    await writeFile(join(deps.projectCacheDir, RAW_FILE), JSON.stringify(raw));
    let n = 0;
    const meta: ConvertMeta = {
      model: deps.model,
      modelParams,
      audioSha256: audio.sha256,
      createdAt: now(),
      durationUs: audio.durationUs,
      newId: () => `w${String(++n).padStart(6, '0')}`,
    };
    const transcript = deps.provider === 'deepgram' ? fromDeepgram(raw, meta) : fromElevenLabs(raw, meta);
    transcript.rawRef = `${basename(deps.projectCacheDir)}/${RAW_FILE}`; // نسبي لمجلد المشروع

    await rm(audio.path, { force: true }); // FR-017: الصوت يُحذف بعد النجاح، تبقى بصمته فقط
    const settings = await deps.settings.load();
    await deps.settings.save({
      transcription: { sendLog: [...settings.transcription.sendLog, { at: transcript.createdAt, provider: deps.provider, audioDurationUs: audio.durationUs }] },
    });

    deps.onProgress('done', 1);
    return transcript;
  } catch (e) {
    await rm(audioPath, { force: true }); // لا يبقى صوت مستخرج بعد الفشل؛ الاستئناف يعيد الاستخراج (FR-016)
    deps.onProgress('failed', 0);
    throw e;
  }
}

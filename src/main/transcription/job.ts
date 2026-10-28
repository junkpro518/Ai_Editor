import { mkdir, rm, writeFile } from 'node:fs/promises';
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
  const rawPath = join(deps.projectCacheDir, RAW_FILE);
  let rawWritten = false;
  try {
    deps.onProgress('extracting_audio', 0);
    // المجلد للمستخدم وحده (0o700): يحوي صوتاً مستخرجاً مؤقتاً واستجابة المزود الخام (مراجعة US1)
    await mkdir(deps.projectCacheDir, { recursive: true, mode: 0o700 });
    const audio = await extractUploadAudio(deps.bins, deps.sourcePath, audioPath, {
      signal,
      onProgress: (f) => deps.onProgress('extracting_audio', Math.min(0.3, f * 0.3)),
    });

    deps.onProgress('uploading', 0.3);
    const { raw, modelParams } = await deps.secrets.withSecret(deps.secretName ?? deps.provider, (apiKey) =>
      transcribe(deps.provider, { audioPath: audio.path, apiKey, language: deps.language, model: deps.model, baseUrl: deps.baseUrl, signal }),
    );

    // FR-017: سجل الإرسال يُلحق لحظة عودة الرفع — قبل أي تحويل قد يفشل — ولا يُفشل المهمة أبداً (مراجعة US1 #1)
    try {
      const settings = await deps.settings.load();
      await deps.settings.save({
        transcription: { sendLog: [...settings.transcription.sendLog, { at: now(), provider: deps.provider, audioDurationUs: audio.durationUs }] },
      });
    } catch {
      // تعذّر تسجيل الإرسال لا يُسقط التفريغ
    }

    deps.onProgress('transcribing', 0.8);
    rawWritten = true;
    await writeFile(rawPath, JSON.stringify(raw));
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

    deps.onProgress('done', 1);
    return transcript;
  } catch (e) {
    await rm(audioPath, { force: true }); // لا يبقى صوت مستخرج بعد الفشل؛ الاستئناف يعيد الاستخراج (FR-016)
    // الخام الذي كتبته هذه المحاولة فقط؛ خام تفريغ سابق ناجح يبقى لأن transcript.rawRef يشير إليه
    if (rawWritten) await rm(rawPath, { force: true });
    deps.onProgress('failed', 0);
    throw e;
  }
}

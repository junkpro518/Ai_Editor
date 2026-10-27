import type { CommandImpl } from './types';
import { CommandError } from './types';

// هيكل المرحلة 2؛ يُملأ في قصة المستخدم الخاصة به.
export const impl: CommandImpl<'transcript.request'> = () => {
  throw new CommandError('not_implemented', 'الأمر transcript.request لم يُنفَّذ بعد');
};

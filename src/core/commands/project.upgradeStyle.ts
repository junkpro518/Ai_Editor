import type { CommandImpl } from './types';
import { CommandError } from './types';

// هيكل المرحلة 2؛ يُملأ في قصة المستخدم الخاصة به.
export const impl: CommandImpl<'project.upgradeStyle'> = () => {
  throw new CommandError('not_implemented', 'الأمر project.upgradeStyle لم يُنفَّذ بعد');
};

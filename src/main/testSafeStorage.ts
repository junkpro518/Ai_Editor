import type { SafeStorageLike } from './secrets';

/**
 * للاختبار الآلي فقط (AI_EDITOR_TEST=1): على صندوق Linux بلا حلقة مفاتيح يرفض createSecrets خلفية basic_text،
 * فتعجز e2e عن حفظ مفتاح وهمي. هذا «تشفير» نصي صريح في مجلد بيانات مؤقت للاختبار — لا يُستعمل في الإنتاج أبداً
 * (index.ts يختاره فقط عندما isTest).
 */
export function plaintextTestSafeStorage(): SafeStorageLike {
  return {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => 'test_plaintext',
    encryptString: (s) => Buffer.from(s, 'utf8'),
    decryptString: (b) => b.toString('utf8'),
  };
}

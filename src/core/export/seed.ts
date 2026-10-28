/** مولّد عشوائي حتمي صغير (mulberry32) — نفس البذرة تعطي نفس التسلسل على كل الأجهزة. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` فهرساً فريداً مرتباً داخل [0, n) من بذرة المشروع — نقاط فحص التطابق (FR-014، R3 الطبقة 2). */
export function seededIndices(seed: number, n: number, count = 20): number[] {
  if (n <= count) return Array.from({ length: Math.max(0, n) }, (_, i) => i);
  const rnd = mulberry32(seed);
  const picked = new Set<number>();
  while (picked.size < count) picked.add(Math.floor(rnd() * n));
  return [...picked].sort((a, b) => a - b);
}

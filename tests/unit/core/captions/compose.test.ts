import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composeFrame, outputSize } from '../../../../src/core/captions/compose';
import { makeStyle } from '../../../helpers/project';

// سياق 2D مزيّف يسجّل الاستدعاءات بالترتيب — لا canvas حقيقي في Node.
type Call = [string, ...unknown[]];
function fakeCtx(): { calls: Call[]; ctx: CanvasRenderingContext2D } {
  const calls: Call[] = [];
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === 'calls') return calls;
      return (...args: unknown[]) => {
        calls.push([String(prop), ...args]);
      };
    },
    set(_t, prop, value) {
      calls.push(['set:' + String(prop), value]);
      return true;
    },
  };
  return { calls, ctx: new Proxy({}, handler) as unknown as CanvasRenderingContext2D };
}

const FRAME = { tag: 'frame' } as unknown as CanvasImageSource;
const style = makeStyle();
const fonts = { ready: true };

describe('outputSize', () => {
  it('يُبدّل الأبعاد عند 90/270 فقط', () => {
    expect(outputSize({ width: 180, height: 320, rotation: 90 })).toEqual({ width: 320, height: 180 });
    expect(outputSize({ width: 180, height: 320, rotation: 270 })).toEqual({ width: 320, height: 180 });
    expect(outputSize({ width: 320, height: 180, rotation: 180 })).toEqual({ width: 320, height: 180 });
    expect(outputSize({ width: 320, height: 180 })).toEqual({ width: 320, height: 180 });
  });
});

describe('composeFrame', () => {
  it('دوران 0: يمسح ثم يرسم الإطار على (0,0,w,h) بلا تحويل', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 0, { width: 320, height: 180, rotation: 0 }, FRAME, [], style, fonts);
    expect(calls).toEqual([
      ['clearRect', 0, 0, 320, 180],
      ['drawImage', FRAME, 0, 0, 320, 180],
    ]);
  });

  it('دوران 90 (عكس عقارب الساعة): حجم مبدَّل، والتسلسل save→translate→rotate→drawImage→restore بزاوية −π/2', () => {
    const { calls, ctx } = fakeCtx();
    const source = { width: 180, height: 320, rotation: 90 };
    expect(outputSize(source)).toEqual({ width: 320, height: 180 });
    composeFrame(ctx, 7, source, FRAME, [], style, fonts);
    expect(calls).toEqual([
      ['clearRect', 0, 0, 320, 180],
      ['save'],
      ['translate', 0, 180],
      ['rotate', -Math.PI / 2],
      ['drawImage', FRAME, 0, 0, 180, 320],
      ['restore'],
    ]);
  });

  it('دوران 270: الإزاحة (W,0) والزاوية −3π/2', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 0, { width: 180, height: 320, rotation: 270 }, FRAME, [], style, fonts);
    expect(calls[2]).toEqual(['translate', 320, 0]);
    expect(calls[3]).toEqual(['rotate', -(3 * Math.PI) / 2]);
  });

  it('frameIndex لا يغيّر الناتج عندما لا توجد كابشن', () => {
    const a = fakeCtx();
    const b = fakeCtx();
    const source = { width: 320, height: 180, rotation: 0 };
    composeFrame(a.ctx, 0, source, FRAME, [], style, fonts);
    composeFrame(b.ctx, 100, source, FRAME, [], style, fonts);
    expect(a.calls).toEqual(b.calls);
  });

  it('بلا إطار: يملأ أسود بدل الرسم', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 0, { width: 320, height: 180, rotation: 0 }, null, [], style, fonts);
    expect(calls).toEqual([
      ['clearRect', 0, 0, 320, 180],
      ['set:fillStyle', '#000'],
      ['fillRect', 0, 0, 320, 180],
    ]);
  });

  it('المصدر حتمي: لا Date ولا Math.random ولا requestAnimationFrame', () => {
    const src = readFileSync(new URL('../../../../src/core/captions/compose.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/\bDate\b/);
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/requestAnimationFrame/);
  });
});

import { MemoryAuthFlowStore } from '@/modules/auth/infrastructure/memory';

describe('MemoryAuthFlowStore', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('consumes OAuth state once and expires it after 300 seconds', async () => {
    const store = new MemoryAuthFlowStore();
    await store.putTransaction('state', { nonce: 'nonce', verifier: 'verifier' });
    expect(
      await Promise.all([store.takeTransaction('state'), store.takeTransaction('state')]),
    ).toEqual([{ nonce: 'nonce', verifier: 'verifier' }, null]);

    await store.putTransaction('expired', { nonce: 'nonce', verifier: 'verifier' });
    jest.advanceTimersByTime(300_000);
    expect(await store.takeTransaction('expired')).toBeNull();
  });

  it('consumes an opaque login code once and expires it after 60 seconds', async () => {
    const store = new MemoryAuthFlowStore();
    const code = await store.createLoginCode('user-1');
    expect(code).not.toContain('user-1');
    expect(await Promise.all([store.takeLoginCode(code), store.takeLoginCode(code)])).toEqual([
      'user-1',
      null,
    ]);

    const expiredCode = await store.createLoginCode('user-2');
    jest.advanceTimersByTime(60_000);
    expect(await store.takeLoginCode(expiredCode)).toBeNull();
  });
});

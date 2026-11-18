import { describe, expect, it, vi } from 'vitest';
import { createTryOnRepository } from '../../src/services/tryOn/tryOnRepository.js';
import { createFakeSupabase } from '../helpers/fakeSupabase.js';

// createTryOnRepository(client) nhận client inject; vẫn import config/supabase.js nên cần mock.
vi.mock('../../src/config/supabase.js', async () => ({
  supabase: (await import('../helpers/fakeSupabase.js')).fake,
}));

const ID = '77777777-7777-4777-8777-777777777777';
const USER = '11111111-1111-4111-8111-111111111111';
const PRODUCT = '55555555-5555-4555-8555-555555555555';

function setup() {
  const client = createFakeSupabase();
  return { client, repo: createTryOnRepository(client) };
}
const filters = (q) => q.filters.map((f) => `${f.type}:${f.column}`);

describe('tryOnRepository (truy vấn tới Supabase giả)', () => {
  it('findOwned lọc theo CẢ id và profile_id (user khác không đọc được)', async () => {
    const { client, repo } = setup();
    client.on('try_on_results', () => ({ data: null, error: null }));
    expect(await repo.findOwned(ID, USER)).toBeNull();
    const [q] = client.queries('try_on_results');
    expect(q.filters).toEqual(
      expect.arrayContaining([
        { type: 'eq', column: 'id', value: ID },
        { type: 'eq', column: 'profile_id', value: USER },
      ]),
    );
  });

  it('findReusable: đúng khoá + chỉ status succeeded/pending/processing, mới nhất trước', async () => {
    const { client, repo } = setup();
    client.on('try_on_results', () => ({ data: { id: ID }, error: null }));
    await repo.findReusable(USER, PRODUCT, 'key');
    const [q] = client.queries('try_on_results');
    expect(q.filters).toContainEqual({ type: 'eq', column: 'input_key', value: 'key' });
    const statusFilter = q.filters.find((f) => f.type === 'in');
    expect(statusFilter.value).toEqual(['succeeded', 'pending', 'processing']);
    expect(statusFilter.value).not.toContain('failed');
    expect(q.orders[0]).toMatchObject({ column: 'created_at', ascending: false });
    expect(q.limit).toBe(1);
  });

  it('insertPending: status pending; 23505 -> conflict; 23503 -> missing; lỗi khác ném (không lộ message)', async () => {
    const { client, repo } = setup();
    client.on('try_on_results', () => ({ data: { id: ID }, error: null }));
    expect(await repo.insertPending({ profile_id: USER })).toEqual({ row: { id: ID } });
    expect(client.queries('try_on_results', 'insert')[0].payload).toMatchObject({
      status: 'pending',
    });

    client.on('try_on_results', () => ({ data: null, error: { code: '23505', message: 'dup' } }));
    expect(await repo.insertPending({})).toEqual({ conflict: true });

    client.on('try_on_results', () => ({ data: null, error: { code: '23503', message: 'fk' } }));
    expect(await repo.insertPending({})).toEqual({ missing: true });

    client.on('try_on_results', () => ({ data: null, error: { code: 'XX', message: 'secret' } }));
    const err = await repo.insertPending({}).catch((e) => e);
    expect(err.message).not.toContain('secret');
  });

  it('claimForProcessing chỉ chuyển từ pending; markSucceeded chỉ từ processing; markFailed từ pending/processing', async () => {
    const { client, repo } = setup();
    client.on('try_on_results', () => ({ data: { id: ID }, error: null }));
    await repo.claimForProcessing(ID);
    await repo.markSucceeded(ID, { resultPath: 'p', completedAt: 't' });
    await repo.markFailed(ID, { errorCode: 'GENERATION_FAILED', completedAt: 't' });
    const [claim, succeeded, failed] = client.queries('try_on_results', 'update');

    expect(claim.payload).toEqual({ status: 'processing' });
    expect(claim.filters).toContainEqual({ type: 'eq', column: 'status', value: 'pending' });
    expect(succeeded.payload).toMatchObject({ status: 'succeeded', result_path: 'p' });
    expect(succeeded.filters).toContainEqual({ type: 'eq', column: 'status', value: 'processing' });
    expect(failed.payload).toMatchObject({ status: 'failed', error_code: 'GENERATION_FAILED' });
    expect(failed.filters.find((f) => f.type === 'in').value).toEqual(['pending', 'processing']);
  });

  it('markSucceeded/markFailed trả false khi không có dòng nào được cập nhật', async () => {
    const { client, repo } = setup();
    client.on('try_on_results', () => ({ data: null, error: null }));
    expect(await repo.markSucceeded(ID, { resultPath: 'p', completedAt: 't' })).toBe(false);
    expect(await repo.markFailed(ID, { errorCode: 'X', completedAt: 't' })).toBe(false);
  });

  it('countUsedSince: từ đầu ngày, không tính job failed', async () => {
    const { client, repo } = setup();
    client.on('try_on_results', () => ({ data: null, count: 4, error: null }));
    expect(await repo.countUsedSince(USER, '2026-11-17T17:00:00.000Z')).toBe(4);
    const [q] = client.queries('try_on_results');
    expect(filters(q)).toEqual(
      expect.arrayContaining(['eq:profile_id', 'gte:created_at', 'neq:status']),
    );
    expect(q.filters).toContainEqual({ type: 'neq', column: 'status', value: 'failed' });
    expect(q.filters).toContainEqual({
      type: 'gte',
      column: 'created_at',
      value: '2026-11-17T17:00:00.000Z',
    });
    expect(q.options).toMatchObject({ count: 'exact', head: true });
  });

  it('countUsedSince: count null -> 0', async () => {
    const { client, repo } = setup();
    client.on('try_on_results', () => ({ data: null, count: null, error: null }));
    expect(await repo.countUsedSince(USER, 'x')).toBe(0);
  });

  it('deleteByProfile / deleteByProduct trả về result_path khác null', async () => {
    const { client, repo } = setup();
    client.on('try_on_results', () => ({
      data: [{ result_path: 'a.png' }, { result_path: null }, { result_path: 'b.png' }],
      error: null,
    }));
    expect(await repo.deleteByProfile(USER)).toEqual(['a.png', 'b.png']);
    expect(await repo.deleteByProduct(PRODUCT)).toEqual(['a.png', 'b.png']);
    const [byProfile, byProduct] = client.queries('try_on_results', 'delete');
    expect(byProfile.filters).toContainEqual({ type: 'eq', column: 'profile_id', value: USER });
    expect(byProduct.filters).toContainEqual({ type: 'eq', column: 'product_id', value: PRODUCT });
  });

  it('listResultPathsByProduct chỉ lấy row có result_path', async () => {
    const { client, repo } = setup();
    client.on('try_on_results', () => ({ data: [{ result_path: 'a.png' }], error: null }));
    expect(await repo.listResultPathsByProduct(PRODUCT)).toEqual(['a.png']);
    const [q] = client.queries('try_on_results');
    expect(q.filters).toContainEqual({
      type: 'not',
      column: 'result_path',
      operator: 'is',
      value: null,
    });
  });
});

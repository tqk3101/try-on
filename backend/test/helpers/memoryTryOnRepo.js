import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';

const ACTIVE = ['pending', 'processing'];

/**
 * Repository thử đồ trong bộ nhớ, cùng interface với createTryOnRepository().
 * Mô phỏng unique index một phần (profile, product, input_key) cho status succeeded/pending/processing:
 * insert trùng khoá -> { conflict: true }, đúng như DB thật trả 23505.
 */
export function createMemoryTryOnRepo({
  products = [],
  profiles = {},
  now = () => new Date().toISOString(),
} = {}) {
  const rows = [];

  const isLive = (row) => row.status !== 'failed';
  const publicRow = (row) => ({ ...row });

  const repo = {
    rows,
    products: new Map(products.map((p) => [p.id, p])),
    profiles: new Map(Object.entries(profiles)),

    findProduct: vi.fn(async (id) => repo.products.get(id) ?? null),
    findProfile: vi.fn(async (id) => repo.profiles.get(id) ?? null),

    findReusable: vi.fn(async (profileId, productId, inputKey) => {
      const found = rows
        .filter(
          (r) =>
            r.profile_id === profileId &&
            r.product_id === productId &&
            r.input_key === inputKey &&
            isLive(r),
        )
        .at(-1);
      return found ? publicRow(found) : null;
    }),

    insertPending: vi.fn(async (values) => {
      if (!repo.products.has(values.product_id)) return { missing: true };
      const dup = rows.find(
        (r) =>
          r.profile_id === values.profile_id &&
          r.product_id === values.product_id &&
          r.input_key === values.input_key &&
          isLive(r),
      );
      if (dup) return { conflict: true };
      const stamp = now();
      const row = {
        id: randomUUID(),
        ...values,
        status: 'pending',
        result_path: null,
        error_code: null,
        created_at: stamp,
        updated_at: stamp,
        completed_at: null,
      };
      rows.push(row);
      return { row: publicRow(row) };
    }),

    findOwned: vi.fn(async (id, profileId) => {
      const row = rows.find((r) => r.id === id && r.profile_id === profileId);
      return row ? publicRow(row) : null;
    }),

    claimForProcessing: vi.fn(async (id) => {
      const row = rows.find((r) => r.id === id && r.status === 'pending');
      if (!row) return null;
      row.status = 'processing';
      return publicRow(row);
    }),

    markSucceeded: vi.fn(async (id, { resultPath, providerJobId, completedAt }) => {
      const row = rows.find((r) => r.id === id && r.status === 'processing');
      if (!row) return false;
      Object.assign(row, {
        status: 'succeeded',
        result_path: resultPath,
        provider_job_id: providerJobId ?? null,
        completed_at: completedAt,
      });
      return true;
    }),

    markFailed: vi.fn(async (id, { errorCode, providerJobId, completedAt }) => {
      const row = rows.find((r) => r.id === id && ACTIVE.includes(r.status));
      if (!row) return false;
      Object.assign(row, {
        status: 'failed',
        error_code: errorCode,
        provider_job_id: providerJobId ?? null,
        completed_at: completedAt,
      });
      return true;
    }),

    countUsedSince: vi.fn(
      async (profileId, sinceIso) =>
        rows.filter(
          (r) =>
            r.profile_id === profileId &&
            r.status !== 'failed' &&
            new Date(r.created_at) >= new Date(sinceIso),
        ).length,
    ),
  };
  return repo;
}

import { vi } from 'vitest';
import { pngBuffer } from './images.js';

/**
 * Supabase client giả, chainable, không có I/O. Mỗi câu truy vấn được gom thành một
 * `query` ({ table, op, columns, payload, filters, ... }) rồi đưa cho handler đăng ký
 * bằng `fake.on(table, handler)`; handler trả { data, error, count }.
 * `await` trên chain (hoặc .single()/.maybeSingle()) gọi handler đúng một lần.
 */
function createQuery(table) {
  return {
    table,
    op: 'select',
    columns: undefined,
    payload: undefined,
    filters: [],
    orders: [],
    terminal: null,
    options: undefined,
  };
}

export function createFakeSupabase() {
  const handlers = new Map();
  const calls = [];

  function run(query) {
    calls.push(query);
    const handler = handlers.get(query.table);
    const result = handler ? handler(query) : { data: null, error: null };
    return Promise.resolve(result ?? { data: null, error: null });
  }

  function builder(table) {
    const query = createQuery(table);
    const chain = {
      select(columns, options) {
        // select sau insert/update/delete chỉ khai báo cột RETURNING, không đổi op.
        if (query.op === 'select') query.columns = columns;
        else query.returning = columns;
        query.options = options;
        return chain;
      },
      insert(payload) {
        query.op = 'insert';
        query.payload = payload;
        return chain;
      },
      update(payload) {
        query.op = 'update';
        query.payload = payload;
        return chain;
      },
      delete() {
        query.op = 'delete';
        return chain;
      },
      eq(column, value) {
        query.filters.push({ type: 'eq', column, value });
        return chain;
      },
      in(column, value) {
        query.filters.push({ type: 'in', column, value });
        return chain;
      },
      gte(column, value) {
        query.filters.push({ type: 'gte', column, value });
        return chain;
      },
      neq(column, value) {
        query.filters.push({ type: 'neq', column, value });
        return chain;
      },
      is(column, value) {
        query.filters.push({ type: 'is', column, value });
        return chain;
      },
      not(column, operator, value) {
        query.filters.push({ type: 'not', column, operator, value });
        return chain;
      },
      limit(count) {
        query.limit = count;
        return chain;
      },
      range(from, to) {
        query.range = { from, to };
        return chain;
      },
      order(column, options) {
        query.orders.push({ column, ...options });
        return chain;
      },
      single() {
        query.terminal = 'single';
        return run(query);
      },
      maybeSingle() {
        query.terminal = 'maybeSingle';
        return run(query);
      },
      then(onFulfilled, onRejected) {
        return run(query).then(onFulfilled, onRejected);
      },
    };
    return chain;
  }

  const storageBucket = (bucket) => ({
    upload: (...args) => fake.storageApi.upload(bucket, ...args),
    remove: (...args) => fake.storageApi.remove(bucket, ...args),
    download: (...args) => fake.storageApi.download(bucket, ...args),
    createSignedUrl: (...args) => fake.storageApi.createSignedUrl(bucket, ...args),
    createSignedUrls: (...args) => fake.storageApi.createSignedUrls(bucket, ...args),
  });

  const fake = {
    calls,
    from: (table) => builder(table),
    /** RPC giả: handler đăng ký bằng fake.on(`rpc:<tên hàm>`, (query) => ...); query.payload = tham số. */
    rpc: (name, args) => {
      const query = { ...createQuery(`rpc:${name}`), op: 'rpc', payload: args };
      return run(query);
    },
    storage: { from: storageBucket },
    storageApi: {},
    auth: { admin: {} },
    /** Đăng ký handler cho một bảng: (query) => ({ data, error, count }). */
    on(table, handler) {
      handlers.set(table, handler);
    },
    /** Các query đã chạy trên một bảng (tuỳ chọn lọc theo op). */
    queries(table, op) {
      return calls.filter((q) => q.table === table && (!op || q.op === op));
    },
    reset() {
      handlers.clear();
      calls.length = 0;
      fake.auth.admin.listUsers = vi.fn(async () => ({ data: {}, error: null }));
      fake.storageApi.download = vi.fn(async () => {
        const bytes = pngBuffer();
        return { data: { arrayBuffer: async () => bytes }, error: null };
      });
      fake.storageApi.upload = vi.fn(async () => ({ data: {}, error: null }));
      fake.storageApi.remove = vi.fn(async () => ({ data: [], error: null }));
      fake.storageApi.createSignedUrl = vi.fn(async (bucket, path) => ({
        data: { signedUrl: `https://signed.test/${bucket}/${path}` },
        error: null,
      }));
      fake.storageApi.createSignedUrls = vi.fn(async (bucket, paths) => ({
        data: paths.map((path) => ({
          path,
          signedUrl: `https://signed.test/${bucket}/${path}`,
          error: null,
        })),
        error: null,
      }));
    },
  };
  fake.reset();
  return fake;
}

export const fake = createFakeSupabase();

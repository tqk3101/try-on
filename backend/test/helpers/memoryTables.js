import { randomUUID } from 'node:crypto';

function matches(row, filters) {
  return filters.every((f) => {
    const value = row[f.column];
    switch (f.type) {
      case 'eq':
        return value === f.value;
      case 'neq':
        return value !== f.value;
      case 'in':
        return f.value.includes(value);
      case 'gte':
        return String(value) >= String(f.value);
      case 'is':
        return f.value === null ? value === null || value === undefined : value === f.value;
      case 'not':
        return f.operator === 'is' && f.value === null
          ? value !== null && value !== undefined
          : true;
      default:
        return true;
    }
  });
}

/**
 * Bảng trong bộ nhớ cho fake Supabase: select / insert / update / delete theo bộ lọc đã ghi nhận.
 * `onInsert(row, rows)` (tuỳ chọn) có thể trả { error } để mô phỏng ràng buộc (vd. unique index).
 */
export function createMemoryTable(rows, { onInsert, defaults = () => ({}) } = {}) {
  return (query) => {
    const hits = rows.filter((row) => matches(row, query.filters));

    if (query.op === 'insert') {
      const row = { id: randomUUID(), ...defaults(), ...query.payload };
      const violation = onInsert?.(row, rows);
      if (violation) return { data: null, error: violation };
      rows.push(row);
      return { data: row, error: null };
    }

    if (query.op === 'update') {
      hits.forEach((row) => Object.assign(row, query.payload));
      return { data: hits[0] ?? null, error: null };
    }

    if (query.op === 'delete') {
      hits.forEach((row) => rows.splice(rows.indexOf(row), 1));
      return { data: hits, error: null };
    }

    // select
    if (query.options?.head) return { data: null, count: hits.length, error: null };
    const sorted = [...hits];
    for (const order of [...query.orders].reverse()) {
      const dir = order.ascending === false ? -1 : 1;
      sorted.sort((a, b) => (a[order.column] > b[order.column] ? dir : -dir));
    }
    const limited = query.limit ? sorted.slice(0, query.limit) : sorted;
    if (query.terminal) return { data: limited[0] ?? null, error: null };
    return { data: limited, error: null };
  };
}

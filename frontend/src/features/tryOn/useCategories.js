import { useCallback, useEffect, useState } from 'react';
import { fetchCategories } from './tryOnApi.js';

/** Danh mục có sản phẩm (GET /api/categories). status: 'loading' | 'error' | 'ready' | 'empty'. */
export function useCategories() {
  const [state, setState] = useState({ status: 'loading', categories: [], error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { categories } = await fetchCategories({ signal: controller.signal });
        setState({
          status: categories.length > 0 ? 'ready' : 'empty',
          categories,
          error: '',
        });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setState({
          status: 'error',
          categories: [],
          error: error.message || 'Không thể tải danh mục. Vui lòng thử lại.',
        });
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading', categories: [], error: '' });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}

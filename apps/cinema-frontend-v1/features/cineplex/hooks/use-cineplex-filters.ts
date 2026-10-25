'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type {
  CineplexListParams,
  CineplexStatusFilter,
} from '../types/cineplex.types';

const STATUSES: CineplexStatusFilter[] = ['ACTIVE', 'MAINTENANCE', 'CLOSED', 'ALL'];
const PAGE_SIZE = 12;

function toNumber(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Bộ lọc lưu trên URL: chia sẻ được link, nút back hoạt động đúng. */
export function useCineplexFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  const filters = useMemo<CineplexListParams>(() => {
    const sp = new URLSearchParams(query);
    const status = sp.get('status') as CineplexStatusFilter | null;
    return {
      search: sp.get('search') ?? undefined,
      provinceId: sp.get('provinceId') ?? undefined,
      wardId: sp.get('wardId') ?? undefined,
      latitude: toNumber(sp.get('latitude')),
      longitude: toNumber(sp.get('longitude')),
      radiusKm: toNumber(sp.get('radiusKm')),
      status: status && STATUSES.includes(status) ? status : undefined,
      page: Math.max(1, toNumber(sp.get('page')) ?? 1),
      limit: PAGE_SIZE,
    };
  }, [query]);

  const setFilters = useCallback(
    (patch: Partial<CineplexListParams>, options: { resetPage?: boolean } = {}) => {
      const sp = new URLSearchParams(query);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') sp.delete(key);
        else sp.set(key, String(value));
      });
      if (options.resetPage ?? true) {
        if (!('page' in patch)) sp.delete('page');
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, query, router],
  );

  return { filters, setFilters };
}

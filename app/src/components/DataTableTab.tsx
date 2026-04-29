'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Filter, X, ExternalLink
} from 'lucide-react';
import type { BaseStation } from '@/lib/types';

interface TableResponse {
  data: BaseStation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filterOptions: {
    operators: string[];
    technologies: string[];
    frequencyBands: string[];
  };
}

interface DataTableTabProps {
  selectedId?: string;
  onSelectStation?: (station: BaseStation) => void;
}

function getTechBadgeClass(tech: string) {
  const t = tech.toLowerCase();
  if (t === '5g') return 'badge-5g';
  if (t === '4g') return 'badge-4g';
  if (t === '3g') return 'badge-3g';
  if (t === '2g') return 'badge-2g';
  return '';
}

function getOpBadgeClass(op: string) {
  if (op.toLowerCase().includes('telekom')) return 'badge-telekom';
  if (op.toLowerCase().includes('yettel')) return 'badge-yettel';
  if (op.toLowerCase().includes('a1')) return 'badge-a1';
  return '';
}

type SortKey = keyof BaseStation | '';

export default function DataTableTab({ selectedId, onSelectStation }: DataTableTabProps) {
  const [data, setData] = useState<BaseStation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<TableResponse['filterOptions']>({
    operators: [], technologies: [], frequencyBands: [],
  });

  // Filters
  const [search, setSearch] = useState('');
  const [operator, setOperator] = useState('');
  const [technology, setTechnology] = useState('');
  const [frequencyBand, setFrequencyBand] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const PAGE_SIZE = 50;
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (pg: number) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pg),
      pageSize: String(PAGE_SIZE),
      ...(search && { search }),
      ...(operator && { operator }),
      ...(technology && { technology }),
      ...(frequencyBand && { frequencyBand }),
      ...(sortBy && { sortBy }),
      sortDir,
    });
    try {
      const res = await fetch(`/api/stations?${params}`);
      const json: TableResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
      setPage(json.page);
      if (json.filterOptions) setFilterOptions(json.filterOptions);
    } finally {
      setLoading(false);
    }
  }, [search, operator, technology, frequencyBand, sortBy, sortDir]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData(1);
    }, 300);
  }, [search, operator, technology, frequencyBand, sortBy, sortDir]);

  // Scroll selected row into view
  useEffect(() => {
    if (selectedId && rowRefs.current[selectedId]) {
      rowRefs.current[selectedId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedId, data]);

  const handleSort = (col: keyof BaseStation) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ChevronUp size={12} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: 'var(--accent)' }} />
      : <ChevronDown size={12} style={{ color: 'var(--accent)' }} />;
  };

  const hasFilters = search || operator || technology || frequencyBand;

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', height: '100%' }}>

      {/* ─── Toolbar ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            id="station-search"
            className="form-input"
            style={{ width: '100%', paddingLeft: 32 }}
            placeholder="Pretraži po ID, operateru, lokaciji, adresi…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
            }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          id="filter-toggle-btn"
          className={showFilters ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setShowFilters(v => !v)}
          style={{ gap: 6 }}
        >
          <Filter size={13} />
          Filteri
          {hasFilters && (
            <span style={{
              background: showFilters ? 'rgba(255,255,255,0.25)' : 'var(--accent)',
              borderRadius: 999, padding: '0 6px', fontSize: 10, fontWeight: 700,
            }}>!</span>
          )}
        </button>

        {/* Results count */}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {loading ? 'Učitavanje…' : `${total.toLocaleString('sr')} rezultata`}
        </span>
      </div>

      {/* ─── Filters panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 16 }}
          >
            <div className="glass" style={{ padding: '16px 20px', borderRadius: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <select id="filter-operator" className="form-input" value={operator} onChange={e => setOperator(e.target.value)}>
                <option value="">Svi operateri</option>
                {filterOptions.operators.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select id="filter-technology" className="form-input" value={technology} onChange={e => setTechnology(e.target.value)}>
                <option value="">Sve tehnologije</option>
                {filterOptions.technologies.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select id="filter-frequency" className="form-input" value={frequencyBand} onChange={e => setFrequencyBand(e.target.value)}>
                <option value="">Svi opsezi</option>
                {filterOptions.frequencyBands.map(f => <option key={f} value={f}>{f} MHz</option>)}
              </select>
              {hasFilters && (
                <button className="btn-ghost" onClick={() => {
                  setSearch(''); setOperator(''); setTechnology(''); setFrequencyBand('');
                }}>
                  <X size={12} /> Resetuj filtere
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Table ─────────────────────────────────────────────────────── */}
      <div className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className={sortBy === 'id' ? 'sorted' : ''} onClick={() => handleSort('id')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    ID <SortIcon col="id" />
                  </div>
                </th>
                <th className={sortBy === 'operator' ? 'sorted' : ''} onClick={() => handleSort('operator')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Operater <SortIcon col="operator" /></div>
                </th>
                <th className={sortBy === 'technology' ? 'sorted' : ''} onClick={() => handleSort('technology')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Tehnologija <SortIcon col="technology" /></div>
                </th>
                <th className={sortBy === 'frequencyBand' ? 'sorted' : ''} onClick={() => handleSort('frequencyBand')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Opseg (MHz) <SortIcon col="frequencyBand" /></div>
                </th>
                <th className={sortBy === 'locationName' ? 'sorted' : ''} onClick={() => handleSort('locationName')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Naziv mesta <SortIcon col="locationName" /></div>
                </th>
                <th className={sortBy === 'address' ? 'sorted' : ''} onClick={() => handleSort('address')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Adresa <SortIcon col="address" /></div>
                </th>
                <th>Koordinate</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                    Nema rezultata za zadati filter
                  </td>
                </tr>
              ) : (
                data.map(row => (
                  <tr
                    key={row.id}
                    ref={el => { rowRefs.current[row.id] = el; }}
                    className={row.id === selectedId ? 'highlighted' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectStation?.(row)}
                  >
                    <td>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {row.id}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getOpBadgeClass(row.operator)}`}>{row.operator}</span>
                    </td>
                    <td>
                      <span className={`badge ${getTechBadgeClass(row.technology)}`}>{row.technology}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {row.frequencyBand}
                    </td>
                    <td style={{ maxWidth: 200 }} title={row.locationName}>
                      {row.locationName}
                    </td>
                    <td style={{ maxWidth: 280, color: 'var(--text-secondary)' }} title={row.address}>
                      {row.address}
                    </td>
                    <td>
                      <a
                        href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: 11, textDecoration: 'none' }}
                      >
                        <ExternalLink size={11} />
                        {row.latitude.toFixed(5)}, {row.longitude.toFixed(5)}
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => fetchData(1)} disabled={page === 1}>
            <ChevronsLeft size={14} />
          </button>
          <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => fetchData(page - 1)} disabled={page === 1}>
            <ChevronLeft size={14} />
          </button>

          {/* Page window */}
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 3, totalPages - 6));
            const p = start + i;
            return (
              <button
                key={p}
                className={p === page ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '6px 12px', minWidth: 36 }}
                onClick={() => fetchData(p)}
              >
                {p}
              </button>
            );
          })}

          <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => fetchData(page + 1)} disabled={page === totalPages}>
            <ChevronRight size={14} />
          </button>
          <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => fetchData(totalPages)} disabled={page === totalPages}>
            <ChevronsRight size={14} />
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
            Strana {page} / {totalPages.toLocaleString('sr')}
          </span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronRight, Maximize2, Minimize2, Navigation } from 'lucide-react';
import type { BaseStation, MapSite } from '@/lib/types';

const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="animate-pulse-slow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Učitavanje mape…</span>
      </div>
    </div>
  ),
});

interface MapTabProps {
  selectedLat: number | null;
  selectedLng: number | null;
  onGoToTable: () => void;
}

export default function MapTab({ selectedLat, selectedLng, onGoToTable }: MapTabProps) {
  const [points, setPoints] = useState<MapSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filters
  const [operator, setOperator] = useState('');
  const [technology, setTechnology] = useState('');

  // Selected site and its details
  const [selectedSite, setSelectedSite] = useState<MapSite | null>(null);
  const [siteDetails, setSiteDetails] = useState<BaseStation[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchPoints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (operator) params.set('operator', operator);
      if (technology) params.set('technology', technology);
      const res = await fetch(`/api/map-points?${params}`);
      const data = await res.json();
      setPoints(data.points || []);
    } finally {
      setLoading(false);
    }
  }, [operator, technology]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  // When external lat/lng comes in (from table), select the site
  useEffect(() => {
    if (selectedLat !== null && selectedLng !== null && points.length > 0) {
      const site = points.find(p => Math.abs(p.lat - selectedLat) < 0.00001 && Math.abs(p.lng - selectedLng) < 0.00001);
      if (site) {
        setSelectedSite(site);
      }
    }
  }, [selectedLat, selectedLng, points]);

  // Fetch individual sectors when a site is selected
  useEffect(() => {
    if (selectedSite) {
      setLoadingDetails(true);
      fetch(`/api/stations?lat=${selectedSite.lat}&lng=${selectedSite.lng}&pageSize=1000`)
        .then(r => r.json())
        .then(d => setSiteDetails(d.data || []))
        .finally(() => setLoadingDetails(false));
    } else {
      setSiteDetails([]);
    }
  }, [selectedSite]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      height: isFullscreen ? '100vh' : 'calc(100vh - 120px)',
      width: '100%',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ─── Top Filter Bar ────────────────────────────────────────────── */}
      {!isFullscreen && (
        <div className="glass" style={{
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          borderBottom: '1px solid var(--border)',
          background: 'rgba(13, 19, 32, 0.8)',
          zIndex: 401,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Filter size={16} color="var(--accent)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filteri Mape
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>OPERATER</label>
            <select 
              className="form-input" 
              style={{ width: 160, padding: '6px 12px', fontSize: 13, borderRadius: 8 }} 
              value={operator} 
              onChange={e => setOperator(e.target.value)}
            >
              <option value="">Svi operateri</option>
              <option value="Telekom Srbija">Telekom Srbija</option>
              <option value="Yettel">Yettel</option>
              <option value="A1">A1</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>TEHNOLOGIJA</label>
            <select 
              className="form-input" 
              style={{ width: 140, padding: '6px 12px', fontSize: 13, borderRadius: 8 }} 
              value={technology} 
              onChange={e => setTechnology(e.target.value)}
            >
              <option value="">Sve tehnologije</option>
              <option value="5G">5G</option>
              <option value="4G">4G</option>
              <option value="3G">3G</option>
              <option value="2G">2G</option>
            </select>
          </div>

          {(operator || technology) && (
            <button 
              className="btn-ghost" 
              style={{ padding: '6px 12px', fontSize: 12, color: '#ef4444' }} 
              onClick={() => { setOperator(''); setTechnology(''); }}
            >
              <X size={14} style={{ marginRight: 4 }} /> Obriši
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {loading ? 'Učitavanje...' : <b>{points.length.toLocaleString('sr')}</b>} lokacija
            </span>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* ─── Map Layer ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapClient
            points={points}
            selectedLat={selectedLat}
            selectedLng={selectedLng}
            onSelectSite={setSelectedSite}
          />

          {/* Fullscreen button */}
          <button
            className="glass"
            onClick={toggleFullscreen}
            style={{
              position: 'absolute', top: 20, right: 20, zIndex: 400,
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: 'pointer',
            }}
            title="Preko celog ekrana"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

      {/* ─── Detail Sidebar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSite && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{
              background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', zIndex: 500,
            }}
          >
            <div style={{ width: 340, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Detalji lokacije</h3>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedSite.locationName || 'Nepoznata lokacija'}</span>
                </div>
                <button
                  onClick={() => setSelectedSite(null)}
                  style={{ background: 'var(--bg-elevated)', border: 'none', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Summary */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    {selectedSite.operators.length} operatera
                  </span>
                  <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                    {selectedSite.totalSectors} sektora
                  </span>
                </div>

                {/* Sektori po operateru */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'block' }}>
                    Aktivne tehnologije
                  </label>
                  
                  {loadingDetails ? (
                    <div className="animate-pulse-slow" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Učitavanje sektora...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {selectedSite.operators.map(op => {
                        const opSectors = siteDetails.filter(s => s.operator === op);
                        if (opSectors.length === 0) return null;
                        
                        // Group by technology
                        const techMap = new Map<string, string[]>();
                        opSectors.forEach(s => {
                          const freqs = techMap.get(s.technology) || [];
                          if (!freqs.includes(s.frequencyBand)) freqs.push(s.frequencyBand);
                          techMap.set(s.technology, freqs);
                        });

                        const getOpColor = (o: string) => {
                          if (o.includes('Telekom')) return '#3b82f6';
                          if (o.includes('Yettel')) return '#a855f7';
                          if (o.includes('A1')) return '#22c55e';
                          return '#94a3b8';
                        };

                        return (
                          <div key={op} style={{ background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: getOpColor(op) }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{op}</span>
                              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{opSectors.length} ćelija</span>
                            </div>
                            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {Array.from(techMap.entries()).map(([tech, freqs]) => (
                                <div key={tech} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', width: 24 }}>{tech}</span>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {freqs.sort().map(f => (
                                      <span key={f} style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-primary)' }}>
                                        {f} MHz
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>Koordinate</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="font-mono" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {selectedSite.lat.toFixed(5)}, {selectedSite.lng.toFixed(5)}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${selectedSite.lat},${selectedSite.lng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}
                    >
                      <Navigation size={12} /> GMap
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ padding: 20, borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={onGoToTable}
                >
                  Prikaži u tabeli <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

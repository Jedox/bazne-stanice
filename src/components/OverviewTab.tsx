'use client';

import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  Radio, Building2, Zap, Clock, TrendingUp,
  ArrowUpRight, Signal, Globe
} from 'lucide-react';
import type { StatsResponse } from '@/lib/types';

interface OverviewTabProps {
  stats: StatsResponse | null;
  loading: boolean;
}

const TECH_COLORS: Record<string, string> = {
  '5G': '#a855f7', '4G': '#10b981', '3G': '#3b82f6', '2G': '#f59e0b',
};
const OP_COLORS = ['#3b82f6', '#a855f7', '#22c55e'];

function SkeletonCard() {
  return (
    <div className="glass" style={{ padding: 24, borderRadius: 14 }}>
      <div className="skeleton" style={{ width: '40%', height: 12, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '70%', height: 32, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '55%', height: 10 }} />
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

function KpiCard({
  icon, label, value, sub, color, i,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  i: number;
}) {
  return (
    <motion.div
      custom={i}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="glass"
      style={{
        padding: 24,
        borderRadius: 14,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 120, height: 120,
        background: `radial-gradient(circle at top right, ${color}20, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
        <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString('sr') : value}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</p>
      )}
    </motion.div>
  );
}

const CustomTooltipStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-accent)',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 12,
  color: 'var(--text-primary)',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={CustomTooltipStyle}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill || p.color || 'var(--text-primary)' }}>
          {p.value.toLocaleString('sr')} stanica
        </p>
      ))}
    </div>
  );
}

export default function OverviewTab({ stats, loading }: OverviewTabProps) {
  if (loading || !stats) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="glass skeleton" style={{ height: 300, borderRadius: 14 }} />
          <div className="glass skeleton" style={{ height: 300, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  const { 
    totalStations, totalSites, operators, technologies, frequencyBands, 
    topCities, lastSyncAt, lastCheckedAt, newSinceLast, operatorChanges,
    globalStats 
  } = stats;

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nikada';
    return new Intl.DateTimeFormat('sr-Latn', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ─── KPI Cards ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        <KpiCard i={0} icon={<Radio size={18} />} label="Bazne stanice"
          value={totalSites} sub={`${totalStations.toLocaleString('sr')} ukupno ćelija`} color="#3b82f6" />
        <KpiCard i={1} icon={<Building2 size={18} />} label="Operateri"
          value={operators.length} sub={operators.map(o => o.name).join(' · ')} color="#a855f7" />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <KpiCard i={2} icon={<Clock size={18} />} label="Zadnja provera"
            value={formatDate(lastCheckedAt)} sub="Provera na serveru" color="#f59e0b" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <KpiCard i={3} icon={<Clock size={18} />} label="Zadnja promena"
            value={formatDate(lastSyncAt)} sub="Stvarna izmena baze" color="#10b981" />
        </div>

        {globalStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ gridColumn: '1 / -1', marginTop: 24 }}
          >
            {/* Header bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(lastSyncAt || Date.now()))}
              </h2>
              <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.05em',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                {newSinceLast.toLocaleString('sr')} NEW SECTORS
              </div>
            </div>

            {/* Top Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div className="glass" style={{ padding: '20px 24px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>New Sites</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>{globalStats.newSites}</p>
                </div>
                <div style={{ width: 36, height: 36, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} />
                </div>
              </div>

              <div className="glass" style={{ padding: '20px 24px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>5G 700 MHz</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>{globalStats.new5G700}</p>
                </div>
                <div style={{ width: 36, height: 36, background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10 }}>5G</div>
              </div>

              <div className="glass" style={{ padding: '20px 24px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>5G 3500 MHz</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>{globalStats.new5G3500}</p>
                </div>
                <div style={{ width: 36, height: 36, background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10 }}>5G</div>
              </div>

              <div className="glass" style={{ padding: '20px 24px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>4G 2600 MHz</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>{globalStats.new4G2600}</p>
                </div>
                <div style={{ width: 36, height: 36, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10 }}>4G</div>
              </div>

              <div className="glass" style={{ padding: '20px 24px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>4G 700 MHz</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>{globalStats.new4G700}</p>
                </div>
                <div style={{ width: 36, height: 36, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10 }}>4G</div>
              </div>

              <div className="glass" style={{ padding: '20px 24px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Updated 4G Sites</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>{globalStats.updated4GSites}</p>
                </div>
                <div style={{ width: 36, height: 36, background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Signal size={18} />
                </div>
              </div>
            </div>

            {/* Per Operator Section */}
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>Per Operator</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {['A1', 'Yettel', 'Telekom Srbija'].map((opName) => {
                const op = operatorChanges.find(o => o.name.includes(opName)) || {
                  name: opName, newSites: 0, new5G700: 0, new5G3500: 0, new4G2600: 0, new4G700: 0, updated4GSites: 0, totalSectors: 0
                };
                const opColor = opName === 'A1' ? '#ef4444' : opName === 'Yettel' ? '#10b981' : '#3b82f6';
                
                return (
                  <div key={opName} className="glass" style={{ padding: 24, borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: opColor }} />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{opName}</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Building2 size={14} color="#10b981" />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>New sites: <b style={{ color: 'var(--text-primary)' }}>{op.newSites}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#a855f7', width: 14 }}>5G</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>5G 700: <b style={{ color: 'var(--text-primary)' }}>{op.new5G700}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#a855f7', width: 14 }}>5G</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>5G 3500: <b style={{ color: 'var(--text-primary)' }}>{op.new5G3500}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#3b82f6', width: 14 }}>4G</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>4G 2600: <b style={{ color: 'var(--text-primary)' }}>{op.new4G2600}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#3b82f6', width: 14 }}>4G</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>4G 700: <b style={{ color: 'var(--text-primary)' }}>{op.new4G700}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Signal size={14} color="#60a5fa" />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>4G updated: <b style={{ color: 'var(--text-primary)' }}>{op.updated4GSites}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <Zap size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total sectors: <b style={{ color: 'var(--text-primary)' }}>{op.totalSectors}</b></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── Charts Row ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 24 }}>

        {/* Technologies Pie */}
        <motion.div
          className="glass"
          style={{ padding: 24, borderRadius: 14 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Signal size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Raspodela po tehnologiji
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={technologies}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                strokeWidth={0}
              >
                {technologies.map((t, i) => (
                  <Cell key={t.name} fill={TECH_COLORS[t.name] ?? '#64748b'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {technologies.map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: TECH_COLORS[t.name] ?? '#64748b' }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {t.name} ({((t.count / totalStations) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Operators Bar */}
        <motion.div
          className="glass"
          style={{ padding: 24, borderRadius: 14 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
        >
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={16} style={{ color: '#a855f7' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Lokacije po operateru
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={operators} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {operators.map((o, i) => (
                  <Cell key={o.name} fill={OP_COLORS[i % OP_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Frequency Bands Bar */}
        <motion.div
          className="glass"
          style={{ padding: 24, borderRadius: 14 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
        >
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Frekvencijski opsezi (MHz)
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={frequencyBands} layout="vertical" barCategoryGap="25%">
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Cities */}
        <motion.div
          className="glass"
          style={{ padding: 24, borderRadius: 14 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}
        >
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={16} style={{ color: '#06b6d4' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Top 10 mesta
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topCities.slice(0, 10).map((city, i) => {
              const pct = (city.count / (topCities[0]?.count || 1)) * 100;
              return (
                <div key={city.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 14, textAlign: 'right', fontWeight: 600 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{city.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{city.count.toLocaleString('sr')}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--bg-elevated)', borderRadius: 3 }}>
                      <motion.div
                        style={{ height: 3, borderRadius: 3, background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.6 + i * 0.04, duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ─── Info text ─────────────────────────────────────────────────── */}
      <motion.div
        className="glass"
        style={{ padding: 24, borderRadius: 14, maxWidth: 800 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
      >
        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          O skupu podataka
        </h4>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
          Ovaj registar sadrži evidentirane radio-stanice u javnoj mobilnoj elektronskoj komunikacionoj
          mreži Srbije, objavljene od strane{' '}
          <a href="https://registar.ratel.rs" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            RATEL-a (Regulatorna agencija za elektronske komunikacije i poštanske usluge)
          </a>.
          Podaci uključuju lokaciju (koordinate i adresu), operatera, primenjenu tehnologiju (2G/3G/4G/5G)
          i frekvencijski opseg za svaku baznu stanicu. Sinhronizacija se vrši direktno sa zvaničnog
          registra.
        </p>
      </motion.div>
    </div>
  );
}

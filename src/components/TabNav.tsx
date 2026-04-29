'use client';

import { motion } from 'framer-motion';
import { BarChart2, Map, Table2 } from 'lucide-react';

export type TabId = 'overview' | 'table' | 'map';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Pregled', icon: <BarChart2 size={15} /> },
  { id: 'table',    label: 'Tabela podataka', icon: <Table2 size={15} /> },
  { id: 'map',      label: 'Mapa', icon: <Map size={15} /> },
];

interface TabNavProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

export default function TabNav({ active, onChange }: TabNavProps) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 73,
      zIndex: 90,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(tab => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '14px 20px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {tab.icon}
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                      borderRadius: '2px 2px 0 0',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Activity, RefreshCw, Wifi } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  totalSites: number;
  lastSyncAt: string | null;
  onSync: () => void;
  syncing: boolean;
}

export default function Header({ totalSites, lastSyncAt, onSync, syncing }: HeaderProps) {
  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nikada';
    return new Intl.DateTimeFormat('sr-Latn', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  };

  return (
    <header
      style={{
        background: 'linear-gradient(180deg, rgba(8,12,18,0.98) 0%, rgba(13,19,32,0.95) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingTop: 16,
          paddingBottom: 16,
          flexWrap: 'wrap',
        }}>
          {/* Logo + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(59,130,246,0.4)',
              flexShrink: 0,
            }}>
              <Wifi size={20} color="white" />
            </div>
            <div>
              <motion.h1
                className="gradient-text"
                style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                RATEL Registar
              </motion.h1>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, marginTop: 1 }}>
                Radio-stanice mobilnih mreža Srbije
              </p>
            </div>
          </div>

          {/* Stats pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="glass" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {totalSites > 0
                  ? `${totalSites.toLocaleString('sr')} lokacija`
                  : 'Učitavanje…'}
              </span>
            </div>

            {lastSyncAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Ažurirano: {formatDate(lastSyncAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </header>
  );
}

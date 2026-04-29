'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import TabNav, { TabId } from '@/components/TabNav';
import OverviewTab from '@/components/OverviewTab';
import DataTableTab from '@/components/DataTableTab';
import MapTab from '@/components/MapTab';
import type { StatsResponse, BaseStation } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Cross-tab state
  const [selectedStation, setSelectedStation] = useState<BaseStation | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats().then(data => {
      if (data?.lastCheckedAt) {
        const lastCheck = new Date(data.lastCheckedAt).getTime();
        // If older than 24h, do a silent background sync
        if (Date.now() - lastCheck > 24 * 60 * 60 * 1000) {
          handleSync(true);
        }
      }
    });
  }, []);

  const handleSync = async (silent = false) => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (!silent) {
          alert(data.status === 'no-change' ? 'Nema novih podataka na izvoru.' : `Sinhronizacija uspešna. Novo: ${data.inserted}`);
        }
        await fetchStats(); 
      } else if (!silent) {
        alert(`Greška pri sinhronizaciji: ${data.error}`);
      }
    } catch (err) {
      if (!silent) alert('Došlo je do greške prilikom sinhronizacije.');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectStation = (station: BaseStation | null) => {
    setSelectedStation(station);
    if (station && activeTab !== 'map') {
        setActiveTab('map');
    }
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header 
        totalSites={stats?.totalSites ?? 0} 
        lastSyncAt={stats?.lastSyncAt ?? null}
        onSync={handleSync}
        syncing={syncing}
      />
      <TabNav active={activeTab} onChange={setActiveTab} />

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} loading={loading} />
        )}
        
        {activeTab === 'table' && (
          <DataTableTab 
            selectedId={selectedStation?.id} 
            onSelectStation={handleSelectStation} 
          />
        )}
        
        {/* We keep the map mounted but hidden when not active to avoid re-rendering Leaflet and losing state */}
        <div style={{ display: activeTab === 'map' ? 'block' : 'none', height: '100%' }}>
            <MapTab 
              selectedLat={selectedStation?.latitude ?? null}
              selectedLng={selectedStation?.longitude ?? null}
              onGoToTable={() => setActiveTab('table')}
            />
        </div>
      </div>
    </main>
  );
}

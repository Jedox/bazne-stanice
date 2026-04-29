'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { BaseStation, MapSite } from '@/lib/types';

interface MapClientProps {
  points: MapSite[];
  selectedLat: number | null;
  selectedLng: number | null;
  onSelectSite: (site: MapSite) => void;
}

export default function MapClient({ points, selectedLat, selectedLng, onSelectSite }: MapClientProps) {
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Dark theme map tiles (CartoDB Dark Matter)
    const tileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    );

    const map = L.map(mapContainer.current, {
      center: [44.2, 20.9], // Center of Serbia
      zoom: 7,
      layers: [tileLayer],
      zoomControl: false, // We'll add it later to reposition
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 50) size = 'medium';
        if (count > 200) size = 'large';

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      },
    });

    map.addLayer(clusterGroup);
    mapRef.current = map;
    clusterGroupRef.current = clusterGroup;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
    };
  }, []);

  // Update markers when points change
  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current) return;

    const clusterGroup = clusterGroupRef.current;
    clusterGroup.clearLayers();

    if (points.length === 0) return;

    // Create markers in chunks to prevent blocking the UI
    const CHUNK_SIZE = 5000;
    let index = 0;

    const createIcon = (site: MapSite) => {
      const getOpColor = (o: string) => {
        const lower = o.toLowerCase();
        if (lower.includes('telekom')) return '#3b82f6';
        if (lower.includes('yettel')) return '#10b981';
        if (lower.includes('a1')) return '#ef4444';
        return '#94a3b8';
      };

      let bgStyle = '';
      if (site.operators.length === 1) {
        bgStyle = `background: ${getOpColor(site.operators[0])};`;
      } else if (site.operators.length === 2) {
        bgStyle = `background: conic-gradient(${getOpColor(site.operators[0])} 0% 50%, ${getOpColor(site.operators[1])} 50% 100%);`;
      } else {
        bgStyle = `background: conic-gradient(${getOpColor(site.operators[0])} 0% 33%, ${getOpColor(site.operators[1])} 33% 66%, ${getOpColor(site.operators[2])} 66% 100%);`;
      }

      const lower = site.operators[0].toLowerCase();
      let glowClass = 'glow-multi';
      if (site.operators.length === 1) {
        if (lower.includes('telekom')) glowClass = 'glow-telekom';
        else if (lower.includes('yettel')) glowClass = 'glow-yettel';
        else if (lower.includes('a1')) glowClass = 'glow-a1';
      }

      const has5G = site.technologies.includes('5G');
      const badge5G = has5G ? `<div style="position: absolute; top: -5px; right: -5px; background: #a855f7; width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid #fff; box-shadow: 0 0 12px #a855f7;"></div>` : '';

      return L.divIcon({
        html: `<div class="site-marker-glow ${glowClass}" style="position: relative; width: 14px; height: 14px; ${bgStyle} border: 1.5px solid rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center;">
                 ${badge5G}
               </div>`,
        className: 'custom-div-icon-site',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
    };

    function processChunk() {
      const chunk = points.slice(index, index + CHUNK_SIZE);
      const markers = chunk.map(p => {
        const marker = L.marker([p.lat, p.lng], { icon: createIcon(p) });
        marker.on('click', () => {
          onSelectSite(p);
          mapRef.current?.setView([p.lat, p.lng], 16, { animate: true });
        });
        // Simple tooltip
        marker.bindTooltip(`<b>${p.locationName || 'Lokacija'}</b><br>${p.operators.join(', ')}<br>${p.totalSectors} sektora`, { direction: 'top', offset: [0, -12] });
        return marker;
      });

      clusterGroup.addLayers(markers);
      index += CHUNK_SIZE;

      if (index < points.length) {
        requestAnimationFrame(processChunk);
      }
    }

    processChunk();
  }, [points, onSelectSite]); // Do NOT include selectedLat here to avoid re-rendering all markers

  // Handle selected station from outside
  useEffect(() => {
    if (selectedLat !== null && selectedLng !== null && mapRef.current) {
        mapRef.current.setView([selectedLat, selectedLng], 16, { animate: true });
    }
  }, [selectedLat, selectedLng]);

  return (
    <>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <style jsx global>{`
        /* Individual Site Markers Glow */
        .site-marker-glow {
          border-radius: 50%;
          transition: transform 0.2s ease-out;
        }
        .site-marker-glow:hover {
          transform: scale(1.3);
          z-index: 1000 !important;
        }

        /* Operator Specific Glows */
        .glow-telekom { box-shadow: 0 0 10px rgba(59, 130, 246, 0.6), 0 2px 4px rgba(0,0,0,0.5); }
        .glow-yettel { box-shadow: 0 0 10px rgba(168, 85, 247, 0.6), 0 2px 4px rgba(0,0,0,0.5); }
        .glow-a1 { box-shadow: 0 0 10px rgba(239, 68, 68, 0.6), 0 2px 4px rgba(0,0,0,0.5); }
        .glow-multi { box-shadow: 0 0 10px rgba(255, 255, 255, 0.4), 0 2px 4px rgba(0,0,0,0.5); }

        /* Cluster Pulse Animation */
        @keyframes cluster-pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }

        .marker-cluster {
          background-clip: padding-box;
          border-radius: 20px;
          animation: cluster-pulse 2s infinite;
        }
        .marker-cluster div {
          width: 30px;
          height: 30px;
          margin-left: 5px;
          margin-top: 5px;
          text-align: center;
          border-radius: 15px;
          font-size: 12px;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }

        .marker-cluster-small { background-color: rgba(59, 130, 246, 0.6); }
        .marker-cluster-medium { background-color: rgba(168, 85, 247, 0.6); }
        .marker-cluster-large { background-color: rgba(239, 68, 68, 0.6); }
      `}</style>
    </>
  );
}

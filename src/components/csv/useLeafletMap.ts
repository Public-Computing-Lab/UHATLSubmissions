'use client';

import { useEffect, useRef, useState } from 'react';
import type { LatLngExpression, Map as LeafletMap, Icon, Marker } from 'leaflet';
import { parseStoredCsvForVisualization, temperatureToColor, type CsvDataPoint } from './utils';

export default function useLeafletMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);

  useEffect(() => {
    const csvText = sessionStorage.getItem('csvData');
    if (!csvText) return;
    
    const data = parseStoredCsvForVisualization(csvText);

    const load = async () => {
      if (!(window as any).L) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
        script.onload = () => initMap((window as any).L, data);
        document.head.appendChild(script);

        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
        document.head.appendChild(css);
      } else {
        initMap((window as any).L, data);
      }
    };

    const initMap = (LInstance: typeof import('leaflet'), data: CsvDataPoint[]) => {
      setL(LInstance);
      const m = LInstance.map(mapRef.current as HTMLDivElement);
      LInstance.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(m);
      setMap(m);

      if (data.length > 0) {
        const latlngs: LatLngExpression[] = data.map(d => [d.lat, d.lng]);
        const bounds = LInstance.latLngBounds(latlngs);
        m.fitBounds(bounds, { padding: [40, 40] });

        // Draw temperature path
        for (let i = 0; i < data.length - 1; i++) {
          const p1 = data[i];
          const p2 = data[i + 1];
          const color = temperatureToColor(p1.probeTemp);
          LInstance.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], { color }).addTo(m);
        }
      }
    };

    load();
  }, []);

  const createIcon = (color: string): Icon | undefined =>
    L?.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

  const addMarker = (
    latlng: LatLngExpression,
    note: string,
    type: 'hot' | 'cool' | 'default' = 'default'
  ): Marker | null => {
    if (!map || !L) return null;

    const icon =
      type === 'hot'
        ? createIcon('red')
        : type === 'cool'
        ? createIcon('blue')
        : createIcon('black');

    const marker = L.marker(latlng, { icon }).addTo(map).bindPopup(note).openPopup();
    return marker;
  };

  return { mapRef, L, map, addMarker };
}

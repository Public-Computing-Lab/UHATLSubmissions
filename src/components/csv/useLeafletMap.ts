'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { LatLngExpression, Map as LeafletMap, Icon, Marker } from 'leaflet';
import { parseStoredCsvForVisualization, temperatureToColor, type CsvDataPoint } from './utils';

export default function useLeafletMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  // Initialize Leaflet and map only once
  useEffect(() => {
    let leafletInstance: typeof import('leaflet');
    let mapInstance: LeafletMap;

    const csvText = sessionStorage.getItem('csvData');
    if (!csvText) return;

    const data = parseStoredCsvForVisualization(csvText);

    let isMounted = true;

    const load = async () => {
      const L = (await import('leaflet')).default || (await import('leaflet'));
      leafletInstance = L;
      setL(L);

      if (!mapRef.current) return;

      // Prevent double initialization
      if (map) return;

      mapInstance = L.map(mapRef.current);
      setMap(mapInstance);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(mapInstance);

      if (data.length > 0) {
        const latlngs: LatLngExpression[] = data.map(d => [d.lat, d.lng]);
        const bounds = L.latLngBounds(latlngs);
        mapInstance.fitBounds(bounds, { padding: [40, 40] });

        // Draw individual temperature points
        data.forEach((point, index) => {
          const color = temperatureToColor(point.probeTemp);
          L.circleMarker([point.lat, point.lng], {
            radius: 4,  // Smaller radius for dense data
            fillColor: color,
            color: color,  // Match border to fill for cleaner look
            weight: 0.5,   // Thinner border
            opacity: 0.8,
            fillOpacity: 0.7  // Slightly transparent for overlapping points
          })
          .bindPopup(`
            <div>
              <strong>Point ${index + 1}</strong><br/>
              Temperature: ${point.probeTemp}°F<br/>
              Lat: ${point.lat.toFixed(6)}<br/>
              Lng: ${point.lng.toFixed(6)}
            </div>
          `, { closeButton: false })  // Cleaner popup for dense data
          .addTo(mapInstance);
        });
      }
    };

    load();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create marker icon
  const createIcon = useCallback(
    (color: string): Icon | undefined =>
      L?.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    [L]
  );

  // Add marker to map
  const addMarker = useCallback(
    (
      latlng: LatLngExpression,
      note: string,
      type: 'hot' | 'cool' | 'default' = 'default',
      openPopup = true
    ): Marker | null => {
      if (!map || !L) return null;

      const icon =
        type === 'hot'
          ? createIcon('red')
          : type === 'cool'
          ? createIcon('blue')
          : createIcon('black');

      const marker = L.marker(latlng, { icon }).addTo(map).bindPopup(note);
      if (openPopup) marker.openPopup();
      markersRef.current.push(marker);
      return marker;
    },
    [map, L, createIcon]
  );

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
  }, []);

  return { mapRef, L, map, addMarker, clearMarkers };
}


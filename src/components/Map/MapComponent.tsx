// src/components/Map/MapComponent.tsx
'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapComponentProps, MapMarker, MapPosition, DEFAULT_MAP_CONFIG } from '@/types/map'
import { clsx } from 'clsx'

// Fix for default markers not showing
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick?: (position: MapPosition) => void }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    },
  })
  return null
}

// Popup content component for markers
function MarkerPopup({ marker }: { marker: MapMarker }) {
  return (
    <div className="max-w-xs">
      <h3 className="font-semibold text-lg mb-2">{marker.title}</h3>
      {marker.imageUrl && (
        <div className="mb-3">
          <img 
            src={marker.imageUrl} 
            alt={marker.title}
            className="w-full h-32 object-cover rounded-md"
            loading="lazy"
          />
        </div>
      )}
      {marker.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{marker.description}</p>
      )}
    </div>
  )
}

export default function MapComponent({
  center = DEFAULT_MAP_CONFIG.center,
  zoom = DEFAULT_MAP_CONFIG.zoom,
  markers = [],
  onMarkerClick,
  onMapClick,
  height = '100vh',
  width = '100%',
  className
}: MapComponentProps) {
  const [isClient, setIsClient] = useState(false)

  // Ensure this only renders on client side to avoid SSR issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div 
        className={clsx('bg-gray-100 flex items-center justify-center', className)}
        style={{ height, width }}
      >
        <div className="text-gray-500">Loading map...</div>
      </div>
    )
  }

  return (
    <div className={clsx('relative', className)} style={{ height, width }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={DEFAULT_MAP_CONFIG.minZoom}
        maxZoom={DEFAULT_MAP_CONFIG.maxZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        touchZoom={true}
        doubleClickZoom={true}
        dragging={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        {/* Handle map click events */}
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Render markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.position.lat, marker.position.lng]}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) {
                  onMarkerClick(marker)
                }
              },
            }}
          >
            <Popup
              closeOnClick={false}
              autoClose={false}
              closeButton={true}
              className="custom-popup"
            >
              <MarkerPopup marker={marker} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
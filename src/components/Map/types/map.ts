// src/types/map.ts
export interface MapPosition {
  lat: number
  lng: number
}

export interface MapMarker {
  id: string
  position: MapPosition
  title: string
  description?: string
  imageUrl?: string
}

export interface MapComponentProps {
  center?: MapPosition
  zoom?: number
  markers?: MapMarker[]
  onMarkerClick?: (marker: MapMarker) => void
  onMapClick?: (position: MapPosition) => void
  height?: string
  width?: string
  className?: string
}

export interface PopupContentProps {
  marker: MapMarker
  onClose?: () => void
}

// Default Atlanta coordinates
export const ATLANTA_COORDS: MapPosition = {
  lat: 33.7490,
  lng: -84.3880
}

// Default map configuration
export const DEFAULT_MAP_CONFIG = {
  center: ATLANTA_COORDS,
  zoom: 11,
  minZoom: 3,
  maxZoom: 18,
}
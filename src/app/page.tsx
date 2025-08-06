"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSubmission } from "@/app/context/SubmissionContext";
import { supabase } from "@/lib/supabase";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useMap } from "react-leaflet";

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });

function MapRefConnector({ setRef }: { setRef: (map: LeafletMap) => void }) {
  const map = useMap();

  useEffect(() => {
    setRef(map);
  }, [map, setRef]);

  return null;
}

type OverlayType = 'picture' | 'sensor' | 'layers' | 'mapStyle' | null;

// Map style options
const mapStyles = {
  minimal: {
    name: "Minimal",
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap, &copy; CARTO"
  },
  clean: {
    name: "Clean",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap, &copy; CARTO"
  },
  dark: {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap, &copy; CARTO"
  },
  standard: {
    name: "Standard",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors"
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri"
  }
} as const;

interface ImageSubmission {
  id: string;
  image_url: string;
  comfort_level: string;
  comment: string;
  lat: number;
  long: number;
  created_at: string;
  signedImageUrl?: string;
}

export default function HomePage() {
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
  const [showInitialOverlay, setShowInitialOverlay] = useState(true);
  const [mapStyle, setMapStyle] = useState<keyof typeof mapStyles>("clean");
  const [layerStates, setLayerStates] = useState({
    satellite: false,
    heatMap: true,
    traffic: false,
    sensorPoints: true,
    photoMarkers: true,
    boundaries: false,
  });
  const [imageSubmissions, setImageSubmissions] = useState<ImageSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ImageSubmission | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [colorIcons, setColorIcons] = useState<{ [key: string]: any }>({});
  const [imageCache, setImageCache] = useState<{ [key: string]: string }>({});
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);

  const { resetContext } = useSubmission();
  const mapRef = useRef<LeafletMap | null>(null);

  // Gradient map for comfort levels
  const gradientMap: Record<string, [string, string]> = {
    Freezing: ["#8CB9F1", "#CFE8FF"],
    Chilly: ["#0074B7", "#88D6F0"],
    Comfortable: ["#21A348", "#9FEFAF"],
    Warm: ["#FFD500", "#FFF3B0"],
    Hot: ["#E27100", "#FFB74D"],
    Sweltering: ["#6C1D45", "#FF4B4B"],
  };

  useEffect(() => {
    resetContext();
    fetchImageSubmissions();
  }, []);

  useEffect(() => {
    if (imageSubmissions.length > 0 && !showInitialOverlay) {
      createColorIcons();
    }
  }, [imageSubmissions, showInitialOverlay]);

  const toggleOverlay = (type: OverlayType) => {
    setActiveOverlay(activeOverlay === type ? null : type);
  };

  const handleInitialButtonClick = (type: OverlayType) => {
    setShowInitialOverlay(false);
    if (type === 'picture' || type === 'sensor') {
      setActiveOverlay(type);
    }
  };

  const handleLayerChange = (layerKey: string) => {
    setLayerStates(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey as keyof typeof prev]
    }));
  };

  const renderOverlayContent = () => {
    switch (activeOverlay) {
      case 'picture':
        return (
          <div className="h-full bg-gradient-to-b from-purple-50 to-pink-50 flex flex-col">
            {/* Fixed Header */}
            <div className="p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Upload Images</h2>
                <button
                  onClick={() => setActiveOverlay(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Instructions:</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="mr-2 text-purple-500">•</span>
                    <span>Enable location services on your device</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-purple-500">•</span>
                    <span>Take photos in different temperature conditions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-purple-500">•</span>
                    <span>Add context about how the temperature feels</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <Link
                  href="/upload-now"
                  className="block w-full text-center bg-purple-600 text-white font-semibold py-4 px-4 rounded-xl hover:bg-purple-700 transition-colors duration-200 shadow-lg"
                >
                  Take Photo Now
                </Link>
                <Link
                  href="/upload"
                  className="block w-full text-center bg-white border-2 border-purple-600 text-purple-600 font-semibold py-4 px-4 rounded-xl hover:bg-purple-50 transition-colors duration-200"
                >
                  Upload Existing Photo
                </Link>
              </div>
            </div>
          </div>
        );
      case 'sensor':
        return (
          <div className="h-full bg-gradient-to-b from-green-50 to-teal-50 flex flex-col">
            {/* Fixed Header */}
            <div className="p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Upload Sensor Data</h2>
                <button
                  onClick={() => setActiveOverlay(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Using the Sensor</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>Track "internal temperature" and "temperature probe"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>Enable location tracking</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>Data rate should be 1pt/sec</span>
                  </li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">On Your Walk</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>Hold the sensor away from your body</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>Keep the Pocketlab app open and keep your phone awake</span>
                  </li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Data Requirements</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>CSV format</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>Include latitude, longitude, and temperature probe measurements</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <Link
                  href="/upload-csv"
                  className="block w-full text-center bg-green-600 text-white font-semibold py-4 px-4 rounded-xl hover:bg-green-700 transition-colors duration-200 shadow-lg"
                >
                  Upload CSV File
                </Link>
                
                <Link
                  href=""
                  className="block w-full text-center bg-white border-2 border-green-600 text-green-600 font-semibold py-4 px-4 rounded-xl hover:bg-green-50 transition-colors duration-200"
                >
                  Full Instructions and Training Materials
                </Link>
              </div>
            </div>
          </div>
        );
      case 'layers':
        return (
          <div className="h-full bg-gradient-to-b from-blue-50 to-indigo-50 flex flex-col">
            {/* Fixed Header */}
            <div className="p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Map Layers</h2>
                <button
                  onClick={() => setActiveOverlay(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {[
                  { key: 'satellite', name: 'Temperature Records', icon: '🌡️' },
                  { key: 'heatMap', name: 'Heat Map', icon: '🔥' },
                  { key: 'traffic', name: 'Traffic Data', icon: '🚦' },
                  { key: 'sensorPoints', name: 'Sensor Points', icon: '📍' },
                  { key: 'photoMarkers', name: 'Photo Locations', icon: '📸' },
                  { key: 'boundaries', name: 'District Boundaries', icon: '🗺️' },
                ].map((layer) => (
                  <label key={layer.key} className="flex items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      id={layer.key}
                      checked={layerStates[layer.key as keyof typeof layerStates]}
                      onChange={() => handleLayerChange(layer.key)}
                      className="mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="mr-3 text-xl">{layer.icon}</span>
                    <span className="text-gray-800 font-medium flex-1">{layer.name}</span>
                  </label>
                ))}
              </div>

              <button className="w-full bg-blue-600 text-white font-semibold py-4 px-4 rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-lg mt-6">
                Apply Changes
              </button>
            </div>
          </div>
        );
      case 'mapStyle':
        return (
          <div className="h-full bg-gradient-to-b from-gray-50 to-slate-50 flex flex-col">
            {/* Fixed Header */}
            <div className="p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Map Style</h2>
                <button
                  onClick={() => setActiveOverlay(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(mapStyles).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setMapStyle(key as keyof typeof mapStyles);
                      setActiveOverlay(null);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      mapStyle === key 
                        ? "border-gray-800 bg-gray-100" 
                        : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="text-lg font-medium">{style.name}</div>
                    {mapStyle === key && (
                      <div className="text-xs text-green-600 mt-1">Active</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Fetch image submissions from database
  const fetchImageSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("image_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setImageSubmissions(data || []);
    } catch (err) {
      console.error("Error fetching image submissions:", err);
    }
  };

  // Create colored icons for markers
  const createColorIcons = async () => {
    if (typeof window === "undefined") return;
    
    const L = await import("leaflet");
    const icons: { [key: string]: any } = {};
    
    const comfortLevels = Object.keys(gradientMap);
    
    for (const level of comfortLevels) {
      const color = gradientMap[level][0];
      const isMobile = window.innerWidth < 768;
      const markerSize = isMobile ? 24 : 20;
      
      const svgIcon = `
        <svg width="${markerSize}" height="${markerSize}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${markerSize/2}" cy="${markerSize/2}" r="${markerSize/2 - 2}" 
                  fill="${color}" stroke="white" stroke-width="2" 
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
        </svg>
      `;
      
      const iconUrl = `data:image/svg+xml;base64,${btoa(svgIcon)}`;
      
      icons[level] = new L.Icon({
        iconUrl: iconUrl,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize/2, markerSize/2],
        popupAnchor: [0, -markerSize/2],
        className: 'custom-color-marker',
      });
    }
    
    setColorIcons(icons);
  };

  // Get signed URL for image
  const getImageUrl = async (imagePath: string): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from("submitted-images")
        .createSignedUrl(imagePath, 3600);

      if (error) {
        console.error("Error creating signed URL:", error);
        return "";
      }

      return data.signedUrl;
    } catch (err) {
      console.error("Error getting image URL:", err);
      return "";
    }
  };

  // Handle marker click
  const handleMarkerClick = async (submission: ImageSubmission) => {
    setImageLoadError(null);
    setSelectedSubmission(submission);
    
    if (imageCache[submission.id]) {
      submission.signedImageUrl = imageCache[submission.id];
      return;
    }
    
    setImageLoading(true);
    try {
      const signedUrl = await getImageUrl(submission.image_url);
      if (signedUrl) {
        submission.signedImageUrl = signedUrl;
        setImageCache(prev => ({
          ...prev,
          [submission.id]: signedUrl
        }));
      } else {
        setImageLoadError(`Could not load image: ${submission.image_url}`);
      }
    } catch (error) {
      setImageLoadError(`Error loading image: ${error}`);
    } finally {
      setImageLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedSubmission(null);
    setImageLoading(false);
    setImageLoadError(null);
  };

  return (
    <main className="relative w-full h-screen font-sans">
      <MapContainer
        center={[33.7756, -84.3963]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution={mapStyles[mapStyle].attribution}
          url={mapStyles[mapStyle].url}
        />
        
        {/* Add markers for image submissions */}
        {layerStates.photoMarkers && imageSubmissions.map((submission) => (
          colorIcons[submission.comfort_level] && (
            <Marker
              key={submission.id}
              position={[submission.lat, submission.long]}
              icon={colorIcons[submission.comfort_level]}
              eventHandlers={{
                click: () => handleMarkerClick(submission),
              }}
            />
          )
        ))}
        
        <MapRefConnector setRef={(map) => { mapRef.current = map; }} />
      </MapContainer>
      
      {/* Initial Overlay with Three Buttons */}
      {showInitialOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[3000] flex items-center justify-center px-4">
          <div className="flex flex-col space-y-4 max-w-sm w-full">
            <h1 className="text-3xl font-bold text-white text-center mb-4">Urban Heat Atlanta</h1>
            
            {/* Upload Images Button */}
            <button
              onClick={() => handleInitialButtonClick('picture')}
              className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-6 px-6 rounded-2xl shadow-xl transition-all duration-200 flex items-center space-x-4 transform hover:scale-105"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <span className="text-lg block">Upload Images</span>
                <span className="text-sm text-gray-500">Share your experience</span>
              </div>
            </button>

            {/* Upload Sensor Data Button */}
            <button
              onClick={() => handleInitialButtonClick('sensor')}
              className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-6 px-6 rounded-2xl shadow-xl transition-all duration-200 flex items-center space-x-4 transform hover:scale-105"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <span className="text-lg block">Upload Sensor Data</span>
                <span className="text-sm text-gray-500">Temperature measurements</span>
              </div>
            </button>

            {/* View Map Button */}
            <button
              onClick={() => handleInitialButtonClick(null)}
              className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-6 px-6 rounded-2xl shadow-xl transition-all duration-200 flex items-center space-x-4 transform hover:scale-105"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <span className="text-lg block">View Map</span>
                <span className="text-sm text-gray-500">Explore heat data</span>
              </div>
            </button>
          </div>
        </div>
      )}
      
      {/* Floating action buttons - Mobile Optimized */}
      {!showInitialOverlay && (
        <div className="fixed bottom-6 right-4 z-[1000] flex flex-col space-y-3">
          {/* Add Picture Button */}
          <button
            onClick={() => toggleOverlay('picture')}
            className={`bg-purple-500 hover:bg-purple-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 ${
              activeOverlay === 'picture' ? 'scale-110 shadow-xl' : ''
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Add Sensor Data Button */}
          <button
            onClick={() => toggleOverlay('sensor')}
            className={`bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 ${
              activeOverlay === 'sensor' ? 'scale-110 shadow-xl' : ''
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>

          {/* Layers Button */}
          {/* <button
            onClick={() => toggleOverlay('layers')}
            className={`bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
              activeOverlay === 'layers' ? 'scale-110 shadow-xl' : ''
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button> */}

          {/* Map Style Button */}
          <button
            onClick={() => toggleOverlay('mapStyle')}
            className={`bg-gray-600 hover:bg-gray-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${
              activeOverlay === 'mapStyle' ? 'scale-110 shadow-xl' : ''
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Overlay Panel - Mobile Optimized */}
      {activeOverlay && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-40 z-[1500] transition-opacity duration-300 md:hidden"
            onClick={() => setActiveOverlay(null)}
          />
          
          {/* Slide-in Panel - Full screen on mobile */}
          <div className="fixed inset-x-0 bottom-0 h-[85vh] md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-96 bg-white shadow-2xl z-[2000] transform transition-transform duration-300 ease-out rounded-t-3xl md:rounded-none overflow-hidden">
            {renderOverlayContent()}
          </div>
        </>
      )}

      {/* Modal for Selected Submission */}
      {selectedSubmission && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-3 z-[3000]"
          onClick={closeModal}
        >
          <div className="relative w-full h-screen overflow-hidden bg-black text-white">
            {/* Background Image */}
            {imageLoading ? (
              <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                  <div>Loading image...</div>
                </div>
              </div>
            ) : imageLoadError ? (
              <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-white text-center p-4">
                  <div className="text-red-400 mb-2">Failed to load image</div>
                  <div className="text-xs opacity-70">{imageLoadError}</div>
                </div>
              </div>
            ) : selectedSubmission.signedImageUrl ? (
              <img
                src={selectedSubmission.signedImageUrl}
                alt="Submission"
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setImageLoadError(`Image failed to load from URL`)}
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-white">Click to load image...</div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 bg-black/80 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/90 transition-all text-xl border-2 border-white/20 shadow-lg z-50"
            >
              ✕
            </button>

            {/* Main content card - aggressive gradient coloring */}
            <div 
              className="absolute inset-0 flex items-center justify-center px-3 py-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="text-white rounded-lg p-4 w-full max-w-sm shadow-xl border-2 border-white/40"
                style={{
                  background: `linear-gradient(135deg, ${gradientMap[selectedSubmission.comfort_level]?.[0]}CC, ${gradientMap[selectedSubmission.comfort_level]?.[1]}E6)`,
                  backdropFilter: "blur(15px)",
                  boxShadow: `0 8px 32px ${gradientMap[selectedSubmission.comfort_level]?.[0]}40`,
                }}
              >
                
                {/* Timestamp Section */}
                <div className="text-center pb-3 border-b border-white/40 mb-3">
                  <p className="text-xs font-bold text-white drop-shadow-lg">
                    {formatDateTime(selectedSubmission.created_at)}
                  </p>
                </div>

                {/* Comfort Level Section */}
                <div className="text-center pb-3 border-b border-white/40 mb-3">
                  <div className="flex items-center justify-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full border-3 border-white shadow-lg"
                      style={{
                        background: `linear-gradient(to bottom, ${gradientMap[selectedSubmission.comfort_level]?.[0]}, ${gradientMap[selectedSubmission.comfort_level]?.[1]})`,
                        boxShadow: `0 4px 12px ${gradientMap[selectedSubmission.comfort_level]?.[0]}60`,
                      }}
                    />
                    <span className="text-sm font-bold text-white drop-shadow-lg">
                      {selectedSubmission.comfort_level}
                    </span>
                  </div>
                </div>

                {/* Description Section */}
                <div className="pb-3 border-b border-white/40 mb-3">
                  <h3 className="text-center text-sm font-bold mb-3 text-white drop-shadow-lg font-[family-name:var(--font-geist-mono)]">About This Photo</h3>
                  <div 
                    className="text-center text-xs leading-relaxed p-3 rounded-lg"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <p className="text-white font-medium drop-shadow-sm">
                      {selectedSubmission.comment || "No description provided"}
                    </p>
                  </div>
                </div>

                {/* Location Section */}
                {/* <div className="text-center pb-3 border-b border-white/40 mb-3">
                  <h3 className="text-sm font-bold mb-2 text-white drop-shadow-lg font-[family-name:var(--font-geist-mono)]">Location</h3>
                  <div 
                    className="text-xs p-2 rounded-lg font-mono"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <p className="text-white font-semibold drop-shadow-sm">
                      {selectedSubmission.lat.toFixed(4)}, {selectedSubmission.long.toFixed(4)}
                    </p>
                  </div>
                </div> */}

                {/* Action Section */}
                <div className="text-center">
                  <button
                    onClick={closeModal}
                    className="w-full rounded-lg px-6 py-3 text-sm font-bold shadow-lg transition-all duration-200 font-[family-name:var(--font-geist-mono)] bg-white/95 text-black hover:bg-white hover:scale-105 backdrop-blur-sm"
                    style={{
                      boxShadow: `0 4px 16px ${gradientMap[selectedSubmission.comfort_level]?.[0]}40`,
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add custom styles */}
      <style jsx global>{`
        .custom-color-marker {
          cursor: pointer;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        
        .custom-color-marker:hover {
          transform: scale(1.2);
          filter: brightness(1.1);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </main>
  );
}

// Add the formatDateTime function before the return statement
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
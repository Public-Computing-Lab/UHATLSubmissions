'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(
  () => import('@/components/Map/MapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100 font-mono">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-300 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }
);

type OverlayType = 'picture' | 'sensor' | 'layers' | null;

export default function HomePage() {
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
  const [layerStates, setLayerStates] = useState({
    satellite: false,
    heatMap: true,
    traffic: false,
    sensorPoints: true,
    photoMarkers: true,
    boundaries: false,
  });

  const toggleOverlay = (type: OverlayType) => {
    setActiveOverlay(activeOverlay === type ? null : type);
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
          <div className="p-6 bg-gradient-to-b from-purple-200 to-pink-200 text-gray-800 min-h-full font-mono">
            <h2 className="text-2xl font-bold mb-6">Calling all Citizen Scientists!</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Before Taking Your Photo:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Enable location data</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Display "internal temperature" and "temperature probe" charts</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Collect data at 1pt/sec</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Connect the temperature probe to the blue sensor</span>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">On Your Walk:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Avoid direct sunlight on the temperature probe</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Hold the temperature probe away from your body</span>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <p className="text-sm underline cursor-pointer hover:text-purple-600 transition-colors">
                Full Walk Instructions &gt;
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/upload-now"
                className="block w-full text-center bg-transparent border-2 border-gray-600 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-white hover:bg-opacity-50 transition-colors duration-200"
              >
                Take Photo Now
              </Link>
              <Link
                href="/upload"
                className="block w-full text-center bg-transparent border-2 border-gray-600 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-white hover:bg-opacity-50 transition-colors duration-200"
              >
                Upload a Photo
              </Link>
            </div>

          </div>
        );
      case 'sensor':
        return (
          <div className="p-6 bg-gradient-to-b from-green-200 to-teal-200 text-gray-800 min-h-full font-mono">
            <h2 className="text-2xl font-bold mb-6">Upload Sensor Data</h2>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Data Requirements:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Supported formats: CSV</span>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Temperature Data from PocketLab</h3>
            </div>

            <div className="space-y-3">
              <Link
                href="/upload-csv"
                className="w-full bg-white text-teal-600 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 shadow-sm">
                Upload CSV File
              </Link>
            </div>
          </div>
        );
      case 'layers':
        return (
          <div className="p-6 bg-gradient-to-b from-blue-200 to-indigo-200 text-gray-800 min-h-full font-mono">
            <h2 className="text-2xl font-bold mb-6">Map Layers</h2>
            <div className="space-y-4">
              {[
                { key: 'satellite', name: 'Temperature Records' },
                { key: 'heatMap', name: 'Images' },
                { key: 'traffic', name: 'Annotations' },
                { key: 'sensorPoints', name: 'Satellite BaseMap' },
                { key: 'photoMarkers', name: 'Light Base Map' },
                { key: 'boundaries', name: 'Dark Base Map' },
              ].map((layer) => (
                <div key={layer.key} className="flex items-center p-3 bg-white bg-opacity-50 rounded-lg">
                  <input
                    type="checkbox"
                    id={layer.key}
                    checked={layerStates[layer.key as keyof typeof layerStates]}
                    onChange={() => handleLayerChange(layer.key)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={layer.key} className="text-gray-800 cursor-pointer flex-1">
                    {layer.name}
                  </label>
                </div>
              ))}

              <button className="w-full bg-white text-blue-600 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 shadow-sm mt-6">
                Apply Changes
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="relative w-full h-screen font-mono">
      <MapComponent />
      
      {/* Floating action buttons */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col space-y-3">
        {/* Add Picture Button */}
        <button
          onClick={() => toggleOverlay('picture')}
          className={`bg-purple-300 hover:bg-purple-400 text-gray-800 rounded-full p-3 shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 ${
            activeOverlay === 'picture' ? 'bg-purple-400' : ''
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Add Sensor Data Button */}
        <button
          onClick={() => toggleOverlay('sensor')}
          className={`bg-green-300 hover:bg-green-400 text-gray-800 rounded-full p-3 shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2 ${
            activeOverlay === 'sensor' ? 'bg-green-400' : ''
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>

        {/* Layers Button */}
        <button
          onClick={() => toggleOverlay('layers')}
          className={`bg-blue-300 hover:bg-blue-400 text-gray-800 rounded-full p-3 shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 ${
            activeOverlay === 'layers' ? 'bg-blue-400' : ''
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Overlay Panel */}
      {activeOverlay && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-20 z-[1500] transition-opacity duration-300"
            onClick={() => setActiveOverlay(null)}
          />
          
          {/* Slide-in Panel */}
          <div className="fixed right-0 top-0 h-full w-4/5 max-w-md bg-white shadow-xl z-[2000] transform transition-transform duration-300 ease-in-out overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setActiveOverlay(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Panel Content */}
            {renderOverlayContent()}
          </div>
        </>
      )}
    </main>
  );
}
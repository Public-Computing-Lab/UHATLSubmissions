"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSubmission } from "../context/SubmissionContext";

export default function Page() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [comfortLevel, setComfortLevel] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");
  const [map, setMap] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);   
  const router = useRouter();

  const {
    setImage,
    setComfortLevel: setContextComfortLevel,
    setLocationCoords,
    setCreatedAt,
  } = useSubmission();

  // Set current datetime as default and initialize map
  useEffect(() => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setSelectedDateTime(localDateTime);

    // Initialize Leaflet map
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
      
      if (mapRef.current) {
        const leafletMap = (window as any).L.map(mapRef.current).setView([33.7490, -84.3880], 10);
        
        (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(leafletMap);

        leafletMap.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setSelectedLocation({ lat, lng });
          
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = (window as any).L.marker([lat, lng]).addTo(leafletMap);
          }
        });

        setMap(leafletMap);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, WebP, SVG, or BMP)');
        return;
      }
      
      // Check file size (e.g., 10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('Image size must be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImage(result);
      };
      reader.onerror = () => {
        alert('Failed to read image file. Please try another image.');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImage(null);
  };

  const handleNextClick = () => {
    if (imagePreview && comfortLevel && selectedLocation && selectedDateTime) {
      const dateTime = new Date(selectedDateTime);
      setCreatedAt(dateTime.toISOString());
      setLocationCoords(selectedLocation.lat, selectedLocation.lng);
      router.push("/upload/edit");
    }
  };

  const isFormComplete = imagePreview && comfortLevel && selectedLocation && selectedDateTime;

  const comfortLevels = [
    { value: "Freezing", color: "from-blue-400 to-blue-600", emoji: "🥶" },
    { value: "Chilly", color: "from-cyan-400 to-cyan-600", emoji: "😬" },
    { value: "Comfortable", color: "from-green-400 to-green-600", emoji: "😊" },
    { value: "Warm", color: "from-yellow-400 to-yellow-600", emoji: "😅" },
    { value: "Hot", color: "from-orange-400 to-orange-600", emoji: "🥵" },
    { value: "Sweltering", color: "from-red-400 to-red-600", emoji: "🔥" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-6 font-sans">
      {/* Header */}
      <div className="max-w-md mx-auto mb-6">
        <button 
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Your Photo
        </h1>
        <p className="text-gray-600 text-sm">
          Share a photo and help us understand how temperature feels in different places
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Image Upload Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Select Photo</h2>
          
          {imagePreview ? (
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-3 right-3 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label
              htmlFor="file-upload"
              className="w-full aspect-[4/3] flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl hover:from-purple-200 hover:to-pink-200 transition-all duration-200 cursor-pointer group"
            >
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="mt-4 text-gray-700 font-medium">Choose Photo</p>
              {/* <p className="mt-1 text-xs text-gray-500">JPEG, PNG, GIF, WebP, SVG, BMP (max 10MB)</p> */}
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>

        {/* Temperature Comfort Level */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Step 2: How did it feel?
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            {comfortLevels.map((level) => (
              <label
                key={level.value}
                className={`relative cursor-pointer transform transition-all duration-200 ${
                  comfortLevel === level.value ? 'scale-105' : 'hover:scale-102'
                }`}
              >
                <input
                  type="radio"
                  name="comfort"
                  value={level.value}
                  checked={comfortLevel === level.value}
                  onChange={(e) => {
                    setComfortLevel(e.target.value);
                    setContextComfortLevel(e.target.value);
                  }}
                  className="sr-only"
                />
                <div className={`p-4 rounded-xl border-2 transition-all ${
                  comfortLevel === level.value
                    ? `border-transparent bg-gradient-to-br ${level.color} text-white shadow-lg`
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}>
                  <div className="text-center">
                    <span className="text-2xl">{level.emoji}</span>
                    <p className={`mt-1 text-sm font-medium ${
                      comfortLevel === level.value ? 'text-white' : 'text-gray-700'
                    }`}>
                      {level.value}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Where was this?</h2>
          <p className="text-sm text-gray-600 mb-4">Tap the map to mark the location</p>
          
          <div className="space-y-3">
            <div 
              ref={mapRef}
              className="h-64 w-full rounded-xl border-2 border-gray-200 bg-gray-50"
            />
            {selectedLocation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  📍 Location set: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Date and Time Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 4: When was this?</h2>
          
          <input
            type="datetime-local"
            value={selectedDateTime}
            onChange={(e) => setSelectedDateTime(e.target.value)}
            className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNextClick}
          disabled={!isFormComplete}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
            isFormComplete
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Continue to Edit
        </button>
      </div>

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
}
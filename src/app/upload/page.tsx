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
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
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
        // Center on Atlanta with appropriate zoom level
        const leafletMap = (window as any).L.map(mapRef.current).setView([33.7490, -84.3880], 10);
        
        (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(leafletMap);

        leafletMap.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setSelectedLocation({ lat, lng });
          
          if (markerRef.current) {
            // Move existing marker
            markerRef.current.setLatLng([lat, lng]);
          } else {
            // Create first (and only) marker
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
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImage(result);
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
      // Convert datetime-local input to ISO string
      const dateTime = new Date(selectedDateTime);
      setCreatedAt(dateTime.toISOString());
      
      // Set location coordinates
      setLocationCoords(selectedLocation.lat, selectedLocation.lng);
      
      router.push("/upload/edit");
    }
  };

  const isFormComplete = imagePreview && comfortLevel && selectedLocation && selectedDateTime;

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center justify-center sm:items-start w-full max-w-md">
        
        {/* Header */}
        <div>
          <h1 className="text-lg text-center sm:text-left font-[family-name:var(--font-geist-mono)]">Upload an Image:</h1>
        </div>

        {/* Image Upload Section */}
        <div className="w-full">
          {imagePreview ? (
            <div className="relative aspect-square w-full">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-white bg-opacity-80 text-red-500 font-bold rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-opacity-100 transition"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ) : (
            <label
              htmlFor="file-upload"
              className="w-full aspect-square flex items-center justify-center border-2 border-dashed border-stone-300 rounded-lg text-4xl text-stone-500 cursor-pointer hover:bg-amber-50 transition"
            >
              +
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
        <div className="w-full font-[family-name:var(--font-geist-mono)]">
          <p className="mb-4 text-sm">What was your temperature comfort level when this image was taken?</p>
          <div className="flex flex-col gap-3">
            {["Freezing", "Chilly", "Comfortable", "Warm", "Hot", "Sweltering"].map((level) => (
              <label key={level} className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    name="comfort"
                    value={level}
                    checked={comfortLevel === level}
                    onChange={(e) => {
                      setComfortLevel(e.target.value);
                      setContextComfortLevel(e.target.value);
                    }}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 border-stone-400 ${comfortLevel === level ? 'bg-amber-500' : 'bg-transparent'}`} />
                </div>
                <span className="text-sm">{level}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Location Section */}
        <div className="w-full font-[family-name:var(--font-geist-mono)]">
          <p className="mb-4 text-sm">Where was this image taken? Click on the map to select a location:</p>
          
          {/* Leaflet Map */}
          <div className="space-y-2">
            <div 
              ref={mapRef}
              className="h-48 w-full rounded border border-stone-300 bg-stone-50"
            />
            {selectedLocation && (
              <p className="text-xs text-stone-600">
                Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </p>
            )}
          </div>
        </div>

        {/* Date and Time Section */}
        <div className="w-full font-[family-name:var(--font-geist-mono)]">
          <p className="mb-4 text-sm">When was this image taken?</p>
          
          <div className="space-y-2">
            <label className="block text-xs text-stone-700">Date and Time</label>
            <input
              type="datetime-local"
              value={selectedDateTime}
              onChange={(e) => setSelectedDateTime(e.target.value)}
              className="w-full p-3 bg-white border border-stone-300 rounded text-stone-900 text-sm hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNextClick}
          disabled={!isFormComplete}
          className={`font-[family-name:var(--font-geist-mono)] w-full px-6 py-3 rounded-md shadow transition
            ${
              isFormComplete
                ? "bg-stone-100 text-amber-900 hover:bg-stone-300 focus:ring-2 focus:ring-stone-500"
                : "bg-stone-100 text-stone-400 cursor-not-allowed"
            }`}
        >
          Next
        </button>
      </main>
    </div>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSubmission } from "../context/SubmissionContext";

export default function Page() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [comfortLevel, setComfortLevel] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedHour, setSelectedHour] = useState<number>(12);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [isAM, setIsAM] = useState<boolean>(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  // Set current date as default and initialize map
  useEffect(() => {
    const now = new Date();
    setSelectedDate(now.toISOString().split('T')[0]);
    setSelectedHour(now.getHours() > 12 ? now.getHours() - 12 : now.getHours() || 12);
    setSelectedMinute(Math.round(now.getMinutes() / 30) * 30);
    setIsAM(now.getHours() < 12);

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

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Removed - no longer needed
  };

  const handleLocationMethodChange = (method: "current" | "manual") => {
    // Removed - no longer needed
  };

  const formatDateTime = () => {
    if (!selectedDate) return null;
    
    let hour24 = selectedHour;
    if (!isAM && selectedHour !== 12) {
      hour24 += 12;
    } else if (isAM && selectedHour === 12) {
      hour24 = 0;
    }
    
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hour24, selectedMinute, 0, 0);
    return dateTime.toISOString();
  };

  const handleNextClick = () => {
    if (imagePreview && comfortLevel && selectedLocation && selectedDate) {
      // Set the datetime in context
      const formattedDateTime = formatDateTime();
      
      if (formattedDateTime) {
        setCreatedAt(formattedDateTime);
      }
      
      // Set location coordinates
      setLocationCoords(selectedLocation.lat, selectedLocation.lng);
      
      router.push("/upload/edit");
    }
  };

  const isFormComplete = imagePreview && comfortLevel && selectedLocation && selectedDate;

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const formatDisplayTime = () => {
    const displayHour = selectedHour === 0 ? 12 : selectedHour;
    return `${displayHour}:${String(selectedMinute).padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;
  };

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

          {/* Date and Time Controls */}
          <div className="space-y-4">
            {/* Date Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="w-full p-2 bg-white border border-stone-300 rounded text-stone-900 text-sm text-left hover:bg-stone-50 transition"
              >
                {selectedDate ? formatDisplayDate(selectedDate) : 'Select date'}
              </button>
                
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-stone-300 rounded shadow-lg p-4 z-10 w-64">
                    <div className="text-center font-medium mb-2 text-stone-900">
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center p-1 font-medium text-stone-600">{day}</div>
                      ))}
                      {generateCalendarDays().map((date, index) => {
                        const dateString = formatDate(date);
                        const isCurrentMonth = date.getMonth() === new Date().getMonth();
                        const isSelected = selectedDate === dateString;
                        const isToday = formatDate(new Date()) === dateString;
                        
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setSelectedDate(dateString);
                              setShowDatePicker(false);
                            }}
                            className={`p-1 text-center rounded text-xs ${
                              !isCurrentMonth ? 'text-stone-400' :
                              isSelected ? 'bg-amber-500 text-white' :
                              isToday ? 'bg-amber-100 text-amber-800' :
                              'hover:bg-stone-100 text-stone-900'
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Time Display */}
              <div className="text-center text-lg font-[family-name:var(--font-geist-mono)] bg-stone-50 p-3 rounded border border-stone-200">
                {formatDisplayTime()}
              </div>

              {/* Hour Slider */}
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Hour: {selectedHour}</label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                  className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Minute Slider */}
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Minute: {selectedMinute}</label>
                <input
                  type="range"
                  min="0"
                  max="59"
                  step="1"
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                  className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* AM/PM Toggle */}
              <div className="flex justify-center">
                <div className="flex bg-stone-200 rounded p-1">
                  <button
                    type="button"
                    onClick={() => setIsAM(true)}
                    className={`px-4 py-2 rounded text-sm transition ${isAM ? 'bg-amber-500 text-white' : 'bg-transparent text-stone-700 hover:bg-stone-100'}`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAM(false)}
                    className={`px-4 py-2 rounded text-sm transition ${!isAM ? 'bg-amber-500 text-white' : 'bg-transparent text-stone-700 hover:bg-stone-100'}`}
                  >
                    PM
                  </button>
                </div>
              </div>
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

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
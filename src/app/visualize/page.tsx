'use client';

import { useEffect, useState } from 'react';
import { LatLng } from 'leaflet';
import useLeafletMap from '@/components/csvMap/useLeafletMap';
import StepCard from '@/components/csvMap/StepCard';
import { supabase } from '@/lib/supabase';

export default function VisualizePage() {
  const { mapRef, L, map, drawTemperaturePath, addMarker } = useLeafletMap();

  const [step, setStep] = useState<number>(1);
  const [hotNote, setHotNote] = useState<string>('');
  const [coolNote, setCoolNote] = useState<string>('');
  const [routeMeaning, setRouteMeaning] = useState<string>('');
  const [extraNotes, setExtraNotes] = useState<{ latlng: LatLng; note: string }[]>([]);

  const [showCard, setShowCard] = useState<boolean>(true);
  const [addingExtra, setAddingExtra] = useState<boolean>(false);
  const [tempNote, setTempNote] = useState<string>('');

  const [hotCoords, setHotCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coolCoords, setCoolCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (map && L) {
      drawTemperaturePath();
    }
  }, [map, L, drawTemperaturePath]);

  useEffect(() => {
    if (!map) return;

    const handleClick = (e: { latlng: LatLng }) => {
      if (step === 1 && hotNote) {
        addMarker(e.latlng, hotNote, 'hot');
        setHotCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        setStep(2);
      } else if (step === 2 && coolNote) {
        addMarker(e.latlng, coolNote, 'cool');
        setCoolCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        setStep(3);
      } else if (addingExtra && tempNote) {
        addMarker(e.latlng, tempNote, 'default');
        setExtraNotes(prev => [...prev, { latlng: e.latlng, note: tempNote }]);
        setTempNote('');
        setAddingExtra(false);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, step, hotNote, coolNote, tempNote, addingExtra, addMarker]);

  const handleSubmit = async () => {
    if (!hotCoords || !coolCoords) {
      alert('Please place both hot and cool markers before submitting.');
      return;
    }

    const { error } = await supabase.from('markers').insert([
      {
        hot_note: hotNote,
        hot_lat: hotCoords.lat,
        hot_lng: hotCoords.lng,
        cool_note: coolNote,
        cool_lat: coolCoords.lat,
        cool_lng: coolCoords.lng,
        route_meaning: routeMeaning,
        extra_markers: extraNotes.map(n => ({
          lat: n.latlng.lat,
          lng: n.latlng.lng,
          note: n.note,
        })),
      },
    ]);

    if (error) {
      alert('Upload failed: ' + error.message);
    } else {
      alert('Submitted!');
      setHotNote('');
      setCoolNote('');
      setRouteMeaning('');
      setExtraNotes([]);
      setHotCoords(null);
      setCoolCoords(null);
      window.location.href = '/';
    }
  };

  return (
    <div className="sensor-app">
      <div ref={mapRef} className="map-background" />

      {showCard && step <= 3 && (
        <StepCard
          step={step}
          hotNote={hotNote}
          setHotNote={setHotNote}
          coolNote={coolNote}
          setCoolNote={setCoolNote}
          routeMeaning={routeMeaning}
          setRouteMeaning={setRouteMeaning}
          onFinish={() => setShowCard(false)}
        />
      )}

      {!showCard && (
        <div className="interaction-overlay">
          {addingExtra && (
            <div className="question-card extra">
              <input
                placeholder="Add Note"
                className="note-input"
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
              />
              <button className="submit-button">Click on map to place note</button>
            </div>
          )}
          {/* floating action buttons  */}
            <div className="absolute bottom-6 right-6 z-[1000] flex flex-col space-y-3">
            {/* ➕  add extra-note button */}
            <button
                onClick={() => setAddingExtra(true)}
                className="bg-purple-300 hover:bg-purple-400 text-gray-800 rounded-full p-3 shadow-lg transition-colors duration-200
                        focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2"
            >
                {/* plus icon (same inline SVG style you used before) */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* ✔️  done / submit button */}
            <button
                onClick={handleSubmit}
                className="bg-green-300 hover:bg-green-400 text-gray-800 rounded-full p-3 shadow-lg transition-colors duration-200
                        focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </button>
            </div>
        </div>
      )}
    </div>
  );
}

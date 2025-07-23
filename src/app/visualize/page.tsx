"use client";

import { useEffect, useState } from "react";
import { LatLng } from "leaflet";
import useLeafletMap from "@/components/csvMap/useLeafletMap";
import StepCard from "@/components/csvMap/StepCard";
import { supabase } from "@/lib/supabase";
import { useSubmission } from "@/app/context/SubmissionContext";

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

  const {
    submissionId, // Get the submission ID from context
    name,
    email,
    area_of_interest,
    mode_of_transport,
    csv_url,
    numRecords,
    missingLatLng,
    missingInternalTemp,
    missingProbeTemp,
    totalMinutes,
  } = useSubmission();

  console.log("Submission context:", {
      submissionId, // Log the submission ID
      name,
      email,
      area_of_interest,
      mode_of_transport,
      csv_url,
      numRecords,
      missingLatLng,
      missingInternalTemp,
      missingProbeTemp,
      totalMinutes,
    });

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

    if (!submissionId) {
      alert('No submission ID found. Please go back and resubmit your data.');
      return;
    }

    const markers = [
      {
        lat: hotCoords.lat,
        lng: hotCoords.lng,
        note: hotNote,
        type: 'hot',
      },
      {
        lat: coolCoords.lat,
        lng: coolCoords.lng,
        note: coolNote,
        type: 'cool',
      },
      ...extraNotes.map((n) => ({
        lat: n.latlng.lat,
        lng: n.latlng.lng,
        note: n.note,
        type: 'extra',
      })),
    ];

    // UPDATE the existing submission instead of creating a new one
    const { error } = await supabase
      .from("csv_submissions")
      .update({
        significance: routeMeaning,
        notes: markers, // JSON array
      })
      .eq("id", submissionId); // Use the existing submission ID

    if (error) {
      console.error("Update error:", error);
      alert("Update failed: " + error.message);
    } else {
      alert("Submitted successfully!");
      setHotNote('');
      setCoolNote('');
      setRouteMeaning('');
      setExtraNotes([]);
      setHotCoords(null);
      setCoolCoords(null);
      window.location.href = '/';
    }
  };

  // Add a check to ensure we have the submission ID
  if (!submissionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">No submission data found.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go back to submit data
          </button>
        </div>
      </div>
    );
  }

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
          <div className="absolute bottom-6 right-6 z-[1000] flex flex-col space-y-3">
            <button
              onClick={() => setAddingExtra(true)}
              className="bg-purple-300 hover:bg-purple-400 text-gray-800 rounded-full p-3 shadow-lg transition-colors duration-200
                      focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

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
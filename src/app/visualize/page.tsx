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

  // New states for marker placement flow
  const [pendingMarker, setPendingMarker] = useState<{ latlng: LatLng; type: 'hot' | 'cool' | 'extra' } | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);

  const [hotCoords, setHotCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coolCoords, setCoolCoords] = useState<{ lat: number; lng: number } | null>(null);

  const {
    submissionId,
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

  useEffect(() => {
    if (map && L) {
      drawTemperaturePath();
    }
  }, [map, L, drawTemperaturePath]);

  useEffect(() => {
    if (!map) return;

    const handleClick = (e: { latlng: LatLng }) => {
      if (step === 1) {
        // Place hot marker first, then ask for note
        setPendingMarker({ latlng: e.latlng, type: 'hot' });
        setShowNoteModal(true);
      } else if (step === 2) {
        // Place cool marker first, then ask for note
        setPendingMarker({ latlng: e.latlng, type: 'cool' });
        setShowNoteModal(true);
      } else if (addingExtra) {
        // Place extra marker first, then ask for note
        setPendingMarker({ latlng: e.latlng, type: 'extra' });
        setShowNoteModal(true);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, step, addingExtra, addMarker]);

  const handleNoteSubmit = (note: string) => {
    if (!pendingMarker || !note.trim()) return;

    const { latlng, type } = pendingMarker;

    if (type === 'hot') {
      addMarker(latlng, note, 'hot');
      setHotNote(note);
      setHotCoords({ lat: latlng.lat, lng: latlng.lng });
      setStep(2);
    } else if (type === 'cool') {
      addMarker(latlng, note, 'cool');
      setCoolNote(note);
      setCoolCoords({ lat: latlng.lat, lng: latlng.lng });
      setStep(3);
    } else if (type === 'extra') {
      addMarker(latlng, note, 'default');
      setExtraNotes(prev => [...prev, { latlng, note }]);
      setAddingExtra(false);
    }

    // Reset modal state
    setPendingMarker(null);
    setShowNoteModal(false);
    setTempNote('');
  };

  const handleModalCancel = () => {
    setPendingMarker(null);
    setShowNoteModal(false);
    setTempNote('');
    if (addingExtra) {
      setAddingExtra(false);
    }
  };

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

    const { error } = await supabase
      .from("csv_submissions")
      .update({
        significance: routeMeaning,
        notes: markers,
      })
      .eq("id", submissionId);

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

  if (!submissionId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-800 mb-6 font-medium">No submission data found.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
          >
            Go back to home
          </button>
        </div>
      </div>
    );
  }

  const getStepInstruction = () => {
    if (step === 1) return "Tap on the map where you felt the HOTTEST";
    if (step === 2) return "Tap on the map where you felt the COOLEST";
    if (addingExtra) return "Tap on the map to add a note";
    return "";
  };

  const getMarkerTypeTitle = () => {
    if (!pendingMarker) return "";
    if (pendingMarker.type === 'hot') return "Hot Spot Note";
    if (pendingMarker.type === 'cool') return "Cool Spot Note";
    if (pendingMarker.type === 'extra') return "Location Note";
    return "";
  };

  const getMarkerTypePlaceholder = () => {
    if (!pendingMarker) return "";
    if (pendingMarker.type === 'hot') return "Why did this location feel hot? (e.g., direct sunlight, concrete, no shade...)";
    if (pendingMarker.type === 'cool') return "Why did this location feel cool? (e.g., shade, trees, water nearby...)";
    if (pendingMarker.type === 'extra') return "What would you like to note about this location?";
    return "";
  };

  return (
    <div className="sensor-app">
      <div ref={mapRef} className="map-background" />

      {/* Step instruction overlay */}
      {(step <= 2 || addingExtra) && (
        <div className="fixed top-4 left-4 right-4 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 text-center">
            <p className="text-gray-900 font-medium">{getStepInstruction()}</p>
            {step <= 2 && (
              <p className="text-sm text-gray-600 mt-1">Step {step} of 2</p>
            )}
          </div>
        </div>
      )}

      {/* Note input modal */}
      {showNoteModal && pendingMarker && (
        <div className="fixed inset-0 z-[1001] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{getMarkerTypeTitle()}</h3>
              <textarea
                placeholder={getMarkerTypePlaceholder()}
                className="w-full p-4 border border-gray-300 rounded-xl resize-none text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={handleModalCancel}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleNoteSubmit(tempNote)}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!tempNote.trim()}
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-optimized Step Card - only for route meaning step */}
      {showCard && step === 3 && (
        <div className="fixed inset-x-0 bottom-0 z-[1000] transform transition-transform duration-300 ease-out">
          <div className="bg-white rounded-t-3xl shadow-2xl">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-6 pt-2">
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
            </div>
          </div>
        </div>
      )}

      {/* Mobile-optimized floating buttons */}
      {!showCard && (
        <div className="interaction-overlay">
          {addingExtra && !showNoteModal && (
            <div className="fixed inset-x-0 bottom-0 z-[1000] bg-white rounded-t-3xl shadow-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Add a Note</h3>
              <p className="text-gray-600 mb-4">Tap anywhere on the map to place your marker, then you'll be able to add your note.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setAddingExtra(false)}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Floating Action Buttons */}
          <div className="fixed bottom-6 right-6 z-[1000] flex flex-col space-y-3">
            <button
              onClick={() => setAddingExtra(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-110"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-110"
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
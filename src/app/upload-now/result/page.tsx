"use client";

import { useEffect, useState } from "react";
import { useSubmission } from "../../context/SubmissionContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResultPage() {
  const {
    image,
    comfort_level,
    image_importance,
    setLocationCoords,
    lat: ctxLat,
    long: ctxLong,
    setCreatedAt,
    created_at,
  } = useSubmission();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Grab the user's current location once the component mounts
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(current);
        setLocationCoords(current.lat, current.lng);
        if (!created_at) {
          setCreatedAt(new Date().toISOString());
        }
      },
      (err) => {
        console.warn("Location error:", err);
        setError("Unable to retrieve your location. Please check your location settings.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gradientMap: Record<string, [string, string]> = {
    Freezing: ["#8CB9F1", "#CFE8FF"],
    Chilly: ["#0074B7", "#88D6F0"],
    Comfortable: ["#21A348", "#9FEFAF"],
    Warm: ["#FFD500", "#FFF3B0"],
    Hot: ["#E27100", "#FFB74D"],
    Sweltering: ["#6C1D45", "#FF4B4B"],
  };

  /** Convert the uploaded image to a File suitable for upload (without filter) */
  const prepareImageForUpload = async (): Promise<File> =>
    new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;

          // Just draw the base photo without any overlay
          ctx.drawImage(img, 0, 0);

          // Compress with decreasing quality until under 4.5MB
          const maxSizeBytes = 4.5 * 1024 * 1024;
          let quality = 0.9;
          const minQuality = 0.1;
          const qualityStep = 0.1;

          const tryCompression = () => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  console.log(`Compression attempt - Quality: ${quality}, Size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                  
                  if (blob.size > maxSizeBytes && quality > minQuality) {
                    quality -= qualityStep;
                    tryCompression();
                  } else {
                    // Create filename with date and time using dashes
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const seconds = String(now.getSeconds()).padStart(2, '0');
                    
                    const filename = `submission-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.jpg`;
                    
                    resolve(
                      new File([blob], filename, {
                        type: "image/jpeg",
                      }),
                    );
                  }
                } else {
                  reject(new Error("Failed to create image blob"));
                }
              },
              "image/jpeg",
              quality,
            );
          };

          tryCompression();
        } catch (error) {
          reject(new Error("Failed to process image: " + error));
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = image!;
    });

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!image || !comfort_level || !coords) {
      setError("Missing required information. Please ensure image, comfort level, and location are available.");
      return;
    }

    setLoading(true);

    try {
      // 1 – prepare unfiltered image for upload
      const imageFile = await prepareImageForUpload();

      // 2 – upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("submitted-images")
        .upload(imageFile.name, imageFile);
      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // 3 – insert row in DB
      const timestamp = created_at ?? new Date().toISOString();
      const { error: insertError } = await supabase.from("image_submissions").insert([
        {
          image_url: uploadData.path,
          comfort_level,
          comment: image_importance,
          lat: coords.lat,
          long: coords.lng,
          created_at: timestamp,
        },
      ]);
      if (insertError) {
        throw new Error(`Failed to save submission: ${insertError.message}`);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  // Get lighter background color based on comfort level
  const getBackgroundStyle = () => {
    if (!comfort_level) return {};
    const [, endColor] = gradientMap[comfort_level] || ["#000", "#fff"];
    return {
      backgroundColor: `${endColor}20`, // 20 = 12% opacity for subtle background
      backdropFilter: "blur(10px)",
    };
  };

  // For upload-now, show current time if no created_at is set
  const displayTime = created_at ? formatDateTime(created_at) : formatDateTime(new Date().toISOString());

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-[family-name:var(--font-geist-sans)]">
      {/* Base photo - no gradient overlay */}
      {image && (
        <img
          src={image}
          alt="Final"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Feedback Messages */}
      {(error || success) && (
        <div className="absolute top-4 left-0 right-0 flex justify-center px-4 z-50">
          <div
            className={`${
              error ? "bg-red-600" : "bg-green-600"
            } text-white rounded-lg px-6 py-3 shadow-lg max-w-md w-full text-center`}
          >
            {error ? (
              <>
                <p className="font-semibold">Submission Failed. Please try again.</p>
                <p className="text-sm mt-1">{error}</p>
              </>
            ) : (
              <>
                <p className="font-semibold">Success!</p>
                <p className="text-sm mt-1">Your submission has been saved. Redirecting...</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main content card with all elements - smaller for mobile */}
      <div className="absolute inset-0 flex items-center justify-center px-3 py-8">
        <div 
          className="text-white rounded-lg p-4 w-full max-w-sm shadow-xl border border-white/20"
          style={getBackgroundStyle()}
        >
          
          {/* Timestamp Section */}
          <div className="text-center pb-3 border-b border-white/20 mb-3">
            <p className="text-xs text-gray-200 font-semibold">
              {displayTime}
            </p>
          </div>

          {/* Comfort Level Section */}
          {comfort_level && (
            <div className="text-center pb-3 border-b border-white/20 mb-3">
              <div className="flex items-center justify-center gap-2">
                <div
                  className="w-5 h-5 rounded border-2 border-white shadow-md"
                  style={{
                    background: `linear-gradient(to bottom, ${gradientMap[comfort_level]?.[0]}, ${gradientMap[comfort_level]?.[1]})`,
                  }}
                />
                <span className="text-xs font-medium">
                  {comfort_level}
                </span>
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="pb-3 border-b border-white/20 mb-3">
            <h3 className="text-center text-sm font-semibold mb-2 font-[family-name:var(--font-geist-mono)]">About This Photo</h3>
            <p className="text-center text-xs leading-relaxed text-gray-100">{image_importance}</p>
          </div>

          {/* Location Section */}
          {coords && (
            <div className="text-center pb-3 border-b border-white/20 mb-3">
              <h3 className="text-sm font-semibold mb-1 font-[family-name:var(--font-geist-mono)]">Location</h3>
              <p className="text-xs text-gray-200 font-mono">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </p>
            </div>
          )}

          {/* Submit Section */}
          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={loading || success}
              className={`w-full rounded-lg px-6 py-2.5 text-sm font-semibold shadow-lg transition-all duration-200 font-[family-name:var(--font-geist-mono)] ${
                loading || success
                  ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                  : "bg-white text-black hover:bg-gray-100 transform hover:scale-105"
              }`}
            >
              {loading ? "Submitting…" : success ? "Submitted!" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

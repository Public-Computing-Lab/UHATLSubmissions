"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmission } from "../../context/SubmissionContext";
import { supabase } from "@/lib/supabase";

export default function ResultPage() {
  const {
    image,
    comfort_level,
    image_importance,
    lat,
    long,
    created_at,
    tags,
  } = useSubmission();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const gradientMap: Record<string, [string, string]> = {
    Freezing: ["#8CB9F1", "#CFE8FF"],
    Chilly: ["#0074B7", "#88D6F0"],
    Comfortable: ["#21A348", "#9FEFAF"],
    Warm: ["#FFD500", "#FFF3B0"],
    Hot: ["#E27100", "#FFB74D"],
    Sweltering: ["#6C1D45", "#FF4B4B"],
  };

  // Function to determine time of day based on hour
  const getTimeOfDay = (dateString: string): string => {
    const date = new Date(dateString);
    const hour = date.getHours();
    
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 14) return 'noon';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 19) return 'evening';
    if (hour >= 19 && hour < 22) return 'dusk';
    return 'night';
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

    if (!image || !comfort_level || lat === null || long === null) {
      setError("Missing required information. Please ensure you've completed all steps.");
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

      // 3 – prepare tags with comfort level and time of day
      const timestamp = created_at ?? new Date().toISOString();
      const timeOfDay = getTimeOfDay(timestamp);
      
      // Combine user tags with automatic tags
      const allTags = [
        ...tags, // User selected tags
        comfort_level.toLowerCase(), // Add comfort level as tag
        timeOfDay // Add time of day as tag
      ];

      // 4 – insert row in DB with tags
      const { error: insertError } = await supabase.from("image_submissions").insert([
        {
          image_url: uploadData.path,
          comfort_level,
          comment: image_importance,
          lat,
          long,
          created_at: timestamp,
          tags: allTags,
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

      {/* Main content card - aggressive gradient coloring */}
      <div className="absolute inset-0 flex items-center justify-center px-3 py-8">
        <div 
          className="text-white rounded-lg p-4 w-full max-w-sm shadow-xl border-2 border-white/40"
          style={{
            background: comfort_level && gradientMap[comfort_level]
              ? `linear-gradient(135deg, ${gradientMap[comfort_level][0]}CC, ${gradientMap[comfort_level][1]}E6)`
              : "rgba(0,0,0,0.6)",
            backdropFilter: "blur(15px)",
            boxShadow: `0 8px 32px ${comfort_level && gradientMap[comfort_level] ? gradientMap[comfort_level][0] : "#000"}40`,
          }}
        >
          
          {/* Timestamp Section */}
          {created_at && (
            <div className="text-center pb-3 border-b border-white/40 mb-3">
              <p className="text-xs font-bold text-white drop-shadow-lg">
                {formatDateTime(created_at)}
              </p>
            </div>
          )}

          {/* Comfort Level Section */}
          {comfort_level && (
            <div className="text-center pb-3 border-b border-white/40 mb-3">
              <div className="flex items-center justify-center gap-3">
                <div
                  className="w-6 h-6 rounded-full border-3 border-white shadow-lg"
                  style={{
                    background: `linear-gradient(to bottom, ${gradientMap[comfort_level]?.[0]}, ${gradientMap[comfort_level]?.[1]})`,
                    boxShadow: `0 4px 12px ${gradientMap[comfort_level]?.[0]}60`,
                  }}
                />
                <span className="text-sm font-bold text-white drop-shadow-lg">
                  {comfort_level}
                </span>
              </div>
            </div>
          )}

          {/* Tags Section
          {tags.length > 0 && (
            <div className="pb-3 border-b border-white/40 mb-3">
              <h3 className="text-center text-sm font-bold mb-2 text-white drop-shadow-lg font-[family-name:var(--font-geist-mono)]">Tags</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white/20 text-white text-xs rounded-full backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
                <span className="px-2 py-1 bg-white/30 text-white text-xs rounded-full backdrop-blur-sm">
                  {comfort_level?.toLowerCase()}
                </span>
                {created_at && (
                  <span className="px-2 py-1 bg-white/30 text-white text-xs rounded-full backdrop-blur-sm">
                    {getTimeOfDay(created_at)}
                  </span>
                )}
              </div>
            </div>
          )} */}

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
                {image_importance || "No description provided"}
              </p>
            </div>
          </div>

          {/* Location Section */}
          {lat !== null && long !== null && (
            <div className="text-center pb-3 border-b border-white/40 mb-3">
              <h3 className="text-sm font-bold mb-2 text-white drop-shadow-lg font-[family-name:var(--font-geist-mono)]">Location</h3>
              <div 
                className="text-xs p-2 rounded-lg font-mono"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <p className="text-white font-semibold drop-shadow-sm">
                  {lat.toFixed(4)}, {long.toFixed(4)}
                </p>
              </div>
            </div>
          )}

          {/* Submit Section */}
          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={loading || success}
              className={`w-full rounded-lg px-6 py-3 text-sm font-bold shadow-lg transition-all duration-200 font-[family-name:var(--font-geist-mono)] ${
                loading || success
                  ? "bg-gray-500/80 text-gray-300 cursor-not-allowed backdrop-blur-sm"
                  : "bg-white/95 text-black hover:bg-white hover:scale-105 backdrop-blur-sm"
              }`}
              style={{
                boxShadow: `0 4px 16px ${comfort_level && gradientMap[comfort_level] ? gradientMap[comfort_level][0] : "#000"}40`,
              }}
            >
              {loading ? "Submitting…" : success ? "Submitted!" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

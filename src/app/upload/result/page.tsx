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

  /** Draw the uploaded photo with its comfort-level gradient overlay
   *  and return it as a File suitable for upload. */
  const drawFilteredImage = async (): Promise<File> =>
    new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      // Handle CORS for external images
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;

          // Base photo
          ctx.drawImage(img, 0, 0);

          // Gradient overlay
          const [start, end] =
            gradientMap[comfort_level as keyof typeof gradientMap] ?? ["#000", "#fff"];
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, `${start}99`);
          gradient.addColorStop(1, `${end}99`);
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Compress with decreasing quality until under 5MB
          const maxSizeBytes = 5 * 1024 * 1024; // 10MB
          let quality = 0.9;
          const minQuality = 0.1;
          const qualityStep = 0.1;

          const tryCompression = () => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  console.log(`Compression attempt - Quality: ${quality}, Size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                  
                  if (blob.size > maxSizeBytes && quality > minQuality) {
                    // File is still too large, reduce quality
                    quality -= qualityStep;
                    tryCompression();
                  } else {
                    // File is small enough or we've reached minimum quality
                    resolve(
                      new File([blob], `filtered-${Date.now()}.jpg`, {
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
    // Reset previous states
    setError(null);
    setSuccess(false);

    if (!image || !comfort_level || lat === null || long === null) {
      setError("Missing required information. Please ensure you've completed all steps.");
      return;
    }

    setLoading(true);

    try {
      // 1 – create filtered overlay image
      const filteredFile = await drawFilteredImage();

      // 2 – upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("submitted-images")
        .upload(filteredFile.name, filteredFile);
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
          lat,
          long,
          created_at: timestamp,
        },
      ]);
      if (insertError) {
        throw new Error(`Failed to save submission: ${insertError.message}`);
      }

      setSuccess(true);
      // Redirect after a short delay to show success message
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

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-[family-name:var(--font-geist-sans)]">
      {/* Base photo */}
      {image && (
        <img
          src={image}
          alt="Final"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Comfort-level gradient */}
      {comfort_level && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, ${
              gradientMap[comfort_level]?.[0]
            }, ${gradientMap[comfort_level]?.[1]})`,
            opacity: 0.8,
            mixBlendMode: "overlay",
          }}
        />
      )}

      {/* Details card */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="bg-stone-800/90 text-white rounded-lg p-6 w-full max-w-md space-y-4 shadow-lg font-[family-name:var(--font-geist-mono)]">
          <div>
            <strong>Why is this place important to you?</strong>
            <p className="mt-1">{image_importance}</p>
          </div>
        </div>
      </div>

      {/* Coordinates display */}
      {lat !== null && long !== null && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center px-4">
          <div className="bg-white/80 text-black rounded-md px-4 py-2 text-xs font-mono shadow font-[family-name:var(--font-geist-mono)]">
            Location: {lat.toFixed(5)}, {long.toFixed(5)}
          </div>
        </div>
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
                <p className="font-semibold">Submission Failed</p>
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

      {/* Submit button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4">
        <button
          onClick={handleSubmit}
          disabled={loading || success}
          className={`w-full max-w-md rounded-md px-6 py-2 font-semibold shadow transition font-[family-name:var(--font-geist-mono)] ${
            loading || success
              ? "bg-gray-500 text-gray-300 cursor-not-allowed"
              : "bg-white text-black hover:bg-stone-600"
          }`}
        >
          {loading ? "Submitting…" : success ? "Submitted!" : "Submit"}
        </button>
      </div>
    </div>
  );
}

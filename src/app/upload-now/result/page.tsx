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
  } = useSubmission();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Grab the user's current location once the component mounts
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(current);
        setLocationCoords(current.lat, current.lng);
        setCreatedAt(new Date().toISOString());
      },
      (err) => {
        console.warn("Location error:", err);
        alert("Unable to retrieve your location.");
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

  /** Draw the uploaded photo with its comfort-level gradient overlay,
   *  then return it as a File for upload. */
  const drawFilteredImage = async (): Promise<File> =>
    new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.onload = () => {
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

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], `filtered-${Date.now()}.jpg`, { type: "image/jpeg" })
              );
            }
          },
          "image/jpeg",
          0.8
        );
      };

      img.src = image!;
    });

  const handleSubmit = async () => {
    if (!image || !comfort_level || !coords) {
      alert("Missing image, comfort level, or location");
      return;
    }

    setLoading(true);

    try {
      const filteredFile = await drawFilteredImage();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("submitted-images")
        .upload(filteredFile.name, filteredFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("image_submissions").insert([
        {
          image_url: uploadData.path,
          comfort_level,
          image_importance,
          lat: coords.lat,
          long: coords.lng,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      router.push("/");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Something went wrong during upload.");
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
      {coords && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center px-4">
          <div className="bg-white/80 text-black rounded-md px-4 py-2 text-xs font-mono shadow font-[family-name:var(--font-geist-mono)]">
            Location: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </div>
        </div>
      )}

      {/* Submit button */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full max-w-md bg-white text-black rounded-md px-6 py-2 font-semibold shadow hover:bg-stone-600 transition font-[family-name:var(--font-geist-mono)]"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

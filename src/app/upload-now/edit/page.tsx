"use client";

import { useRouter } from "next/navigation";
import { useSubmission } from "../../context/SubmissionContext";

export default function EditPage() {
  const router = useRouter();
  const {
    image,
    comfort_level,
    image_importance,
    setImageImportance,
  } = useSubmission();

  const handleSubmit = () => {
    router.push("/upload-now/result");
  };

  const gradientMap: Record<string, string> = {
    Freezing: "linear-gradient(to bottom, #8CB9F1, #CFE8FF)",
    Chilly: "linear-gradient(to bottom, #0074B7, #88D6F0)",
    Comfortable: "linear-gradient(to bottom, #21A348, #9FEFAF)",
    Warm: "linear-gradient(to bottom, #FFD500, #FFF3B0)",
    Hot: "linear-gradient(to bottom, #E27100, #FFB74D)",
    Sweltering: "linear-gradient(to bottom, #6C1D45, #FF4B4B)",
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-[family-name:var(--font-geist-sans)]">
      {/* Background image */}
      {image && (
        <img
          src={image}
          alt="Uploaded"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Centered Form Box - mobile optimized */}
      <div className="absolute inset-0 flex items-center justify-center px-3 py-8">
        <div className="pointer-events-auto bg-stone-800/90 text-white rounded-lg p-4 w-full max-w-sm backdrop-blur-lg space-y-3 shadow-xl border border-white/20">
          
          {/* Comfort Level Indicator */}
          {comfort_level && (
            <div className="flex items-center gap-2 pb-3 border-b border-white/20 mb-3">
              <div
                className="w-5 h-5 rounded border-2 border-white shadow-md"
                style={{
                  background: gradientMap[comfort_level] || "transparent",
                }}
              />
              <span className="text-xs font-medium font-[family-name:var(--font-geist-mono)]">
                {comfort_level}
              </span>
            </div>
          )}

          <label className="flex flex-col text-xs font-medium font-[family-name:var(--font-geist-mono)]">
            Tell us about this photo?
            <textarea
              value={image_importance ?? ""}
              onChange={(e) => setImageImportance(e.target.value)}
              placeholder="Why is this place important to you? How is your body responding to the temperature? How has temperature impacted your plans for the day? What do you notice?"
              className="mt-2 p-2 rounded-md bg-white text-black border border-gray-300 resize-none text-xs"
              rows={6}
            />
          </label>

          <button
            onClick={handleSubmit}
            className="w-full mt-3 bg-white text-black rounded-lg px-6 py-2.5 text-sm font-semibold shadow-lg hover:bg-gray-100 transition-all duration-200 font-[family-name:var(--font-geist-mono)] transform hover:scale-105"
          >
            Review
          </button>
        </div>
      </div>
    </div>
  );
}

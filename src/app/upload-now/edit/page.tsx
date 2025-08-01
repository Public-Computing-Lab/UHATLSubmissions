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

      {/* Centered Form Box */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="pointer-events-auto bg-stone text-white rounded-lg p-6 w-full max-w-md backdrop-blur-lg space-y-4 shadow-lg">

          {/* Comfort Level Indicator */}
          {/* {comfort_level && (
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-8 h-8 rounded border-2 border-white shadow-md"
                style={{
                  background: gradientMap[comfort_level] || "transparent",
                }}
              />
              <span className="text-sm font-medium font-[family-name:var(--font-geist-mono)]">
                {comfort_level}
              </span>
            </div>
          )} */}
          
          <label className="flex flex-col text-sm font-medium font-[family-name:var(--font-geist-mono)]">
            Tell us about this photo?
            <textarea
              value={image_importance ?? ""}
              onChange={(e) => setImageImportance(e.target.value)}
              placeholder="Why is this place important to you? How is your body responding to the temperature? How has temperature impacted your plans for the day? What do you notice?"
              className="mt-1 p-2 rounded-md bg-white text-black border border-gray-300 resize-none"
              rows={8}
            />
          </label>

          <button
            onClick={handleSubmit}
            className="w-full mt-2 bg-white text-black rounded-md px-6 py-2 font-semibold shadow hover:bg-stone-600 transition font-[family-name:var(--font-geist-mono)]"
          >
            Review
          </button>
        </div>
      </div>
    </div>
  );
}

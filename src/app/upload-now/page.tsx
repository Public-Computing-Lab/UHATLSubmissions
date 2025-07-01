"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmission } from "../context/SubmissionContext";

export default function Page() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [comfortLevel, setComfortLevel] = useState<string | null>(null);
  const router = useRouter();

  const { setImage, setComfortLevel: setContextComfortLevel } = useSubmission();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImage(result); // Store in context
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImage(null);
  };

  const handleNextClick = () => {
    if (imagePreview && comfortLevel) {
      router.push("/upload-now/edit");
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center justify-center sm:items-start">
        <div>
          <h1 className="text-lg text-center sm:text-left font-[family-name:var(--font-geist-mono)]">Upload an image:</h1>
        </div>

        {imagePreview ? (
          <div className="relative w-full aspect-square">
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

        <form className="font-[family-name:var(--font-geist-mono)] w-full flex flex-col gap-4 mt-6">
          <p>What was your temperature comfort level when the image was taken?:</p>

          <div className="flex flex-col gap-3">
            {["Freezing", "Chilly", "Comfortable", "Warm", "Hot", "Sweltering"].map((level) => (
              <label key={level} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="filter"
                  value={level}
                  checked={comfortLevel === level}
                  onChange={(e) => {
                    setComfortLevel(e.target.value);
                    setContextComfortLevel(e.target.value); // Store in context
                  }}
                  className="accent-amber-500"
                />
                <span className="text-sm">{level}</span>
              </label>
            ))}
          </div>
        </form>

        <button
          type="button"
          onClick={handleNextClick}
          disabled={!imagePreview || !comfortLevel}
          className={`font-[family-name:var(--font-geist-mono)] px-6 py-3 rounded-md shadow transition
            ${
              imagePreview && comfortLevel
                ? "bg-stone-100 text-amber-900 hover:bg-stone-300 focus:ring-2 focus:ring-stone-500"
                : "bg-stone-100 text-stone-400 cursor-not-allowed"
            }`}
        >
          Next
        </button>
      </main>
    </div>
  );
}
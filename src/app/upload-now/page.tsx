"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmission } from "../context/SubmissionContext";

export default function Page() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [comfortLevel, setComfortLevel] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const router = useRouter();

  const { setImage, setComfortLevel: setContextComfortLevel, setTags } = useSubmission();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, WebP, SVG, or BMP)');
        return;
      }
      
      // Check file size (e.g., 10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('Image size must be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImage(result);
      };
      reader.onerror = () => {
        alert('Failed to read image file. Please try another image.');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImage(null);
  };

  const handleTagToggle = (tag: string) => {
    const updatedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(updatedTags);
    setTags(updatedTags);
  };

  const handleNextClick = () => {
    if (imagePreview && comfortLevel) {
      router.push("/upload-now/edit");
    }
  };

  const handleCameraClick = () => {
    document.getElementById("camera-input")?.click();
  };

  const comfortLevels = [
    { value: "Freezing", color: "from-blue-400 to-blue-600", emoji: "🥶" },
    { value: "Chilly", color: "from-cyan-400 to-cyan-600", emoji: "😬" },
    { value: "Comfortable", color: "from-green-400 to-green-600", emoji: "😊" },
    { value: "Warm", color: "from-yellow-400 to-yellow-600", emoji: "😅" },
    { value: "Hot", color: "from-orange-400 to-orange-600", emoji: "🥵" },
    { value: "Sweltering", color: "from-red-400 to-red-600", emoji: "🔥" }
  ];

  const availableTags = [
    { value: "cooling off", color: "from-blue-100 to-blue-200" },
    { value: "public space", color: "from-green-100 to-green-200" },
    { value: "commute", color: "from-purple-100 to-purple-200" },
    { value: "working outside", color: "from-orange-100 to-orange-200" },
    { value: "health impacts", color: "from-red-100 to-red-200" },
    { value: "shade", color: "from-teal-100 to-teal-200" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 px-4 py-6 font-sans">
      {/* Header */}
      <div className="max-w-md mx-auto mb-6">
        <button 
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Capture the Temperature
        </h1>
        <p className="text-gray-600 text-sm">
          Take a photo and tell us how the temperature feels right now
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Camera/Image Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Take a Photo</h2>
          
          {imagePreview ? (
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-3 right-3 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Camera Button */}
              <button
                onClick={handleCameraClick}
                className="w-full aspect-[4/3] flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl hover:from-purple-200 hover:to-pink-200 transition-all duration-200 group"
              >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="mt-4 text-gray-700 font-medium">Open Camera</p>
              </button>

              {/* File Input */}
              <label className="block w-full">
                <input
                  id="camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          )}
        </div>

        {/* Temperature Comfort Level */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Step 2: How does it feel?
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            {comfortLevels.map((level) => (
              <label
                key={level.value}
                className={`relative cursor-pointer transform transition-all duration-200 ${
                  comfortLevel === level.value ? 'scale-105' : 'hover:scale-102'
                }`}
              >
                <input
                  type="radio"
                  name="comfort"
                  value={level.value}
                  checked={comfortLevel === level.value}
                  onChange={(e) => {
                    setComfortLevel(e.target.value);
                    setContextComfortLevel(e.target.value);
                  }}
                  className="sr-only"
                />
                <div className={`p-4 rounded-xl border-2 transition-all ${
                  comfortLevel === level.value
                    ? `border-transparent bg-gradient-to-br ${level.color} text-white shadow-lg`
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}>
                  <div className="text-center">
                    <span className="text-2xl">{level.emoji}</span>
                    <p className={`mt-1 text-sm font-medium ${
                      comfortLevel === level.value ? 'text-white' : 'text-gray-700'
                    }`}>
                      {level.value}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Step 3: Tags!
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            {availableTags.map((tag) => (
              <button
                key={tag.value}
                onClick={() => handleTagToggle(tag.value)}
                className={`p-3 rounded-xl border-2 transition-all duration-200 transform ${
                  selectedTags.includes(tag.value)
                    ? `border-purple-500 bg-gradient-to-br ${tag.color} shadow-md scale-105`
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:scale-102'
                }`}
              >
                <div className="text-center">
                  <p className={`mt-1 text-xs font-medium ${
                    selectedTags.includes(tag.value) ? 'text-gray-800' : 'text-gray-600'
                  }`}>
                    {tag.value}
                  </p>
                </div>
              </button>
            ))}
          </div>
          
          {selectedTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => handleTagToggle(tag)}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNextClick}
          disabled={!imagePreview || !comfortLevel}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
            imagePreview && comfortLevel
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Next Step
        </button>
      </div>
    </div>
  );
}
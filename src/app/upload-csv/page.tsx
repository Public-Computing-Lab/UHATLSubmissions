"use client";

import { useState } from "react";

export default function Page() {
  /* ---------------- local state --------------------------------- */
  const [transport, setTransport] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  /* ---------------- file helpers -------------------------------- */
  const handleFileSelect = (file: File) => {
    if (file?.type === "text/csv") {
      setSelectedFile(file);
    } else {
      alert("Please select a valid CSV file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = () => {
    if (!selectedFile) return alert("Please select a CSV file first");
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      sessionStorage.setItem("csvData", csvText);
      sessionStorage.setItem("fileName", selectedFile.name);
      window.location.href = "/visualize";
    };
    reader.readAsText(selectedFile);
  };

  /* ---------------- UI ------------------------------------------ */
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-sans">
      <main className="flex flex-col gap-[32px] row-start-2 items-center justify-center sm:items-start w-full max-w-md">
        {/* heading */}
        <h1 className="text-lg text-center sm:text-left font-mono">
          Submit Your Measurements
        </h1>

        {/* form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="w-full flex flex-col gap-6 text-stone-900"
        >
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm">
              Name:
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your Name"
              className="w-full rounded border border-stone-300 bg-white px-3 py-2 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm">
              Email:
            </label>
            <input
              id="email"
              type="email"
              placeholder="Your Email"
              className="w-full rounded border border-stone-300 bg-white px-3 py-2 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>

          {/* Location prompt */}
          <div className="space-y-1">
            <label htmlFor="location" className="block text-sm leading-snug">
              What neighborhood, area or point of interest did you collect this
              data in?
            </label>
            <input
              id="location"
              type="text"
              placeholder="Your Answer"
              className="w-full rounded border border-stone-300 bg-white px-3 py-2 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>

          {/* Transport */}
          <fieldset className="space-y-3 font-mono">
            <legend className="text-sm leading-snug">
              What mode of transport did you use?
            </legend>

            {["Walking", "Cycling", "Other"].map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-3 cursor-pointer text-sm"
              >
                <input
                  type="radio"
                  name="transport"
                  value={opt}
                  checked={transport === opt}
                  onChange={(e) => setTransport(e.target.value)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 border-stone-400 ${
                    transport === opt ? "bg-amber-500" : "bg-transparent"
                  }`}
                />
                {opt}
              </label>
            ))}
          </fieldset>

          {/* File upload area */}
          <div className="space-y-1">
            <p className="text-sm leading-snug font-mono">
              Upload your temperature measurements
            </p>

            <div
              className={`flex flex-col items-center justify-center gap-2 w-full py-6 rounded border-2 bg-stone-50 text-sm font-mono cursor-pointer transition
                ${isDragOver ? "border-amber-500 bg-amber-50" : "border-dashed border-stone-300"}
                ${selectedFile ? "border-solid" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              {selectedFile ? (
                <span className="truncate max-w-full">{selectedFile.name}</span>
              ) : (
                <>
                  <span className="text-stone-500">Tap or Drop CSV Here</span>
                  <span className="text-2xl">⬇</span>
                </>
              )}
              <input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full px-6 py-3 rounded-md shadow bg-stone-100 text-amber-900 hover:bg-stone-300 focus:ring-2 focus:ring-stone-500 font-mono transition disabled:opacity-50"
            disabled={!selectedFile}
          >
            Submit Data
          </button>
        </form>
      </main>
    </div>
  );
}

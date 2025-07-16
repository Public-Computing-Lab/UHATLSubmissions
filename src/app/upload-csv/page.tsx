"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSubmission } from "@/app/context/SubmissionContext";
import { parseCsv, analyzeCsvRows } from "@/components/csvMap/parseCsv";

export default function Page() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [transport, setTransport] = useState<string | null>(null);
  const [customTransport, setCustomTransport] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    setSubmissionId, // Add this to context
    setName: setNameContext,
    setEmail: setEmailContext,
    setAreaOfInterest,
    setModeOfTransport,
    setCreatedAt,
    setCsvUrl,
    setNumRecords,
    setMissingLatLng,
    setMissingInternalTemp,
    setMissingProbeTemp,
    setTotalMinutes,
  } = useSubmission();

  const isFormValid =
    name.trim() &&
    email.trim() &&
    transport &&
    (transport !== "Other" || customTransport.trim()) &&
    selectedFile;

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

  const handleSubmit = async () => {
    if (!selectedFile) return alert("Please select a CSV file first");

    setLoading(true);

    try {
      const timestamp = new Date().toISOString();
      const finalTransport = transport === "Other" ? customTransport : transport;
      const filePath = `csv-${timestamp}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("submitted-csvs")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create row in `csv_submissions` table
      const { data: submissionData, error: submissionError } = await supabase
        .from("csv_submissions")
        .insert({
          name,
          email,
          area_of_interest: location,
          mode_of_transport: finalTransport,
          created_at: timestamp,
          csv_url: uploadData.path,
        })
        .select("id")
        .single();

      if (submissionError) throw submissionError;

      const submissionId = submissionData.id;

      // Read CSV file text
      const csvText = await selectedFile.text();
      sessionStorage.setItem('csvData', csvText);
      
      // Invoke edge function to process CSV data
      const { data: processResult, error: processError } = await supabase.functions
        .invoke("parse-csv", {
          body: {
            submissionId,
            csvContent: csvText,
            fileName: selectedFile.name,
            transit: finalTransport,
          },
        });

      if (processError) throw processError;

      if (!processResult.success) {
        throw new Error(processResult.message || "CSV processing failed");
      }

      // Update the existing submission row with CSV metadata
      const { error: updateError } = await supabase
        .from("csv_submissions")
        .update({
          num_records: processResult.numRecords,
          missing_lat_lng: processResult.missingLatLng,
          missing_internal_temp: processResult.missingInternalTemp,
          missing_probe_temp: processResult.missingProbeTemp,
          total_minutes: processResult.totalMinutes,
        })
        .eq("id", submissionId);

      if (updateError) throw updateError;

      // Save to context for the next page
      setSubmissionId(submissionId); // Store the submission ID
      setNameContext(name);
      setEmailContext(email);
      setAreaOfInterest(location);
      setModeOfTransport(finalTransport);
      setCreatedAt(timestamp);
      setCsvUrl(uploadData.path);

      const parsedRows = parseCsv(csvText);
      const analysis = analyzeCsvRows(parsedRows);

      setNumRecords(analysis.numRecords);
      setMissingLatLng(analysis.missingLatLng);
      setMissingInternalTemp(analysis.missingInternalTemp);
      setMissingProbeTemp(analysis.missingProbeTemp);
      setTotalMinutes(analysis.totalMinutes);

      router.push("/visualize");
    } catch (err) {
      console.error("Submission error:", err);
      alert("Something went wrong during upload or processing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-sans">
      <main className="flex flex-col gap-[32px] row-start-2 items-center justify-center sm:items-start w-full max-w-md">
        <h1 className="text-lg text-center sm:text-left font-mono">
          Submit Your Measurements
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="w-full flex flex-col gap-6 text-stone-900"
        >
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm">Name:</label>
            <input
              id="name"
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-stone-300 bg-white px-3 py-2 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm">Email:</label>
            <input
              id="email"
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-stone-300 bg-white px-3 py-2 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="location" className="block text-sm leading-snug">
              What neighborhood, area or point of interest did you collect this data in?
            </label>
            <input
              id="location"
              type="text"
              placeholder="Your Answer"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded border border-stone-300 bg-white px-3 py-2 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>

          <fieldset className="space-y-3 font-mono">
            <legend className="text-sm leading-snug">What mode of transport did you use?</legend>
            {["Walking", "Cycling", "Other"].map((opt) => (
              <div key={opt}>
                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="transport"
                    value={opt}
                    checked={transport === opt}
                    onChange={(e) => setTransport(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 border-stone-400 ${
                    transport === opt ? "bg-amber-500" : "bg-transparent"
                  }`} />
                  {opt}
                </label>

                {opt === "Other" && transport === "Other" && (
                  <input
                    type="text"
                    placeholder="Please specify"
                    value={customTransport}
                    onChange={(e) => setCustomTransport(e.target.value)}
                    className="ml-7 mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                )}
              </div>
            ))}
          </fieldset>

          <div className="space-y-1">
            <p className="text-sm leading-snug font-mono">Upload your temperature measurements</p>
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

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="w-full px-6 py-3 rounded-md shadow bg-stone-100 text-amber-900 hover:bg-stone-300 focus:ring-2 focus:ring-stone-500 font-mono transition disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Submit Data"}
          </button>
        </form>
      </main>
    </div>
  );
}
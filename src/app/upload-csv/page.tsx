"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSubmission } from "@/app/context/SubmissionContext";
// Remove client-side CSV parsing - using server-side edge function instead

// Add interface for validation result
interface ValidationResult {
  success: boolean;
  message: string;
  numRecords: number;
  hasLatLng: string;
  hasInternalTemp: string;
  hasProbeTemp: string;
  complete: string;
  totalMinutes: number;
  startTime?: string;
  endTime?: string;
  errors?: string[];
}

export default function Page() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [transport, setTransport] = useState<string | null>(null);
  const [customTransport, setCustomTransport] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  // Add new state for error modal
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const router = useRouter();

  const {
    setSubmissionId,
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

  // Add function to parse CSV for preview
  const parseCsvForPreview = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { headers: [], data: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1, 11).map(line => { // First 10 data rows
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    
    return { headers, data: dataRows };
  };

  const handleFileSelect = (file: File) => {
    setError("");
    // More robust CSV file detection for Android compatibility
    const isCSV = file?.type === "text/csv" || 
                  file?.type === "application/vnd.ms-excel" || 
                  file?.type === "text/plain" ||
                  file?.name.toLowerCase().endsWith('.csv');
    
    if (isCSV) {
      setSelectedFile(file);
    } else {
      setError("Please select a valid CSV file");
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
    if (!selectedFile) {
      setError("Please select a CSV file first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const timestamp = new Date().toISOString();
      const finalTransport = transport === "Other" ? customTransport : transport;
      
      // Read CSV file text for validation
      const csvText = await selectedFile.text();
      
      // First, validate the CSV with the edge function
      const { data: validationResult, error: validationError } = await supabase.functions
        .invoke("parse-csv", {
          body: {
            submissionId: null, // No submission ID for validation
            csvContent: csvText,
            fileName: selectedFile.name,
            transit: finalTransport,
            validateOnly: true, // This tells the edge function to only validate
          },
        });

      if (validationError) throw validationError;

      // Check if validation failed or data is incomplete
      if (!validationResult.success || validationResult.complete === 'FALSE' || validationResult.numRecords === 0) {
        // Parse CSV for preview
        const { headers, data } = parseCsvForPreview(csvText);
        setCsvHeaders(headers);
        setCsvPreviewData(data);
        setValidationResult(validationResult);
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      // If validation passes, proceed with actual submission
      // Create filename with format: csv-YYYY-MM-DD-HH-MM-SS.csv
      const now = new Date();
      const dateTime = now.toISOString()
        .replace(/:/g, '-')  // Replace colons with dashes
        .replace(/\./g, '-') // Replace dots with dashes
        .replace('T', '-')   // Replace T with dash
        .slice(0, 19);       // Remove milliseconds and Z
      const filePath = `csv-${dateTime}.csv`;  // Added .csv extension

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
          neighborhood: location,
          transport: finalTransport,
          created_at: timestamp,
          csv_url: uploadData.path,
          has_csv: "TRUE"
        })
        .select("id")
        .single();

      if (submissionError) throw submissionError;

      const submissionId = submissionData.id;

      // Store CSV data in session storage
      sessionStorage.setItem('csvData', csvText);
      
      // Process CSV data with actual submission ID
      const { data: processResult, error: processError } = await supabase.functions
        .invoke("parse-csv", {
          body: {
            submissionId,
            csvContent: csvText,
            fileName: selectedFile.name,
            transit: finalTransport,
            validateOnly: false, // Actually process and store the data
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
          has_lat_lng: processResult.hasLatLng,
          has_internal_temp: processResult.hasInternalTemp,
          has_probe_temp: processResult.hasProbeTemp,
          time_taken: processResult.totalMinutes,
          complete: processResult.complete,
          start_time: processResult.startTime,
          stop_time: processResult.endTime,
        })
        .eq("id", submissionId);

      if (updateError) throw updateError;

      // Save to context for the next page
      setSubmissionId(submissionId);
      setNameContext(name);
      setEmailContext(email);
      setAreaOfInterest(location);
      setModeOfTransport(finalTransport);
      setCreatedAt(timestamp);
      setCsvUrl(uploadData.path);

      // Use server-processed metadata instead of client-side parsing
      setNumRecords(processResult.numRecords);
      setMissingLatLng(processResult.hasLatLng === 'FALSE');
      setMissingInternalTemp(processResult.hasInternalTemp === 'FALSE');
      setMissingProbeTemp(processResult.hasProbeTemp === 'FALSE');
      setTotalMinutes(processResult.totalMinutes);

      router.push("/visualize");
    } catch (err) {
      console.error("Submission error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong during upload or processing.");
    } finally {
      setLoading(false);
    }
  };

  // Add function to close error modal
  const closeErrorModal = () => {
    setShowErrorModal(false);
    setValidationResult(null);
    setCsvPreviewData([]);
    setCsvHeaders([]);
  };

  // Add function to handle submit from error modal - full processing version without csv_data storage
  const handleErrorModalSubmit = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError("");
    
    try {
      const timestamp = new Date().toISOString();
      const finalTransport = transport === "Other" ? customTransport : transport;
      const csvText = await selectedFile.text();
      
      // Create filename with format: csv-YYYY-MM-DD-HH-MM-SS.csv
      const now = new Date();
      const dateTime = now.toISOString()
        .replace(/:/g, '-')  // Replace colons with dashes
        .replace(/\./g, '-') // Replace dots with dashes
        .replace('T', '-')   // Replace T with dash
        .slice(0, 19);       // Remove milliseconds and Z
      const filePath = `csv-${dateTime}.csv`;

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
          neighborhood: location,
          transport: finalTransport,
          created_at: timestamp,
          csv_url: uploadData.path,
          has_csv: "TRUE"
        })
        .select("id")
        .single();

      if (submissionError) throw submissionError;

      const submissionId = submissionData.id;

      // Process CSV data for metadata only - use validateOnly: true to get metadata without storing data
      const { data: processResult, error: processError } = await supabase.functions
        .invoke("parse-csv", {
          body: {
            submissionId, // Pass the submissionId for completeness
            csvContent: csvText,
            fileName: selectedFile.name,
            transit: finalTransport,
            validateOnly: true, // This will process and return metadata without storing in csv_data
          },
        });

      // Update the submission row with CSV metadata (even if processing had issues)
      if (processResult) {
        const { error: updateError } = await supabase
          .from("csv_submissions")
          .update({
            num_records: processResult.numRecords || 0,
            has_lat_lng: processResult.hasLatLng || 'FALSE',
            has_internal_temp: processResult.hasInternalTemp || 'FALSE',
            has_probe_temp: processResult.hasProbeTemp || 'FALSE',
            time_taken: processResult.totalMinutes || 0,
            complete: processResult.complete || 'FALSE',
            start_time: processResult.startTime || null,
            stop_time: processResult.endTime || null,
          })
          .eq("id", submissionId);

        if (updateError) {
          console.warn("Failed to update submission metadata:", updateError);
          // Don't throw - we still want to complete the submission
        }
      }

      // Close modal and redirect to home
      closeErrorModal();
      router.push("/");
      
    } catch (err) {
      console.error("Error modal submission error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong during upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6">
        {/* Header */}
        <div className="max-w-md mx-auto mb-8">
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
            Submit Your Measurements
          </h1>
          <p className="text-gray-600 text-sm">
            Help us understand urban heat patterns by sharing your temperature data
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="max-w-md mx-auto space-y-6"
        >
          {/* Personal Info Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h2>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                What neighborhood, area or point of interest did you collect this data in?
              </label>
              <input
                id="location"
                type="text"
                placeholder="e.g., Midtown Atlanta, Piedmont Park, Downtown"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-12 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Transport Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mode of Transport</h2>
            
            <div className="space-y-3">
              {[
                { value: "Walking", icon: "🚶", label: "Walking" },
                { value: "Cycling", icon: "🚴", label: "Cycling" },
                { value: "Driving", icon: "🚗", label: "Driving" },
                { value: "Other", icon: "❓", label: "Other" }
              ].map((option) => (
                <div key={option.value}>
                  <label className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="transport"
                      value={option.value}
                      checked={transport === option.value}
                      onChange={(e) => setTransport(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      transport === option.value 
                        ? "border-blue-500 bg-blue-500" 
                        : "border-gray-300 bg-white"
                    }`}>
                      {transport === option.value && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="text-xl">{option.icon}</span>
                    <span className="text-gray-900 font-medium">{option.label}</span>
                  </label>

                  {option.value === "Other" && transport === "Other" && (
                    <input
                      type="text"
                      placeholder="Please specify your mode of transport"
                      value={customTransport}
                      onChange={(e) => setCustomTransport(e.target.value)}
                      className="w-full h-12 mt-3 rounded-lg border border-gray-300 bg-white px-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      autoFocus
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Temperature Data</h2>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Upload your CSV file containing temperature measurements
              </p>
              
              <div
                className={`relative flex flex-col items-center justify-center gap-4 w-full py-8 rounded-lg border-2 transition-all cursor-pointer ${
                  isDragOver 
                    ? "border-blue-400 bg-blue-50" 
                    : selectedFile
                    ? "border-green-400 bg-green-50"
                    : "border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                {selectedFile ? (
                  <>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900">Tap to select CSV file</p>
                      <p className="text-sm text-gray-500">or drag and drop it here</p>
                    </div>
                  </>
                )}
                
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel,text/plain"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full h-14 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                isFormValid && !loading
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing your data...
                </div>
              ) : (
                "Submit Temperature Data"
              )}
            </button>
          </div>

          {/* Progress Indicator */}
          {loading && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Processing your submission</p>
                  <p className="text-xs text-blue-600">This may take a few moments...</p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Bottom spacing for mobile */}
        <div className="h-8"></div>
      </div>

      {/* Error Modal */}
      {showErrorModal && validationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">CSV Validation Issues</h3>
                <p className="text-sm text-gray-600 mt-1">
                  We found some issues with your data that need attention
                </p>
              </div>
              <button
                onClick={closeErrorModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Issues Summary */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Issues Found:</h4>
                <div className="space-y-2">
                  {validationResult.hasLatLng === 'FALSE' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Missing location data (latitude/longitude)</span>
                    </div>
                  )}
                  {validationResult.hasProbeTemp === 'FALSE' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Missing Probe temperature data</span>
                    </div>
                  )}
                  {validationResult.numRecords === 0 && (
                    <div className="flex items-center gap-2 text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>No valid data rows found</span>
                    </div>
                  )}
                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <div className="flex items-start gap-2 text-red-600">
                      <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span>Processing errors:</span>
                        <ul className="mt-1 text-sm space-y-1">
                          {validationResult.errors.slice(0, 5).map((error, index) => (
                            <li key={index} className="ml-4">• {error}</li>
                          ))}
                          {validationResult.errors.length > 5 && (
                            <li className="ml-4 text-gray-500">... and {validationResult.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Data Summary:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Valid records:</span>
                    <span className="ml-2 font-medium">{validationResult.numRecords}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Has location data:</span>
                    <span className={`ml-2 font-medium ${validationResult.hasLatLng === 'TRUE' ? 'text-green-600' : 'text-red-600'}`}>
                      {validationResult.hasLatLng === 'TRUE' ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Has temperature data:</span>
                    <span className={`ml-2 font-medium ${(validationResult.hasProbeTemp === 'TRUE') ? 'text-green-600' : 'text-red-600'}`}>
                      {(validationResult.hasProbeTemp === 'TRUE') ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="ml-2 font-medium">{validationResult.totalMinutes} minutes</span>
                  </div>
                </div>
              </div>

              {/* CSV Preview Table */}
              {csvPreviewData.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Data Preview (first 10 rows):</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {csvHeaders.map((header, index) => (
                              <th key={index} className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {csvPreviewData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              {csvHeaders.map((header, colIndex) => (
                                <td key={colIndex} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleErrorModalSubmit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
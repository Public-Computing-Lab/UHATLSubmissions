"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type SubmissionData = {
  image: string | null;
  comfort_level: string | null;
  image_importance: string | null;
  lat: number | null;
  long: number | null;
  created_at: string | null;
  name: string | null;
  email: string | null;
  area_of_interest: string | null;
  mode_of_transport: string | null;
  csv_url: string | null;
  submissionId: number | null;

  // Flattened CSV metadata
  numRecords: number | null;
  missingLatLng: boolean;
  missingInternalTemp: boolean;
  missingProbeTemp: boolean;
  totalMinutes: number | null;
};

type SubmissionContextType = SubmissionData & {
  setImage: (img: string | null) => void;
  setComfortLevel: (level: string | null) => void;
  setImageImportance: (importance: string | null) => void;
  setLocationCoords: (lat: number, long: number) => void;
  setCreatedAt: (dateTime: string) => void;
  setName: (name: string | null) => void;
  setEmail: (email: string | null) => void;
  setAreaOfInterest: (area: string | null) => void;
  setModeOfTransport: (transport: string | null) => void;
  setCsvUrl: (url: string | null) => void;

  setSubmissionId: (submissionId: number | null) => void;

  // Setters for each metadata field
  setNumRecords: (count: number | null) => void;
  setMissingLatLng: (flag: boolean) => void;
  setMissingInternalTemp: (flag: boolean) => void;
  setMissingProbeTemp: (flag: boolean) => void;
  setTotalMinutes: (minutes: number | null) => void;

  resetContext: () => void;
};

const SubmissionContext = createContext<SubmissionContextType | undefined>(undefined);

export const SubmissionProvider = ({ children }: { children: ReactNode }) => {
  const [image, setImage] = useState<string | null>(null);
  const [comfort_level, setComfortLevel] = useState<string | null>(null);
  const [image_importance, setImageImportance] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [long, setLong] = useState<number | null>(null);
  const [created_at, setCreatedAt] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [area_of_interest, setAreaOfInterest] = useState<string | null>(null);
  const [mode_of_transport, setModeOfTransport] = useState<string | null>(null);
  const [csv_url, setCsvUrl] = useState<string | null>(null);

  const [submissionId, setSubmissionId] = useState<number | null>(null);

  // CSV metadata
  const [numRecords, setNumRecords] = useState<number | null>(null);
  const [missingLatLng, setMissingLatLng] = useState<boolean>(false);
  const [missingInternalTemp, setMissingInternalTemp] = useState<boolean>(false);
  const [missingProbeTemp, setMissingProbeTemp] = useState<boolean>(false);
  const [totalMinutes, setTotalMinutes] = useState<number | null>(null);

  const setLocationCoords = (latitude: number, longitude: number) => {
    setLat(latitude);
    setLong(longitude);
  };

  const resetContext = () => {
    setImage(null);
    setComfortLevel(null);
    setImageImportance(null);
    setLat(null);
    setLong(null);
    setCreatedAt(null);
    setName(null);
    setEmail(null);
    setAreaOfInterest(null);
    setModeOfTransport(null);
    setCsvUrl(null);
    setNumRecords(null);
    setMissingLatLng(false);
    setMissingInternalTemp(false);
    setMissingProbeTemp(false);
    setTotalMinutes(null);
  };


  return (
    <SubmissionContext.Provider
      value={{
        image,
        comfort_level,
        image_importance,
        lat,
        long,
        created_at,
        name,
        email,
        area_of_interest,
        mode_of_transport,
        csv_url,
        numRecords,
        missingLatLng,
        missingInternalTemp,
        missingProbeTemp,
        totalMinutes,
        submissionId,
        setSubmissionId,
        setImage,
        setComfortLevel,
        setImageImportance,
        setLocationCoords,
        setCreatedAt,
        setName,
        setEmail,
        setAreaOfInterest,
        setModeOfTransport,
        setCsvUrl,
        setNumRecords,
        setMissingLatLng,
        setMissingInternalTemp,
        setMissingProbeTemp,
        setTotalMinutes,
        resetContext,
      }}
    >
      {children}
    </SubmissionContext.Provider>
  );
};

export const useSubmission = () => {
  const context = useContext(SubmissionContext);
  if (!context) {
    throw new Error("useSubmission must be used within a SubmissionProvider");
  }
  return context;
};

"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type SubmissionData = {
  image: string | null;
  comfort_level: string | null;
  image_importance: string | null;
  lat: number | null;
  long: number | null;
  created_at: string | null;
};

type SubmissionContextType = SubmissionData & {
  setImage: (img: string | null) => void;
  setComfortLevel: (level: string | null) => void;
  setImageImportance: (importance: string | null) => void;
  setLocationCoords: (lat: number, long: number) => void;
  setCreatedAt: (dateTime: string) => void;
};

const SubmissionContext = createContext<SubmissionContextType | undefined>(undefined);

export const SubmissionProvider = ({ children }: { children: ReactNode }) => {
  const [image, setImage] = useState<string | null>(null);
  const [comfort_level, setComfortLevel] = useState<string | null>(null);
  const [image_importance, setImageImportance] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [long, setLong] = useState<number | null>(null);
  const [created_at, setCreatedAt] = useState<string | null>(null);

  const setLocationCoords = (latitude: number, longitude: number) => {
    setLat(latitude);
    setLong(longitude);
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
        setImage,
        setComfortLevel,
        setImageImportance,
        setLocationCoords,
        setCreatedAt,
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
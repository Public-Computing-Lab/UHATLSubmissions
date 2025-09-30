"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface TagSubmission {
  id: string;
  image_url: string;
  comfort_level: string;
  comment: string;
  lat: number;
  long: number;
  created_at: string;
  tags: string[];
  signedImageUrl?: string;
}

interface TagDetailViewProps {
  tagName: string;
  onBack: () => void;
}

export default function TagDetailView({ tagName, onBack }: TagDetailViewProps) {
  const [submissions, setSubmissions] = useState<TagSubmission[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  const STORY_DURATION = 5000; // 5 seconds per story
  const MAX_STORIES = 6;

  // Gradient map for comfort levels
  const gradientMap: Record<string, [string, string]> = {
    Freezing: ["#8CB9F1", "#CFE8FF"],
    Chilly: ["#0074B7", "#88D6F0"],
    Comfortable: ["#21A348", "#9FEFAF"],
    Warm: ["#FFD500", "#FFF3B0"],
    Hot: ["#E27100", "#FFB74D"],
    Sweltering: ["#6C1D45", "#FF4B4B"],
  };

  useEffect(() => {
    fetchSubmissionsForTag();
  }, [tagName]);

  useEffect(() => {
    if (submissions.length > 0) {
      startStoryProgress();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [submissions, currentStoryIndex]);

  const fetchSubmissionsForTag = async () => {
    try {
      setLoading(true);
      
      // Fetch all submissions with tags and filter client-side
      const { data: allSubmissions, error: fetchError } = await supabase
        .from("image_submissions")
        .select("*")
        .not('tags', 'is', null)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Filter client-side for the specific tag
      const filteredSubmissions = allSubmissions?.filter((submission) => 
        submission.tags && Array.isArray(submission.tags) && submission.tags.includes(tagName)
      ) || [];

      // Take only first 6 submissions
      const limitedSubmissions = filteredSubmissions.slice(0, MAX_STORIES);
      
      // Load images for all submissions
      const submissionsWithImages = await Promise.all(
        limitedSubmissions.map(async (submission) => {
          try {
            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from("submitted-images")
              .createSignedUrl(submission.image_url, 3600);

            if (urlError) {
              console.warn(`Error creating signed URL for submission ${submission.id}:`, urlError);
              return { ...submission, signedImageUrl: '' };
            }

            return { ...submission, signedImageUrl: signedUrlData.signedUrl };
          } catch (error) {
            console.warn(`Error processing submission ${submission.id}:`, error);
            return { ...submission, signedImageUrl: '' };
          }
        })
      );

      setSubmissions(submissionsWithImages.filter(s => s.signedImageUrl));
      
    } catch (err) {
      console.error("Error fetching submissions:", err);
      setError("Failed to load submissions for this tag");
    } finally {
      setLoading(false);
    }
  };

  const startStoryProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    progressRef.current = 0;
    setProgress(0);
    
    intervalRef.current = window.setInterval(() => {
      progressRef.current += 100 / (STORY_DURATION / 100);
      setProgress(progressRef.current);
      
      if (progressRef.current >= 100) {
        nextStory();
      }
    }, 100);
  };

  const nextStory = () => {
    if (currentStoryIndex >= submissions.length - 1) {
      // Loop back to beginning
      setCurrentStoryIndex(0);
    } else {
      setCurrentStoryIndex(prev => prev + 1);
    }
  };

  const previousStory = () => {
    if (currentStoryIndex <= 0) {
      // Go to last story
      setCurrentStoryIndex(submissions.length - 1);
    } else {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  const toggleOverlay = () => {
    setShowOverlay(prev => !prev);
  };

  const getTagDisplayName = (tag: string): string => {
    return tag.charAt(0).toUpperCase() + tag.slice(1).replace(/([A-Z])/g, ' $1');
  };

  const getTagEmoji = (tag: string): string => {
    const emojiMap: { [key: string]: string } = {
      'cooling off': '❄️',
      'public space': '🏛️',
      'commute': '🚌',
      'working outside': '🔨',
      'health impacts': '🏥',
      'outdoor activity': '🏃',
      'freezing': '🥶',
      'chilly': '😬',
      'comfortable': '😊',
      'warm': '😅',
      'hot': '🥵',
      'sweltering': '🔥',
      'dawn': '🌅',
      'morning': '🌅',
      'noon': '☀️',
      'afternoon': '🌤️',
      'evening': '🌇',
      'dusk': '🌆',
      'night': '🌙',
    };
    return emojiMap[tag.toLowerCase()] || '📸';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[3000]">
        <div className="text-center text-white">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading {getTagDisplayName(tagName)} stories...</p>
        </div>
      </div>
    );
  }

  if (error || submissions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[3000]">
        <div className="text-center text-white">
          <p className="text-red-400 mb-4">{error || "No stories found for this tag"}</p>
          <button
            onClick={onBack}
            className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
          >
            Back to Stories
          </button>
        </div>
      </div>
    );
  }

  const currentSubmission = submissions[currentStoryIndex];

  return (
    <div className="fixed inset-0 bg-black z-[3000]">
      {/* Background Image */}
      {currentSubmission?.signedImageUrl && (
        <img
          src={currentSubmission.signedImageUrl}
          alt="Story"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Story Progress Bars */}
      <div className="absolute top-4 left-4 right-4 flex space-x-1 z-50">
        {submissions.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{
                width: index < currentStoryIndex ? '100%' : 
                       index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-50 mt-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getTagEmoji(tagName)}</span>
          <div>
            <p className="text-white font-bold text-lg drop-shadow-lg">
              {getTagDisplayName(tagName)}
            </p>
            <p className="text-white/80 text-sm drop-shadow-lg">
              {formatDateTime(currentSubmission.created_at)}
            </p>
          </div>
        </div>
        
        <button
          onClick={onBack}
          className="bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition-all border border-white/20"
        >
          ✕
        </button>
      </div>

      {/* Navigation Areas (Invisible touch zones) */}
      <button
        className="absolute left-0 top-0 bottom-0 w-1/3 z-40"
        onClick={previousStory}
      />
      
      <button
        className="absolute right-0 top-0 bottom-0 w-1/3 z-40"
        onClick={nextStory}
      />

      {/* Center tap to toggle overlay */}
      <button
        className="absolute left-1/3 top-0 bottom-0 w-1/3 z-30"
        onClick={toggleOverlay}
      />

      {/* Navigation Arrows (Visible) */}
      <button
        onClick={previousStory}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/70 transition-all border border-white/20 z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextStory}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/70 transition-all border border-white/20 z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Story Overlay Content */}
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center px-4 py-8 z-40">
          <div 
            className="text-white rounded-lg p-4 w-full max-w-sm shadow-xl border-2 border-white/40 backdrop-blur-md"
            style={{
              background: `linear-gradient(135deg, ${gradientMap[currentSubmission.comfort_level]?.[0]}CC, ${gradientMap[currentSubmission.comfort_level]?.[1]}E6)`,
              boxShadow: `0 8px 32px ${gradientMap[currentSubmission.comfort_level]?.[0]}40`,
            }}
          >
            {/* Comfort Level Section */}
            <div className="text-center pb-3 border-b border-white/40 mb-3">
              <div className="flex items-center justify-center gap-3">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
                  style={{
                    background: `linear-gradient(to bottom, ${gradientMap[currentSubmission.comfort_level]?.[0]}, ${gradientMap[currentSubmission.comfort_level]?.[1]})`,
                  }}
                />
                <span className="text-sm font-bold text-white drop-shadow-lg">
                  {currentSubmission.comfort_level}
                </span>
              </div>
            </div>

            {/* Tags Section */}
            {currentSubmission.tags && currentSubmission.tags.length > 0 && (
              <div className="pb-3 border-b border-white/40 mb-3">
                <h3 className="text-center text-sm font-bold mb-2 text-white drop-shadow-lg">Tags</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentSubmission.tags.map((tag, index) => (
                    <span
                      key={index}
                      className={`px-2 py-1 text-white text-xs rounded-full backdrop-blur-sm ${
                        tag === tagName ? 'bg-white/30' : 'bg-white/20'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description Section */}
            <div className="pb-3">
              <h3 className="text-center text-sm font-bold mb-3 text-white drop-shadow-lg">About This Photo</h3>
              <div 
                className="text-center text-xs leading-relaxed p-3 rounded-lg"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <p className="text-white font-medium drop-shadow-sm">
                  {currentSubmission.comment || "No description provided"}
                </p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="text-center text-white/80 text-xs mt-3">
              {currentStoryIndex + 1} of {submissions.length}
            </div>
          </div>
        </div>
      )}

      {/* Bottom instruction hint */}
      {!showOverlay && (
        <div className="absolute bottom-8 left-4 right-4 text-center z-40">
          <p className="text-white/70 text-sm drop-shadow-lg">
            Tap center to view details • Tap sides to navigate
          </p>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
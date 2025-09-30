"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TagDetailView from "./TagDetailView";

interface TagStory {
  tag: string;
  imageUrl: string;
  submissionId: string;
  comfortLevel: string;
  imageCount: number;
}

export default function StorybookView() {
  const [allTagStories, setAllTagStories] = useState<TagStory[]>([]);
  const [displayedStories, setDisplayedStories] = useState<TagStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const BATCH_SIZE = 6;

  useEffect(() => {
    fetchAllTagStories();
  }, []);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchAllTagStories = async () => {
    try {
      setLoading(true);
      
      // Fetch all submissions with tags
      const { data: submissions, error: fetchError } = await supabase
        .from("image_submissions")
        .select("*")
        .not('tags', 'is', null);

      if (fetchError) throw fetchError;

      // Process submissions to extract unique tags and representative images
      const tagMap = new Map<string, { submission: any; count: number }>();

      submissions?.forEach((submission) => {
        if (submission.tags && Array.isArray(submission.tags)) {
          submission.tags.forEach((tag: string) => {
            const existing = tagMap.get(tag);
            if (existing) {
              existing.count += 1;
            } else {
              tagMap.set(tag, { submission, count: 1 });
            }
          });
        }
      });

      // Convert to array and sort by popularity
      const allStories: TagStory[] = [];
      for (const [tag, { submission, count }] of tagMap.entries()) {
        try {
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from("submitted-images")
            .createSignedUrl(submission.image_url, 3600);

          if (urlError) {
            console.warn(`Error creating signed URL for ${tag}:`, urlError);
            continue;
          }

          allStories.push({
            tag,
            imageUrl: signedUrlData.signedUrl,
            submissionId: submission.id,
            comfortLevel: submission.comfort_level,
            imageCount: count,
          });
        } catch (error) {
          console.warn(`Error processing tag ${tag}:`, error);
        }
      }

      // Shuffle all stories and store them
      const shuffledStories = shuffleArray(allStories);
      setAllTagStories(shuffledStories);
      
      // Display first 6
      setDisplayedStories(shuffledStories.slice(0, BATCH_SIZE));
      setCurrentIndex(BATCH_SIZE);
      
    } catch (err) {
      console.error("Error fetching tag stories:", err);
      setError("Failed to load stories");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreStories = () => {
    if (currentIndex >= allTagStories.length) return;
    
    setLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextBatch = allTagStories.slice(currentIndex, currentIndex + BATCH_SIZE);
      setDisplayedStories(prev => [...prev, ...nextBatch]);
      setCurrentIndex(prev => prev + BATCH_SIZE);
      setLoadingMore(false);
    }, 500);
  };

  const shuffleAndReset = () => {
    setLoadingMore(true);
    
    setTimeout(() => {
      const shuffled = shuffleArray(allTagStories);
      setAllTagStories(shuffled);
      setDisplayedStories(shuffled.slice(0, BATCH_SIZE));
      setCurrentIndex(BATCH_SIZE);
      setLoadingMore(false);
    }, 500);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
  };

  const handleBackToStories = () => {
    setSelectedTag(null);
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

  // If a tag is selected, show the detail view
  if (selectedTag) {
    return <TagDetailView tagName={selectedTag} onBack={handleBackToStories} />;
  }

  if (loading) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAllTagStories}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasMoreStories = currentIndex < allTagStories.length;

  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 overflow-y-auto">
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Heat Stories</h1>
          <p className="text-gray-600">Explore temperature experiences by category</p>
          <p className="text-sm text-gray-500 mt-2">
            Showing {displayedStories.length} of {allTagStories.length} story categories
          </p>
        </div>

        {/* Stories Grid */}
        {displayedStories.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-600">No stories available yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-8">
              {displayedStories.map((story, index) => (
                <button
                  key={`${story.tag}-${index}`}
                  onClick={() => handleTagClick(story.tag)}
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {/* Image */}
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={story.imageUrl}
                      alt={story.tag}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Tag count badge */}
                    {story.imageCount > 1 && (
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                        {story.imageCount}
                      </div>
                    )}
                    
                    {/* Tag label */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTagEmoji(story.tag)}</span>
                        <div className="text-left">
                          <p className="text-white font-semibold text-sm leading-tight">
                            {getTagDisplayName(story.tag)}
                          </p>
                          {story.imageCount > 1 && (
                            <p className="text-white/80 text-xs">
                              {story.imageCount} photos
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              {hasMoreStories && (
                <button
                  onClick={loadMoreStories}
                  disabled={loadingMore}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    `Load ${Math.min(BATCH_SIZE, allTagStories.length - currentIndex)} More`
                  )}
                </button>
              )}
              
              <button
                onClick={shuffleAndReset}
                disabled={loadingMore}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Shuffling...</span>
                  </div>
                ) : (
                  'Shuffle All'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
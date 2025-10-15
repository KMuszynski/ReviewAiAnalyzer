"use client";

import { useState } from "react";

interface AnalysisData {
  title: string;
  stats: {
    label: string;
    value: string | number;
    trend?: "up" | "down" | "neutral";
  }[];
}

interface UrlProcessorProps {
  onAnalysisComplete: (analysisData: AnalysisData) => void;
}

export default function UrlProcessor({
  onAnalysisComplete,
}: UrlProcessorProps) {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoPath, setVideoPath] = useState<string | null>(null);

  const processUrl = async (url: string) => {
    // Dummy function to simulate URL processing
    console.log("Processing URL:", url);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Dummy processing logic
    const isValidUrl = url.startsWith("http://") || url.startsWith("https://");

    if (!isValidUrl) {
      throw new Error(
        "Please enter a valid URL starting with http:// or https://"
      );
    }

    // Simulate different types of URLs and return video paths with analysis data
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return {
        videoPath: "/iphone-review.mp4",
        type: "YouTube Video",
        title: "iPhone Review Video",
        description: "Video analysis completed successfully",
        analysisData: {
          title: "iPhone 15 Pro Review Analysis",
          stats: [
            { label: "Overall Sentiment", value: "Positive", trend: "up" },
            { label: "Average Rating", value: "4.3/5", trend: "up" },
            {
              label: "Key Positives",
              value: "Camera, Performance",
              trend: "up",
            },
            { label: "Key Negatives", value: "Price, Battery", trend: "down" },
            { label: "Viewer Engagement", value: "High", trend: "up" },
          ],
        },
      };
    } else if (url.includes("amazon.com") || url.includes("amazon.")) {
      return {
        videoPath: "/iphone-review.mp4",
        type: "Amazon Product Review",
        title: "Product Review Video",
        description: "Video analysis completed successfully",
        analysisData: {
          title: "Amazon Product Review Analysis",
          stats: [
            { label: "Purchase Intent", value: "78%", trend: "up" },
            { label: "Product Satisfaction", value: "4.1/5", trend: "up" },
            { label: "Price Perception", value: "Fair", trend: "neutral" },
            { label: "Quality Rating", value: "4.2/5", trend: "up" },
            { label: "Recommendation Rate", value: "85%", trend: "up" },
          ],
        },
      };
    } else if (url.includes("google.com/maps") || url.includes("maps.google")) {
      return {
        videoPath: "/iphone-review.mp4",
        type: "Location Review",
        title: "Location Review Video",
        description: "Video analysis completed successfully",
        analysisData: {
          title: "Location Review Analysis",
          stats: [
            { label: "Location Rating", value: "4.5/5", trend: "up" },
            { label: "Service Quality", value: "Excellent", trend: "up" },
            { label: "Atmosphere", value: "Great", trend: "up" },
            { label: "Value for Money", value: "Good", trend: "neutral" },
            { label: "Would Return", value: "92%", trend: "up" },
          ],
        },
      };
    } else {
      return {
        videoPath: "/iphone-review.mp4",
        type: "Generic Video",
        title: "Video Analysis",
        description: "Video analysis completed successfully",
        analysisData: {
          title: "General Video Analysis",
          stats: [
            { label: "Content Quality", value: "Good", trend: "up" },
            { label: "Engagement Level", value: "Medium", trend: "neutral" },
            { label: "Clarity Score", value: "7.5/10", trend: "up" },
            { label: "Relevance", value: "High", trend: "up" },
            { label: "Overall Score", value: "8.2/10", trend: "up" },
          ],
        },
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await processUrl(url.trim());
      setResult(JSON.stringify(analysisResult, null, 2));
      setVideoPath(analysisResult.videoPath); // Set the video path from the result
      setShowVideo(true); // Show video player after processing

      // Send analysis data to parent component
      if (analysisResult.analysisData) {
        onAnalysisComplete(analysisResult.analysisData);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while processing the URL"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeDifferent = () => {
    setShowVideo(false);
    setResult(null);
    setError(null);
    setUrl("");
    setVideoPath(null);
  };

  if (showVideo) {
    return (
      <div className="w-full max-w-md">
        <div className="space-y-4">
          {/* Video Player */}
          <div className="w-full">
            <video
              controls
              className="max-h-[400px] max-w-full rounded-lg shadow-lg mx-auto"
              poster="/iphone-review-poster.jpg" // Optional: add a poster image
            >
              <source src={videoPath || ""} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Button to analyze different video */}
          <button
            onClick={handleAnalyzeDifferent}
            className="w-full bg-gray-300 text-black py-2 px-4 rounded-md hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Analyse different video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Enter video URL to analyze:
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isProcessing}
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing || !url.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? "Processing..." : "Analyze Video"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/supabase/client";

interface AnalysisData {
  title: string;
  stats: {
    label: string;
    value: string | number;
    trend?: "up" | "down" | "neutral";
  }[];
}

interface VideoUploadProps {
  onAnalysisComplete: (analysisData: AnalysisData) => void;
}

export default function VideoUpload({ onAnalysisComplete }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoPath, setVideoPath] = useState<string | null>(null);

  const processVideo = async (file: File) => {
    const supabase = createClient();

    try {
      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to upload videos");
      }

      // Generate a unique filename with user ID to organize files
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;

      // Upload file to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      return {
        fileName,
        publicUrl: urlData.publicUrl,
        path: data.path,
        userId: user.id,
      };
    } catch (error) {
      console.error("Error uploading video:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a video file");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const uploadResult = await processVideo(file);
      setVideoPath(uploadResult.publicUrl);
      setShowVideo(true);

      // For now, create a mock analysis result
      // You can replace this with actual video analysis logic
      const mockAnalysis: AnalysisData = {
        title: `Analysis of ${file.name}`,
        stats: [
          { label: "Duration", value: "2:30", trend: "neutral" },
          { label: "Quality", value: "HD", trend: "up" },
          {
            label: "File Size",
            value: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            trend: "neutral",
          },
        ],
      };

      onAnalysisComplete(mockAnalysis);
      setResult(JSON.stringify(uploadResult, null, 2));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while processing the video"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeDifferent = () => {
    setShowVideo(false);
    setResult(null);
    setError(null);
    setFile(null);
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
            htmlFor="file"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Upload a video to process
          </label>
          <input
            type="file"
            id="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isProcessing}
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isProcessing || !file}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? "Uploading..." : "Upload & Analyze Video"}
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

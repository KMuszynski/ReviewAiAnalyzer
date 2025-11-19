'use client'

import { useState } from 'react'

interface AnalysisData {
	title: string
	stats: {
		label: string
		value: string | number
		trend?: 'up' | 'down' | 'neutral'
	}[]
}

interface UrlProcessorProps {
	onAnalysisComplete: (analysisData: AnalysisData) => void
}

export default function UrlProcessor({ onAnalysisComplete }: UrlProcessorProps) {
	const [url, setUrl] = useState('')
	const [isProcessing, setIsProcessing] = useState(false)
	const [result, setResult] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [showVideo, setShowVideo] = useState(false)
	const [videoPath, setVideoPath] = useState<string | null>(null)

	const processUrl = async (url: string) => {
    // Call your backend endpoint
    const response = await fetch('http://localhost:5000/api/video/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url }),
		});
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // ✅ Log results to console as requested
    console.log('=== Video Analysis Results ===');
    console.log('Transcription:', data.transcription);
    console.log('Sentiment Analysis:', data.sentiment);
    console.log('Features:', data.features);

    // Return data in the format your UI expects
    return {
        videoPath: '/iphone-review.mp4', // Make dynamic if needed
        type: 'YouTube Video',
        title: 'Video Analysis',
        description: 'Video analysis completed successfully',
        analysisData: data.analysisData,
    };
	};

	const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
        setError('Please enter a URL');
        return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
        const analysisResult = await processUrl(url.trim());
        setResult(JSON.stringify(analysisResult, null, 2));
        setVideoPath(analysisResult.videoPath);
        setShowVideo(true);

        if (analysisResult.analysisData) {
            onAnalysisComplete(analysisResult.analysisData);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Analysis error:', err); // Log full error to console
    } finally {
        setIsProcessing(false);
    }
	};

	const handleAnalyzeDifferent = () => {
		setShowVideo(false)
		setResult(null)
		setError(null)
		setUrl('')
		setVideoPath(null)
	}

	if (showVideo) {
		return (
			<div className='w-full max-w-md bg-white p-6 rounded-xl shadow-lg'>
				     
				<div className='space-y-4'>
					   
					<div className='w-full'>
						     
						<video
							controls
							className='w-full max-h-[400px] rounded-lg shadow-xl mx-auto'
							poster='/iphone-review-poster.jpg'>
							    <source src={videoPath || ''} type='video/mp4' />            Your browser does not supportthe video
							tag.
						</video>
					</div>
					<button
						onClick={handleAnalyzeDifferent}
						className='w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:text-indigo-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition duration-150'>
						            Analyze different video      
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className='w-full max-w-md bg-white p-6 rounded-xl shadow-lg'>
			<form onSubmit={handleSubmit} className='space-y-4'>
				   
				<div>
					   
					<label htmlFor='url' className='block text-sm font-medium text-gray-700 mb-2'>
						            Enter video URL to analyze:        
					</label>
					<span className='text-xs text-black'>https://www.youtube.com/watch?v=rY42Yg2gHa8</span>
					<input
						type='url'
						id='url'
						value={url}
						onChange={e => setUrl(e.target.value)}
						placeholder='https://youtube.com/watch?v=...'
						className='w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition duration-150'
						disabled={isProcessing}
					/>
					 
				</div>
				       
				<button
					type='submit'
					disabled={isProcessing || !url.trim()}
					className='w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150'>
					          {isProcessing ? 'Processing...' : 'Analyze Video'}       
				</button>
				     
			</form>
			     
			{error && (
				<div className='mt-4 p-3 bg-red-50 border border-red-400 text-red-700 rounded-lg shadow-sm'>
					          <p className='text-sm'>Error: {error}</p>       
				</div>
			)}
			   
		</div>
	)
}

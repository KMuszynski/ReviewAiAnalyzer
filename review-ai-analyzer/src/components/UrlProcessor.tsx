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
		await new Promise(resolve => setTimeout(resolve, 2000))

		const isValidUrl = url.startsWith('http://') || url.startsWith('https://')

		if (!isValidUrl) {
			throw new Error('Please enter a valid URL starting with http:// or https://')
		}

		if (url.includes('youtube.com') || url.includes('youtu.be')) {
			return {
				videoPath: '/iphone-review.mp4',
				type: 'YouTube Video',
				title: 'iPhone Review Video',
				description: 'Video analysis completed successfully',
				analysisData: {
					title: 'iPhone 15 Pro Review Analysis',
					stats: [
						{
							label: 'Overall Sentiment',
							value: 'Positive',
							trend: 'up' as const,
						},
						{ label: 'Average Rating', value: '4.3/5', trend: 'up' as const },
						{
							label: 'Key Positives',
							value: 'Camera, Performance',
							trend: 'up' as const,
						},
						{
							label: 'Key Negatives',
							value: 'Price, Battery',
							trend: 'down' as const,
						},
						{ label: 'Viewer Engagement', value: 'High', trend: 'up' as const },
					],
				},
			}
		} else if (url.includes('amazon.com') || url.includes('amazon.')) {
			return {
				videoPath: '/iphone-review.mp4',
				type: 'Amazon Product Review',
				title: 'Product Review Video',
				description: 'Video analysis completed successfully',
				analysisData: {
					title: 'Amazon Product Review Analysis',
					stats: [
						{ label: 'Purchase Intent', value: '78%', trend: 'up' as const },
						{
							label: 'Product Satisfaction',
							value: '4.1/5',
							trend: 'up' as const,
						},
						{
							label: 'Price Perception',
							value: 'Fair',
							trend: 'neutral' as const,
						},
						{ label: 'Quality Rating', value: '4.2/5', trend: 'up' as const },
						{
							label: 'Recommendation Rate',
							value: '85%',
							trend: 'up' as const,
						},
					],
				},
			}
		} else if (url.includes('google.com/maps') || url.includes('maps.google')) {
			return {
				videoPath: '/iphone-review.mp4',
				type: 'Location Review',
				title: 'Location Review Video',
				description: 'Video analysis completed successfully',
				analysisData: {
					title: 'Location Review Analysis',
					stats: [
						{ label: 'Location Rating', value: '4.5/5', trend: 'up' as const },
						{
							label: 'Service Quality',
							value: 'Excellent',
							trend: 'up' as const,
						},
						{ label: 'Atmosphere', value: 'Great', trend: 'up' as const },
						{
							label: 'Value for Money',
							value: 'Good',
							trend: 'neutral' as const,
						},
						{ label: 'Would Return', value: '92%', trend: 'up' as const },
					],
				},
			}
		} else {
			return {
				videoPath: '/iphone-review.mp4',
				type: 'Generic Video',
				title: 'Video Analysis',
				description: 'Video analysis completed successfully',
				analysisData: {
					title: 'General Video Analysis',
					stats: [
						{ label: 'Content Quality', value: 'Good', trend: 'up' as const },
						{
							label: 'Engagement Level',
							value: 'Medium',
							trend: 'neutral' as const,
						},
						{ label: 'Clarity Score', value: '7.5/10', trend: 'up' as const },
						{ label: 'Relevance', value: 'High', trend: 'up' as const },
						{ label: 'Overall Score', value: '8.2/10', trend: 'up' as const },
					],
				},
			}
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!url.trim()) {
			setError('Please enter a URL')
			return
		}

		setIsProcessing(true)
		setError(null)
		setResult(null)

		try {
			const analysisResult = await processUrl(url.trim())
			setResult(JSON.stringify(analysisResult, null, 2))
			setVideoPath(analysisResult.videoPath)
			setShowVideo(true)

			if (analysisResult.analysisData) {
				onAnalysisComplete(analysisResult.analysisData)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred while processing the URL')
		} finally {
			setIsProcessing(false)
		}
	}

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

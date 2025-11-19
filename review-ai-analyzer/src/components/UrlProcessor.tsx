'use client'

import { useState } from 'react'

interface AnalysisData {
	title: string
	stats: {
		label: string
		value: string | number
		trend?: 'up' | 'down' | 'neutral'
	}[]
	fullTranscription: string
	sentimentDetails: any // Pole do przechowywania pełnej mapy sentymentu z fragmentami tekstu
}

interface UrlProcessorProps {
	onAnalysisComplete: (analysisData: AnalysisData) => void
}

// Funkcja pomocnicza do wyodrębniania ID wideo z URL YouTube
const extractYouTubeID = (url: string): string | null => {
	const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|v\/|e\/|watch\?.*v=)|youtu\.be\/)([^"&?\/\s]{11})/
	const match = url.match(regex)
	return match ? match[1] : null
}

// Funkcja pomocnicza do generowania linku osadzania
const generateEmbedLink = (videoID: string): string => {
	return `https://www.youtube.com/embed/${videoID}?rel=0&showinfo=0&autoplay=0`
}

export default function UrlProcessor({ onAnalysisComplete }: UrlProcessorProps) {
	const [url, setUrl] = useState('')
	const [isProcessing, setIsProcessing] = useState(false)
	const [result, setResult] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [showVideo, setShowVideo] = useState(false)
	const [embedUrl, setEmbedUrl] = useState<string | null>(null) // Używany do osadzania wideo

	const processUrl = async (inputUrl: string) => {
		// Sprawdzenie poprawności URL i wyciągnięcie ID wideo
		const videoID = extractYouTubeID(inputUrl)
		if (!videoID) {
			throw new Error('Invalid YouTube URL provided.')
		}

		// Call your backend endpoint (Flask)
		const response = await fetch('http://localhost:5000/api/video/analyze', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url: inputUrl }),
		})
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
		}

		const data = await response.json()

		// Logi do konsoli (dla celów debugowania)
		console.log('=== Video Analysis Results ===')
		console.log('Transcription:', data.transcription)
		console.log('Sentiment Analysis:', data.sentiment)
		console.log('Features:', data.features)

		// Generujemy link do osadzenia wideo
		const generatedEmbedUrl = generateEmbedLink(videoID)

		// Zwracanie pełnego pakietu danych
		return {
			embedUrl: generatedEmbedUrl,
			type: 'YouTube Video',
			title: data.analysisData.title || 'Video Analysis',
			description: 'Video analysis completed successfully',
			analysisData: {
				title: data.analysisData.title,
				stats: data.analysisData.stats,
				fullTranscription: data.fullTranscription,
				// Przekazujemy pełną mapę sentymentu zawierającą fragmenty tekstu
				sentimentDetails: data.sentiment,
			},
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

			// Ustawiamy dynamiczny link osadzania
			setEmbedUrl(analysisResult.embedUrl)

			setShowVideo(true)

			if (analysisResult.analysisData) {
				onAnalysisComplete(analysisResult.analysisData)
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'An error occurred'
			setError(errorMessage)
			console.error('Analysis error:', err) // Log full error to console
		} finally {
			setIsProcessing(false)
		}
	}

	const handleAnalyzeDifferent = () => {
		setShowVideo(false)
		setResult(null)
		setError(null)
		setUrl('')
		setEmbedUrl(null)
	}

	if (showVideo) {
		return (
			<div className='w-full max-w-md bg-white p-6 rounded-xl shadow-lg'>
				<div className='space-y-4'>
					<div className='w-full aspect-video rounded-lg shadow-xl overflow-hidden'>
						{/* WYŚWIETLANIE WIDEO PRZEZ IFRAME */}
						<iframe
							className='w-full h-full'
							src={embedUrl || ''}
							frameBorder='0'
							allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
							allowFullScreen
							title='Embedded YouTube Video'
						/>
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

'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/supabase/client'

interface AnalysisData {
	title: string
	stats: {
		label: string
		value: string | number
		trend?: 'up' | 'down' | 'neutral'
	}[]
	fullTranscription: string
	sentimentDetails: any
}

interface UrlProcessorProps {
	onAnalysisComplete: (analysisData: AnalysisData) => void
	userId?: string | null
}

export default function UrlProcessor({ onAnalysisComplete, userId }: UrlProcessorProps) {
	const supabase = useMemo(() => createClient(), [])
	const [url, setUrl] = useState('')
	const [isProcessing, setIsProcessing] = useState(false)
	const [result, setResult] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [showVideo, setShowVideo] = useState(false)
	const [embedUrl, setEmbedUrl] = useState<string | null>(null)
	const [platform, setPlatform] = useState<string | null>(null)
	const [sourceUrl, setSourceUrl] = useState<string | null>(null)

	const persistAnalysis = async (
		analysisResult: { analysisData: AnalysisData; embedUrl: string | null },
		sourceUrl: string
	) => {
		if (!userId) {
			console.warn('Cannot save analysis: User not signed in')
			return
		}
		// try to save the analysis to the database
		try {
			const { data, error: insertError } = await supabase.from('sentiments').insert({
				user_id: userId,
				source_url: sourceUrl,
				analysis_title: analysisResult.analysisData?.title,
				analysis_stats: analysisResult.analysisData?.stats ?? [],
				full_transcription: analysisResult.analysisData?.fullTranscription ?? '',
				sentiment_details: analysisResult.analysisData?.sentimentDetails ?? {},
			}).select()

			if (insertError) {
				// If table doesn't exist, just log a warning instead of throwing
				if (insertError.code === 'PGRST205' || insertError.message.includes('Could not find the table')) {
					console.warn('⚠️ Sentiments table does not exist yet. Please run the migration to enable saving analyses.')
					return
				}
				throw new Error(insertError.message)
			}

			console.log('✅ Sentiment analysis saved to database:', data)
		} catch (err) {
			// Catch any other errors and log them, but don't break the analysis flow
			console.error('Failed to save sentiment analysis:', err)
		}
	}

	const processUrl = async (inputUrl: string) => {
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

		console.log('=== Video Analysis Results ===')
		console.log('Transcription:', data.transcription)
		console.log('Sentiment Analysis:', data.sentiment)
		console.log('Features:', data.features)

		// Backend returns embed link and platform info
		const platformName = data.platform 
			? data.platform.charAt(0).toUpperCase() + data.platform.slice(1)
			: 'Video'
		
		return {
			embedUrl: data.embedUrl,
			platform: data.platform || 'unknown',
			type: `${platformName} Video`,
			title: data.analysisData.title || 'Video Analysis',
			description: 'Video analysis completed successfully',
			analysisData: {
				title: data.analysisData.title,
				stats: data.analysisData.stats,
				fullTranscription: data.fullTranscription,
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
			const trimmedUrl = url.trim()
			const analysisResult = await processUrl(trimmedUrl)
			await persistAnalysis(analysisResult, trimmedUrl)
			setResult(JSON.stringify(analysisResult, null, 2))

			setEmbedUrl(analysisResult.embedUrl)
			setPlatform(analysisResult.platform)
			setSourceUrl(trimmedUrl)
			setShowVideo(true)

			if (analysisResult.analysisData) {
				onAnalysisComplete(analysisResult.analysisData)
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'An error occurred'
			setError(errorMessage)
			console.error('Analysis error:', err)
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
		setPlatform(null)
		setSourceUrl(null)
	}

	if (showVideo) {
		// TikTok doesn't allow iframe embedding, show a link instead
		const isTikTok = platform === 'tiktok'

		return (
			<div className='w-full max-w-md bg-white p-6 rounded-xl shadow-lg'>
				<div className='space-y-4'>
					{isTikTok ? (
						<div className='w-full aspect-video rounded-lg shadow-xl overflow-hidden bg-gray-100 flex flex-col items-center justify-center p-6'>
							<div className='text-center space-y-4'>
								<p className='text-gray-700 font-semibold'>TikTok videos cannot be embedded</p>
								<p className='text-sm text-gray-600'>
									TikTok blocks iframe embedding for security reasons. Click the button below to view the video on TikTok.
								</p>
								{sourceUrl && (
									<a
										href={sourceUrl}
										target='_blank'
										rel='noopener noreferrer'
										className='inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150'>
										Open on TikTok →
									</a>
								)}
							</div>
						</div>
					) : embedUrl ? (
						<div className='w-full aspect-video rounded-lg shadow-xl overflow-hidden'>
							<iframe
								className='w-full h-full'
								src={embedUrl}
								frameBorder='0'
								allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
								allowFullScreen
								title='Embedded Video Player'
							/>
						</div>
					) : (
						<div className='w-full aspect-video rounded-lg shadow-xl overflow-hidden bg-gray-100 flex items-center justify-center'>
							<p className='text-gray-500'>Video loading...</p>
						</div>
					)}
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
					<span className='text-xs text-gray-600 mb-1 block'>
						Supported: YouTube, Vimeo, TikTok
					</span>
					<input
						type='url'
						id='url'
						value={url}
						onChange={e => setUrl(e.target.value)}
						placeholder='https://youtube.com/watch?v=... or vimeo.com/... or tiktok.com/...'
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

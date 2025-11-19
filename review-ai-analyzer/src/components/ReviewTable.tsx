'use client'

import { useState } from 'react'

interface FeatureDetail {
	sentiment: string
	confidence: number
	relevant_text: string[]
}

interface AnalysisStats {
	[key: string]: {
		title: string
		stats: {
			label: string
			value: string | number
			trend?: 'up' | 'down' | 'neutral'
		}[]
		fullTranscription: string
		sentimentDetails: { [key: string]: FeatureDetail }
	}
}

interface AnalysisData {
	title: string
	stats: {
		label: string
		value: string | number
		trend?: 'up' | 'down' | 'neutral'
	}[]
	fullTranscription: string
	sentimentDetails: { [key: string]: FeatureDetail }
}

interface ReviewTableProps {
	analyses: AnalysisData[]
}

export default function ReviewTable({ analyses }: ReviewTableProps) {
	const [openItems, setOpenItems] = useState<Set<string>>(new Set())

	// Create analysis options from the provided analyses
	const analysisOptions = analyses.map((analysis, index) => ({
		value: `analysis-${index}`,
		label: analysis.title,
		icon: '🎯',
	}))

	// Create analysis data object from the provided analyses
	const analysisData: AnalysisStats = {}
	analyses.forEach((analysis, index) => {
		analysisData[`analysis-${index}`] = analysis
	})

	const toggleItem = (itemValue: string) => {
		const newOpenItems = new Set(openItems)
		if (newOpenItems.has(itemValue)) {
			newOpenItems.delete(itemValue)
		} else {
			newOpenItems.add(itemValue)
		}
		setOpenItems(newOpenItems)
	}

	const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
		switch (trend) {
			case 'up':
				return '📈'
			case 'down':
				return '📉'
			case 'neutral':
				return '➡️'
			default:
				return ''
		}
	}

	const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
		switch (trend) {
			case 'up':
				return 'text-green-600'
			case 'down':
				return 'text-red-600'
			case 'neutral':
				return 'text-gray-600'
			default:
				return 'text-gray-900'
		}
	}

	return (
		<div className='w-full max-w-md'>
			<div className='space-y-4'>
				<h2 className='text-xl font-semibold text-center mb-4'>Review Analysis</h2>

				{/* FAQ-style accordion */}
				<div className='space-y-2 '>
					{analysisOptions.map((option, index) => {
						const isOpen = openItems.has(option.value)
						const data = analysisData[option.value]
						// PRZYGOTOWANIE DANYCH SENTYMENTU
						const featureDetails = data ? data.sentimentDetails : {}

						return (
							<div key={option.value} className='border border-gray-200 rounded-lg'>
								<button
									onClick={() => toggleItem(option.value)}
									className='w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg'>
									<div className='flex items-center space-x-3'>
										<span className='text-lg'>{option.icon}</span>
										<span className='font-medium text-gray-900'>{option.label}</span>
									</div>
									<span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
								</button>
								{isOpen && data && (
									<div className='px-4 pb-4 border-t border-gray-200'>
										{/* Sekcja Statystyk/Sentymentu */}
										<div className='pt-3 space-y-4'>
											{data.stats?.map((stat, statIndex) => {
												// Spróbuj dopasować etykietę statystyki do szczegółów sentymentu
												const featureKey = stat.label.toLowerCase()
												const detail = featureDetails[featureKey]

												return (
													<div
														key={statIndex}
														className={`p-3 rounded-lg border-l-4 ${
															stat.trend === 'up'
																? 'border-green-500 bg-green-50'
																: stat.trend === 'down'
																? 'border-red-500 bg-red-50'
																: 'border-gray-300 bg-gray-50'
														}`}>
														<div className='flex justify-between items-center pb-2'>
															<p className='text-sm font-bold text-gray-800'>{stat.label}</p>
															<div className='flex items-center space-x-2'>
																<span className={`text-sm font-semibold ${getTrendColor(stat.trend)}`}>
																	{stat.value}
																</span>
																{stat.trend && (
																	<span className='text-sm' title={`Trend: ${stat.trend}`}>
																		{getTrendIcon(stat.trend)}
																	</span>
																)}
															</div>
														</div>

														{/* WYŚWIETLANIE FRAGMENTÓW TEKSTU */}
														{detail && detail.relevant_text && detail.relevant_text.length > 0 && (
															<div className='mt-2 border-t pt-2 border-gray-200'>
																<p className='text-xs font-medium text-gray-600 mb-1'>Fragmenty Sentymentu:</p>
																<ul className='list-disc list-inside text-xs text-gray-700 space-y-1 pl-4'>
																	{detail.relevant_text.map((text, textIndex) => (
																		<li key={textIndex}>{text}</li>
																	))}
																</ul>
															</div>
														)}
													</div>
												)
											})}
										</div>

										{/* Sekcja Pełnej Transkrypcji */}
										<div className='mt-6 pt-4 border-t border-gray-200'>
											<h4 className='text-md font-semibold text-gray-800 mb-2'>Pełna Transkrypcja Wideo</h4>
											<p className='text-sm text-gray-600 whitespace-pre-wrap max-h-60 overflow-y-auto p-4 bg-gray-100 rounded-lg shadow-inner'>
												{data.fullTranscription || 'Transkrypcja niedostępna.'}
											</p>
										</div>
									</div>
								)}
							</div>
						)
					})}
				</div>
				{analyses.length === 0 ? (
					<div className='text-center py-8 text-gray-500'>
						<p className='text-sm'>No analyses yet. Analyze a video to see results here.</p>
					</div>
				) : (
					<div className='text-center py-4 text-gray-500'>
						<p className='text-sm'>Click on any analysis to view detailed statistics</p>
					</div>
				)}
			</div>
		</div>
	)
}

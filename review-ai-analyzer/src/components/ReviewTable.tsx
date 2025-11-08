'use client'

import { useState } from 'react'

interface AnalysisStats {
	[key: string]: {
		title: string
		stats: {
			label: string
			value: string | number
			trend?: 'up' | 'down' | 'neutral'
		}[]
	}
}

interface AnalysisData {
	title: string
	stats: {
		label: string
		value: string | number
		trend?: 'up' | 'down' | 'neutral'
	}[]
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
					{analysisOptions.map(option => {
						const isOpen = openItems.has(option.value)
						const data = analysisData[option.value]

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
								{isOpen && (
									<div className='px-4 pb-4 border-t border-gray-200'>
										<div className='pt-3 space-y-2'>
											{data.stats.map((stat, index) => (
												<div key={index} className='flex justify-between items-center py-2'>
													<div className='flex-1'>
														<p className='text-sm font-medium text-gray-700'>{stat.label}</p>
													</div>
													<div className='flex items-center space-x-2'>
														<span className={`text-sm font-semibold ${getTrendColor(stat.trend)}`}>{stat.value}</span>
														{stat.trend && (
															<span className='text-sm' title={`Trend: ${stat.trend}`}>
																{getTrendIcon(stat.trend)}
															</span>
														)}
													</div>
												</div>
											))}
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

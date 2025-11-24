'use client'

import { useEffect, useState } from 'react'
import UrlProcessor from '@/components/UrlProcessor'
import ReviewTable from '@/components/ReviewTable'
import VideoUpload from './VideoUpload'

interface AnalysisData {
	title: string
	stats: {
		label: string
		value: string | number
		trend?: 'up' | 'down' | 'neutral'
	}[]
	fullTranscription?: string
	sentimentDetails?: any
}

interface HomeClientProps {
	userId?: string | null
	initialAnalyses?: AnalysisData[]
}

export default function HomeClient({ userId, initialAnalyses = [] }: HomeClientProps) {
	const [analyses, setAnalyses] = useState<AnalysisData[]>(initialAnalyses)

	useEffect(() => {
		setAnalyses(initialAnalyses)
	}, [initialAnalyses])

	const handleAnalysisComplete = (analysisData: AnalysisData) => {
		setAnalyses(prev => [...prev, analysisData])
	}

	return (
		<div className='w-full h-full flex flex-col md:flex-row gap-0 bg-gray-50 min-h-screen'>
			     
			<div className='h-full flex flex-col items-center justify-start w-full md:w-1/2 p-6 md:p-10'>
				        <h2 className='text-2xl font-bold text-gray-800 mb-8'>Video Input & Processing</h2>
				        <UrlProcessor onAnalysisComplete={handleAnalysisComplete} userId={userId} />       
				<div className='w-full h-px bg-gray-300 my-8'></div>
				        <VideoUpload onAnalysisComplete={handleAnalysisComplete} />     
			</div>
			      <div className='hidden md:block w-px bg-gray-300 h-auto my-6'></div>           
			<div className='block md:hidden w-full h-px bg-gray-300 my-4'></div>     
			<div className='h-full flex flex-col items-center justify-start w-full md:w-1/2 p-6 md:p-10 bg-white shadow-inner'>
				        <ReviewTable analyses={analyses} />     
			</div>
			   
		</div>
	)
}

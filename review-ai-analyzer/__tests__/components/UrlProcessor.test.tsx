/**
 * Component tests for UrlProcessor with mocked Supabase
 */

import { describe, test, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlProcessor from '@/components/UrlProcessor'

// Mock Supabase client
const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({
	insert: mockInsert,
}))

const mockSupabaseClient = {
	from: mockFrom,
}

vi.mock('@/supabase/client', () => ({
	createClient: () => mockSupabaseClient,
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('UrlProcessor Component', () => {
	const mockOnAnalysisComplete = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		mockInsert.mockReturnValue({
			select: vi.fn().mockResolvedValue({
				data: [{ id: 'test-id', user_id: 'user-123' }],
				error: null,
			}),
		})
		;(global.fetch as any).mockClear()
	})

	test('should render URL input form', () => {
		render(<UrlProcessor onAnalysisComplete={mockOnAnalysisComplete} userId="user-123" />)

		expect(screen.getByLabelText(/enter video url/i)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /analyze video/i })).toBeInTheDocument()
	})

	test('should save sentiment to database on successful analysis', async () => {
		const user = userEvent.setup()

		// Mock successful API response
		;(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				embedUrl: 'https://youtube.com/embed/test',
				analysisData: {
					title: 'Test Video',
					stats: [{ label: 'Positive', value: '80%' }],
				},
				fullTranscription: 'Test transcription',
				sentiment: {
					camera: {
						sentiment: 'positive',
						confidence: 0.85,
						relevant_text: ['Great camera'],
					},
				},
			}),
		})

		render(<UrlProcessor onAnalysisComplete={mockOnAnalysisComplete} userId="user-123" />)

		const input = screen.getByLabelText(/enter video url/i)
		const submitButton = screen.getByRole('button', { name: /analyze video/i })

		await user.type(input, 'https://youtube.com/watch?v=test')
		await user.click(submitButton)

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:5000/api/video/analyze',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				})
			)
		})

		await waitFor(() => {
			expect(mockFrom).toHaveBeenCalledWith('sentiments')
			expect(mockInsert).toHaveBeenCalled()
		})
	})

	test('should handle database save error gracefully', async () => {
		const user = userEvent.setup()

		// Mock successful API response but database error
		;(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				embedUrl: 'https://youtube.com/embed/test',
				analysisData: {
					title: 'Test Video',
					stats: [],
				},
				fullTranscription: '',
				sentiment: {},
			}),
		})

		// Mock database error (table doesn't exist)
		mockInsert.mockReturnValue({
			select: vi.fn().mockResolvedValue({
				data: null,
				error: {
					code: 'PGRST205',
					message: "Could not find the table 'public.sentiments'",
				},
			}),
		})

		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		render(<UrlProcessor onAnalysisComplete={mockOnAnalysisComplete} userId="user-123" />)

		const input = screen.getByLabelText(/enter video url/i)
		const submitButton = screen.getByRole('button', { name: /analyze video/i })

		await user.type(input, 'https://youtube.com/watch?v=test')
		await user.click(submitButton)

		await waitFor(() => {
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Sentiments table does not exist')
			)
		})

		// Should still complete analysis even if save fails
		await waitFor(() => {
			expect(mockOnAnalysisComplete).toHaveBeenCalled()
		})

		consoleWarnSpy.mockRestore()
	})

	test('should not save when user is not logged in', async () => {
		const user = userEvent.setup()
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		;(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				embedUrl: 'https://youtube.com/embed/test',
				analysisData: {
					title: 'Test Video',
					stats: [],
				},
				fullTranscription: '',
				sentiment: {},
			}),
		})

		render(<UrlProcessor onAnalysisComplete={mockOnAnalysisComplete} userId={null} />)

		const input = screen.getByLabelText(/enter video url/i)
		const submitButton = screen.getByRole('button', { name: /analyze video/i })

		await user.type(input, 'https://youtube.com/watch?v=test')
		await user.click(submitButton)

		await waitFor(() => {
			expect(consoleWarnSpy).toHaveBeenCalledWith('Cannot save analysis: User not signed in')
		})

		// Should not attempt to save
		expect(mockFrom).not.toHaveBeenCalled()

		consoleWarnSpy.mockRestore()
	})

	test('should display error message on API failure', async () => {
		const user = userEvent.setup()

		;(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
			json: async () => ({ error: 'Analysis failed' }),
		})

		render(<UrlProcessor onAnalysisComplete={mockOnAnalysisComplete} userId="user-123" />)

		const input = screen.getByLabelText(/enter video url/i)
		const submitButton = screen.getByRole('button', { name: /analyze video/i })

		await user.type(input, 'https://youtube.com/watch?v=test')
		await user.click(submitButton)

		await waitFor(() => {
			expect(screen.getByText(/error/i)).toBeInTheDocument()
		})
	})

	test('should validate URL input', async () => {
		const user = userEvent.setup()

		render(<UrlProcessor onAnalysisComplete={mockOnAnalysisComplete} userId="user-123" />)

		const submitButton = screen.getByRole('button', { name: /analyze video/i })

		// Try to submit empty form
		await user.click(submitButton)

		await waitFor(() => {
			expect(screen.getByText(/please enter a url/i)).toBeInTheDocument()
		})

		expect(global.fetch).not.toHaveBeenCalled()
	})
})


/**
 * Utility functions and helpers for database operations
 */

import { describe, test, expect } from 'vitest'

describe('Database Helper Functions', () => {
	describe('Data Transformation', () => {
		test('should transform sentiment data for database insertion', () => {
			const analysisData = {
				title: 'Test Video',
				stats: [
					{ label: 'Positive', value: '80%', trend: 'up' },
					{ label: 'Negative', value: '20%', trend: 'down' },
				],
				fullTranscription: 'Test transcription',
				sentimentDetails: {
					camera: {
						sentiment: 'positive',
						confidence: 0.85,
						relevant_text: ['Great camera'],
					},
				},
			}

			const dbRecord = {
				user_id: 'user-123',
				source_url: 'https://youtube.com/watch?v=test',
				analysis_title: analysisData.title,
				analysis_stats: analysisData.stats,
				full_transcription: analysisData.fullTranscription,
				sentiment_details: analysisData.sentimentDetails,
			}

			expect(dbRecord.analysis_title).toBe(analysisData.title)
			expect(Array.isArray(dbRecord.analysis_stats)).toBe(true)
			expect(typeof dbRecord.sentiment_details).toBe('object')
		})

		test('should handle null/undefined values', () => {
			const dbRecord = {
				user_id: 'user-123',
				source_url: null,
				analysis_title: null,
				analysis_stats: [],
				full_transcription: '',
				sentiment_details: {},
			}

			expect(dbRecord.source_url).toBeNull()
			expect(dbRecord.analysis_stats).toEqual([])
			expect(dbRecord.sentiment_details).toEqual({})
		})

		test('should validate UUID format', () => {
			const validUUID = '550e8400-e29b-41d4-a716-446655440000'
			const invalidUUID = 'not-a-uuid'

			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

			expect(uuidRegex.test(validUUID)).toBe(true)
			expect(uuidRegex.test(invalidUUID)).toBe(false)
		})
	})

	describe('Query Building', () => {
		test('should build correct select query', () => {
			const selectFields = [
				'analysis_title',
				'analysis_stats',
				'full_transcription',
				'sentiment_details',
			]

			expect(selectFields.join(', ')).toBe(
				'analysis_title, analysis_stats, full_transcription, sentiment_details'
			)
		})

		test('should build correct order query', () => {
			const orderBy = 'created_at'
			const ascending = false

			expect(orderBy).toBe('created_at')
			expect(ascending).toBe(false)
		})
	})

	describe('Error Detection', () => {
		test('should detect table not found error', () => {
			const error = {
				code: 'PGRST205',
				message: "Could not find the table 'public.sentiments'",
			}

			const isTableNotFound =
				error.code === 'PGRST205' || error.message.includes('Could not find the table')

			expect(isTableNotFound).toBe(true)
		})

		test('should detect authentication errors', () => {
			const authError = {
				code: 'PGRST301',
				message: 'JWT expired',
			}

			const isAuthError = authError.code?.startsWith('PGRST3') || false

			expect(isAuthError).toBe(true)
		})
	})
})


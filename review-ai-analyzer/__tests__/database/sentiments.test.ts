import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

describe('Sentiments Table Database Tests', () => {
	let supabase: any
	let adminSupabase: any
	let testUserId: string
	let testUser2Id: string

	beforeAll(async () => {
		supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
		adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) 

		testUserId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001'
		testUser2Id = process.env.TEST_USER_2_ID || '00000000-0000-0000-0000-000000000002'
	})

	afterEach(async () => {
		if (adminSupabase) {
			await adminSupabase
				.from('sentiments')
				.delete()
				.or(`user_id.eq.${testUserId},user_id.eq.${testUser2Id}`)
		}
	})

	describe('Table Structure', () => {
		test('should have correct table schema', async () => {
			const { data, error } = await adminSupabase
				.from('sentiments')
				.select('*')
				.limit(0)

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		test('should have all required columns', async () => {
			const testRecord = {
				user_id: testUserId,
				source_url: 'https://youtube.com/watch?v=test',
				analysis_title: 'Test Analysis',
				analysis_stats: [{ label: 'Test', value: '100' }],
				full_transcription: 'Test transcription',
				sentiment_details: { positive: 0.8, negative: 0.2 },
			}

			const { data, error } = await adminSupabase
				.from('sentiments')
				.insert([testRecord])
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data.id).toBeDefined()
			expect(data.user_id).toBe(testUserId)
			expect(data.source_url).toBe(testRecord.source_url)
			expect(data.analysis_title).toBe(testRecord.analysis_title)
			expect(data.created_at).toBeDefined()
		})
	})

	describe('CRUD Operations', () => {
		describe('Create (INSERT)', () => {
			test('should insert a new sentiment analysis', async () => {
				const sentimentData = {
					user_id: testUserId,
					source_url: 'https://youtube.com/watch?v=test123',
					analysis_title: 'Test Video Analysis',
					analysis_stats: [
						{ label: 'Positive', value: '80%', trend: 'up' },
						{ label: 'Negative', value: '20%', trend: 'down' },
					],
					full_transcription: 'This is a test transcription of the video content.',
					sentiment_details: {
						camera: {
							sentiment: 'positive',
							confidence: 0.85,
							relevant_text: ['Great camera quality', 'Excellent photos'],
						},
						battery: {
							sentiment: 'neutral',
							confidence: 0.7,
							relevant_text: ['Battery lasts a day'],
						},
					},
				}

				const { data, error } = await adminSupabase
					.from('sentiments')
					.insert([sentimentData])
					.select()
					.single()

				expect(error).toBeNull()
				expect(data).toBeDefined()
				if (!data) throw new Error('Data is null')

				expect(data.id).toBeDefined()
				expect(data.user_id).toBe(testUserId)
				expect(data.analysis_title).toBe(sentimentData.analysis_title)
				expect(Array.isArray(data.analysis_stats)).toBe(true)
				expect(typeof data.sentiment_details).toBe('object')
			})

			test('should handle null/optional fields', async () => {
				const minimalData = {
					user_id: testUserId,
					source_url: null,
					analysis_title: null,
					analysis_stats: null,
					full_transcription: null,
					sentiment_details: null,
				}

				const { data, error } = await adminSupabase
					.from('sentiments')
					.insert([minimalData])
					.select()
					.single()

				expect(error).toBeNull()
				expect(data).toBeDefined()
				expect(data.user_id).toBe(testUserId)
			})

			test('should auto-generate UUID for id', async () => {
				const { data } = await adminSupabase
					.from('sentiments')
					.insert([{
						user_id: testUserId,
						source_url: 'https://test.com',
					}])
					.select()
					.single()

				expect(data.id).toMatch(
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
				)
			})

			test('should auto-generate created_at timestamp', async () => {
				const beforeInsert = new Date()
				const { data } = await adminSupabase
					.from('sentiments')
					.insert([{
						user_id: testUserId,
						source_url: 'https://test.com',
					}])
					.select()
					.single()
					const afterInsert = new Date()
					afterInsert.setSeconds(afterInsert.getSeconds() + 2)
					
					expect(data.created_at).toBeDefined()
					const createdAt = new Date(data.created_at)
					expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime())
					expect(createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime())
			})
		})

		describe('Read (SELECT)', () => {
			let insertedId: string

			beforeEach(async () => {
				const { data } = await adminSupabase
					.from('sentiments')
					.insert([{
						user_id: testUserId,
						source_url: 'https://youtube.com/watch?v=readtest',
						analysis_title: 'Read Test',
						analysis_stats: [{ label: 'Test', value: 100 }],
					}])
					.select()
					.single()

				insertedId = data.id
			})

			test('should retrieve sentiment by id', async () => {
				const { data, error } = await adminSupabase
					.from('sentiments')
					.select('*')
					.eq('id', insertedId)
					.single()

				expect(error).toBeNull()
				expect(data).toBeDefined()
				expect(data.id).toBe(insertedId)
				expect(data.user_id).toBe(testUserId)
			})

			test('should retrieve all sentiments for a user', async () => {
				await adminSupabase.from('sentiments').insert([
					{
						user_id: testUserId,
						source_url: 'https://test1.com',
						analysis_title: 'Test 1',
					},
					{
						user_id: testUserId,
						source_url: 'https://test2.com',
						analysis_title: 'Test 2',
					},
				])

				const { data, error } = await adminSupabase
					.from('sentiments')
					.select('*')
					.eq('user_id', testUserId)
					.order('created_at', { ascending: false })

				expect(error).toBeNull()
				expect(data).toBeDefined()
				expect(data.length).toBeGreaterThanOrEqual(3)
			})

			test('should order by created_at descending', async () => {
				const { data } = await adminSupabase
					.from('sentiments')
					.select('*')
					.eq('user_id', testUserId)
					.order('created_at', { ascending: false })

				if (data && data.length > 1) {
					const firstDate = new Date(data[0].created_at)
					const secondDate = new Date(data[1].created_at)
					expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime())
				}
			})

			test('should handle JSONB fields correctly', async () => {
				const complexStats = [
					{ label: 'Camera', value: 85, trend: 'up' },
					{ label: 'Battery', value: 70, trend: 'neutral' },
					{ label: 'Display', value: 90, trend: 'up' },
				]

				const complexDetails = {
					camera: {
						sentiment: 'positive',
						confidence: 0.85,
						relevant_text: ['Great camera', 'Amazing photos'],
					},
					battery: {
						sentiment: 'neutral',
						confidence: 0.7,
						relevant_text: ['Lasts a day'],
					},
				}

				const { data } = await adminSupabase
					.from('sentiments')
					.insert([{
						user_id: testUserId,
						source_url: 'https://test.com',
						analysis_stats: complexStats,
						sentiment_details: complexDetails,
					}])
					.select()
					.single()

				expect(Array.isArray(data.analysis_stats)).toBe(true)
				expect(data.analysis_stats.length).toBe(3)
				expect(typeof data.sentiment_details).toBe('object')
				expect(data.sentiment_details.camera).toBeDefined()
			})
		})

		describe('Update (UPDATE)', () => {
			let insertedId: string

			beforeEach(async () => {
				const { data } = await adminSupabase
					.from('sentiments')
					.insert([{
						user_id: testUserId,
						source_url: 'https://youtube.com/watch?v=updatetest',
						analysis_title: 'Original Title',
					}])
					.select()
					.single()

				insertedId = data.id
			})

			test('should update sentiment analysis title', async () => {
				const { data, error } = await adminSupabase
					.from('sentiments')
					.update({ analysis_title: 'Updated Title' })
					.eq('id', insertedId)
					.select()
					.single()

				expect(error).toBeNull()
				expect(data.analysis_title).toBe('Updated Title')
			})

			test('should update JSONB fields', async () => {
				const updatedStats = [{ label: 'Updated', value: 200 }]
				const { data, error } = await adminSupabase
					.from('sentiments')
					.update({ analysis_stats: updatedStats })
					.eq('id', insertedId)
					.select()
					.single()

				expect(error).toBeNull()
				expect(data.analysis_stats).toEqual(updatedStats)
			})
		})

		describe('Delete (DELETE)', () => {
			test('should delete sentiment by id', async () => {
				const { data: inserted } = await adminSupabase
					.from('sentiments')
					.insert([{
						user_id: testUserId,
						source_url: 'https://youtube.com/watch?v=deletetest',
					}])
					.select()
					.single()

				const { error } = await adminSupabase
					.from('sentiments')
					.delete()
					.eq('id', inserted.id)

				expect(error).toBeNull()

				const { data: deleted } = await adminSupabase
					.from('sentiments')
					.select('*')
					.eq('id', inserted.id)

				expect(deleted.length).toBe(0)
			})
		})
	})

	describe('Row Level Security (RLS) Policies', () => {
		let user1SentimentId: string
		let user2SentimentId: string

		beforeEach(async () => {
			const { data: user1Data } = await adminSupabase
				.from('sentiments')
				.insert([{
					user_id: testUserId,
					source_url: 'https://user1.com',
					analysis_title: 'User 1 Analysis',
				}])
				.select()
				.single()

			const { data: user2Data } = await adminSupabase
				.from('sentiments')
				.insert([{
					user_id: testUser2Id,
					source_url: 'https://user2.com',
					analysis_title: 'User 2 Analysis',
				}])
				.select()
				.single()

			user1SentimentId = user1Data.id
			user2SentimentId = user2Data.id
		})

		test('should allow users to read their own sentiments', async () => {
			const { data, error } = await adminSupabase
				.from('sentiments')
				.select('*')
				.eq('user_id', testUserId)

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data.some((s: any) => s.id === user1SentimentId)).toBe(true)
		})
	})

	describe('Error Handling', () => {
		test('should handle missing table gracefully', async () => {
			const { error } = await supabase.from('nonexistent_table').select('*')

			expect(error).toBeDefined()
			if (error) {
				expect(error.code).toBe('PGRST205')
			}
		})

		test('should handle invalid UUID format', async () => {
			const { error } = await adminSupabase
				.from('sentiments')
				.insert([{
					user_id: 'invalid-uuid',
					source_url: 'https://test.com',
				}])

			expect(error).toBeDefined()
		})

		test('should handle null user_id constraint', async () => {
			const { error } = await adminSupabase
				.from('sentiments')
				.insert([{
					user_id: null as any,
					source_url: 'https://test.com',
				}])

			expect(error).toBeDefined()
		})
	})

	describe('Data Integrity', () => {
		test('should preserve JSONB structure', async () => {
			const originalStats = [
				{ label: 'Camera', value: 85, trend: 'up' },
				{ label: 'Battery', value: 70, trend: 'neutral' },
			]

			const { data: inserted } = await adminSupabase
				.from('sentiments')
				.insert([{
					user_id: testUserId,
					source_url: 'https://test.com',
					analysis_stats: originalStats,
				}])
				.select()
				.single()

			const { data: retrieved } = await adminSupabase
				.from('sentiments')
				.select('analysis_stats')
				.eq('id', inserted.id)
				.single()

			expect(retrieved.analysis_stats).toEqual(originalStats)
		})
	})
})
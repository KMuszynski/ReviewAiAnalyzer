/**
 * Test setup file
 * Configures testing environment and global mocks
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
	}),
	usePathname: () => '/',
	useSearchParams: () => new URLSearchParams(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
})

// Suppress console errors in tests (optional)
const originalError = console.error
beforeAll(() => {
	console.error = (...args: any[]) => {
		if (
			typeof args[0] === 'string' &&
			(args[0].includes('Warning:') || args[0].includes('Error:'))
		) {
			return
		}
		originalError.call(console, ...args)
	}
})

afterAll(() => {
	console.error = originalError
})


import * as Sentry from '@sentry/node'
import { initSentry, captureException, captureMessage, setSentryUser, clearSentryUser } from '../sentry'

jest.mock('@sentry/node')

describe('Sentry integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.SENTRY_DSN
    process.env.NODE_ENV = 'test'
  })

  describe('initSentry', () => {
    it('logs warning when SENTRY_DSN is not set', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      initSentry()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('SENTRY_DSN not set'))
      expect(Sentry.init).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('initializes Sentry when DSN is set', () => {
      process.env.SENTRY_DSN = 'https://example@sentry.io/123456'
      const logSpy = jest.spyOn(console, 'log').mockImplementation()
      initSentry()
      expect(Sentry.init).toHaveBeenCalled()
      logSpy.mockRestore()
    })

    it('configures tracesSampleRate based on environment', () => {
      process.env.SENTRY_DSN = 'https://example@sentry.io/123456'
      process.env.NODE_ENV = 'production'
      initSentry()
      const callArgs = (Sentry.init as jest.Mock).mock.calls[0][0]
      expect(callArgs.tracesSampleRate).toBe(0.1)

      jest.clearAllMocks()
      process.env.NODE_ENV = 'development'
      initSentry()
      const callArgs2 = (Sentry.init as jest.Mock).mock.calls[0][0]
      expect(callArgs2.tracesSampleRate).toBe(1.0)
    })
  })

  describe('captureException', () => {
    it('captures an Error with level and tags', () => {
      const error = new Error('Test error')
      captureException(error, {
        level: 'error',
        tags: { component: 'test' },
      })

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        level: 'error',
        tags: { component: 'test' },
      })
    })

    it('defaults to error level if not specified', () => {
      const error = new Error('Test error')
      captureException(error)

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        level: 'error',
        tags: undefined,
      })
    })

    it('captures non-Error objects', () => {
      captureException('string error')
      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('captureMessage', () => {
    it('captures a message with level and tags', () => {
      captureMessage('Test message', {
        level: 'warning',
        tags: { source: 'test' },
      })

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'warning')
    })

    it('defaults to info level if not specified', () => {
      captureMessage('Test message')
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'info')
    })
  })

  describe('setSentryUser', () => {
    it('sets user context', () => {
      setSentryUser('user123')
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user123' })
    })
  })

  describe('clearSentryUser', () => {
    it('clears user context', () => {
      clearSentryUser()
      expect(Sentry.setUser).toHaveBeenCalledWith(null)
    })
  })
})

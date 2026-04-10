import * as Sentry from '@sentry/node'

export function initSentry() {
  const dsn = process.env.SENTRY_DSN
  const environment = process.env.NODE_ENV || 'development'
  const release = process.env.SENTRY_RELEASE || 'unknown'

  if (!dsn) {
    console.warn('SENTRY_DSN not set; error reporting disabled')
    return
  }

  Sentry.init({
    dsn,
    environment,
    release,
    // Capture unhandled exceptions and rejections (enabled by default)
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Capture breadcrumbs
    maxBreadcrumbs: 50,
    // Attach stacks to all messages by default
    attachStacktrace: true,
  })

  console.log(`Sentry initialized (${environment})`)
}

/**
 * Capture a Fastify error and send to Sentry.
 * Includes request context (method, URL, headers) automatically.
 */
export function captureException(
  error: unknown,
  context?: {
    tags?: Record<string, string>
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  }
) {
  if (error instanceof Error) {
    Sentry.captureException(error, {
      level: context?.level || 'error',
      tags: context?.tags,
    })
  } else {
    Sentry.captureException(error, {
      level: context?.level || 'error',
      tags: context?.tags,
    })
  }
}

/**
 * Capture a message and send to Sentry.
 */
export function captureMessage(
  message: string,
  context?: {
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
    tags?: Record<string, string>
  }
) {
  Sentry.captureMessage(message, context?.level || 'info')
}

/**
 * Set user context for Sentry.
 */
export function setSentryUser(userId: string) {
  Sentry.setUser({ id: userId })
}

/**
 * Clear user context.
 */
export function clearSentryUser() {
  Sentry.setUser(null)
}

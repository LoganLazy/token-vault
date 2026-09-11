/**
 * Error Handler Middleware
 */
export function errorHandler(err, req, res, _next) {
  console.error('Error:', err)

  // Default error
  let statusCode = err.statusCode || 500
  let message = statusCode >= 500 ? 'Internal server error' : err.message

  // Database errors
  if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
    statusCode = 409
    message = 'Duplicate entry'
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = err.message
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

/**
 * Not Found Handler
 */
export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' })
}

/**
 * Async Route Handler Wrapper
 * Catches errors in async routes and passes to error handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

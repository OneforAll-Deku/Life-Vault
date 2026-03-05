/**
 * Custom Error class for API errors
 */
export class APIError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found middleware
 */
export const notFound = (req, res, next) => {
  const error = new APIError(`Route not found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global Error Handler
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging - ALWAYS log stack for 500s in console to help with Render logs
  console.error('❌ API Error:', {
    message: err.message,
    statusCode: error.statusCode || 500,
    path: req.path,
    method: req.method,
    stack: err.stack // Log stack to console even in prod, but don't send to client
  });

  // Bad ObjectId (legacy handling)
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new APIError(message, 404);
  }

  // Duplicate key (legacy handling)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new APIError(message, 400);
  }

  // Validation error (legacy handling)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    error = new APIError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new APIError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new APIError(message, 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  });
};

export default { APIError, notFound, errorHandler };
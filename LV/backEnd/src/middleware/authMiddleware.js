import jwt from 'jsonwebtoken';
// import User from '../models/User.js'; // REMOVED MONGODB DEPENDENCY

/**
 * Standard authentication middleware
 * Requires valid JWT token - Stateless (No DB check)
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized - No token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // MOCK USER OBJECT FROM JWT (NO DB CALL)
      req.user = {
        _id: decoded.id, // Support both _id and id
        id: decoded.id,
        email: decoded.email || 'user@example.com',
        name: decoded.name || 'User',
        aptosAddress: decoded.aptosAddress || '0x',
        userType: decoded.userType || 'user'
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized - Invalid token'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        _id: decoded.id,
        id: decoded.id,
        email: decoded.email || 'user@example.com',
        aptosAddress: decoded.aptosAddress,
        userType: decoded.userType || 'user'
      };
    } catch (error) {
      req.user = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.userType}' is not authorized to access this route`
      });
    }

    next();
  };
};

/**
 * Verify user owns resource middleware
 */
export const verifyOwnership = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    const currentUserId = req.user.id || req.user._id;

    if (resourceUserId && resourceUserId !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }

    next();
  };
};

export default { protect, optionalAuth, authorize, verifyOwnership };

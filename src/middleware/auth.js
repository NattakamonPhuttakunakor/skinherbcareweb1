import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token using secret if available, otherwise decode without verification (insecure)
      const secret = process.env.JWT_SECRET;
      let decoded;

      if (secret) {
        decoded = jwt.verify(token, secret);
      } else {
        console.warn('⚠️ JWT_SECRET not set — decoding token without verification (insecure)');
        decoded = jwt.decode(token);
      }

      if (!decoded || !decoded.id) {
        return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
      }

      // Get user from the token (excluding the password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
         return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Grant access to admin role
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  }
};

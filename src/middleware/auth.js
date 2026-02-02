import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
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

      // If DB connected, fetch user; otherwise, use token payload as transient user
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
           return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
        }
      } else {
        req.user = { _id: decoded.id, role: decoded.role || 'admin' };
        console.warn('⚠️ MongoDB not connected — using token payload as user for this request');
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

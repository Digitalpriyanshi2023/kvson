import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-local-dev-jwt-secret-key-12345';

/**
 * Generates a signed JWT token containing user metadata.
 * @param {object} user 
 * @returns {string}
 */
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Authenticates a request by verifying the JWT in the Authorization header.
 * Writes 401 if verification fails and returns null.
 * @param {object} req 
 * @param {object} res 
 * @returns {object|null} The decoded token payload or null
 */
export function authenticate(req, res) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Authorization header missing or malformed.' });
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication session.' });
    return null;
  }
}

/**
 * Authenticates a request and verifies the user is an admin.
 * Writes 403 or 401 if verification fails and returns null.
 * @param {object} req 
 * @param {object} res 
 * @returns {object|null} The decoded token payload or null
 */
export function authenticateAdmin(req, res) {
  const user = authenticate(req, res);
  if (!user) return null;
  
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Administrative clearance required.' });
    return null;
  }
  
  return user;
}

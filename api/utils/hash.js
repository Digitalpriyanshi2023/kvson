import crypto from 'crypto';

const ITERATIONS = 10000;
const KEY_LEN = 64;
const DIGEST = 'sha512';

/**
 * Hashes a plain text password using Node's native PBKDF2 algorithm.
 * Returns a formatted "salt:hash" string.
 * @param {string} password 
 * @returns {string}
 */
export function hashPassword(password) {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored hashed password.
 * @param {string} password 
 * @param {string} storedHash 
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    // If the stored password isn't hashed, we check plain-text as a fallback for old users
    // This allows transition of existing database rows.
    return password === storedHash;
  }
  const [salt, originalHash] = parts;
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return hash === originalHash;
}

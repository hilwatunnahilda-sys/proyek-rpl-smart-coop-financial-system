/**
 * Cryptography & Security Service
 * Implements PBKDF2-SHA256 password hashing with unique salts using standard Web Crypto API
 * Generates cryptographically secure session tokens
 */

export class CryptoService {
  /**
   * Generates a cryptographically secure random hexadecimal salt
   * @param {number} byteLength - Number of bytes (default: 16 bytes = 128-bit salt)
   * @returns {string} Hex string representation of the salt
   */
  static generateSalt(byteLength = 16) {
    const saltBytes = new Uint8Array(byteLength);
    const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : (typeof window !== 'undefined' ? window.crypto : null);
    if (!cryptoObj) throw new Error('Web Crypto API not available');
    cryptoObj.getRandomValues(saltBytes);
    return Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hashes a plaintext password using PBKDF2 with SHA-256 and 100,000 iterations
   * @param {string} plainPassword - User plaintext password
   * @param {string|null} saltHex - Existing salt or null to generate a new salt
   * @returns {Promise<{hash: string, salt: string}>}
   */
  static async hashPassword(plainPassword, saltHex = null) {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    const salt = saltHex || this.generateSalt(16);
    const enc = new TextEncoder();
    const passwordBuffer = enc.encode(plainPassword);
    const saltBuffer = new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : (typeof window !== 'undefined' ? window.crypto : null);
    if (!cryptoObj || !cryptoObj.subtle) throw new Error('Web Crypto subtle API not available');

    const keyMaterial = await cryptoObj.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedBits = await cryptoObj.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 256 bits = 32 bytes
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      hash: hashHex,
      salt: salt
    };
  }

  /**
   * Verifies if a plaintext password matches the stored PBKDF2 hash and salt
   * @param {string} plainPassword - Plaintext password input
   * @param {string} storedHash - Stored hexadecimal hash
   * @param {string} storedSalt - Stored hexadecimal salt
   * @returns {Promise<boolean>} True if password matches, false otherwise
   */
  static async verifyPassword(plainPassword, storedHash, storedSalt) {
    if (!plainPassword || !storedHash || !storedSalt) {
      return false;
    }

    try {
      const computed = await this.hashPassword(plainPassword, storedSalt);
      return computed.hash === storedHash;
    } catch (e) {
      console.error('[CryptoService] Password verification error:', e);
      return false;
    }
  }

  /**
   * Generates a cryptographically secure random session token
   * @returns {string} e.g. "ikmi_tok_9f8a3c2b1e4d5a6b7c8d9e0f1a2b3c4d"
   */
  static generateSessionToken() {
    const randomBytes = new Uint8Array(24);
    const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : (typeof window !== 'undefined' ? window.crypto : null);
    if (!cryptoObj) throw new Error('Web Crypto API not available');
    cryptoObj.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `ikmi_tok_${hex}`;
  }

  /**
   * Sanitizes and validates user email format
   * @param {string} email
   * @returns {string} Trimmed, lowercase email
   */
  static sanitizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  /**
   * Validates email format with RFC 5322 regex
   * @param {string} email
   * @returns {boolean}
   */
  static isValidEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  }

  /**
   * Validates minimum password strength
   * @param {string} password
   * @returns {{valid: boolean, message: string}}
   */
  static validatePasswordStrength(password) {
    if (!password || password.length < 6) {
      return { valid: false, message: 'Password minimal 6 karakter' };
    }
    return { valid: true, message: 'Password valid' };
  }
}

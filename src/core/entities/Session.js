/**
 * Session Domain Entity
 * Exactly matches database schema: token, user_id, created_at, expires_at, is_revoked
 */

export class SessionEntity {
  constructor({
    token,
    user_id,
    created_at = new Date().toISOString(),
    expires_at = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours default expiry
    is_revoked = false
  }) {
    this.token = token;
    this.user_id = user_id;
    this.created_at = created_at;
    this.expires_at = expires_at;
    this.is_revoked = is_revoked;
  }

  isExpired() {
    return new Date() > new Date(this.expires_at);
  }

  isValid() {
    return !this.is_revoked && !this.isExpired();
  }

  revoke() {
    this.is_revoked = true;
  }

  toJSON() {
    return {
      token: this.token,
      user_id: this.user_id,
      created_at: this.created_at,
      expires_at: this.expires_at,
      is_revoked: this.is_revoked
    };
  }
}

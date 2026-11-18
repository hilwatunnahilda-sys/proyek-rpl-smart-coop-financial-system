/**
 * User / Account Domain Entity
 * Exactly matches database schema: id, name, email, password_hash, salt, role, status, created_at, updated_at
 */

import { ROLES, USER_STATUS } from '../../config/constants.js';

export class UserEntity {
  constructor({
    id,
    name,
    email,
    password_hash,
    salt,
    role = ROLES.MEMBER,
    status = USER_STATUS.ACTIVE,
    created_at = new Date().toISOString(),
    updated_at = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.email = email ? email.toLowerCase().trim() : '';
    this.password_hash = password_hash;
    this.salt = salt;
    this.role = role.toUpperCase();
    this.status = status.toUpperCase();
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  isActive() {
    return this.status === USER_STATUS.ACTIVE;
  }

  isAdmin() {
    return this.role === ROLES.ADMIN;
  }

  isChairman() {
    return this.role === ROLES.CHAIRMAN;
  }

  isMember() {
    return this.role === ROLES.MEMBER;
  }

  /**
   * Sanitized JSON output excluding password hash and salt
   */
  toSafeJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Full database row record
   */
  toDatabaseRecord() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      password_hash: this.password_hash,
      salt: this.salt,
      role: this.role,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

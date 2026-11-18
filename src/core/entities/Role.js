/**
 * Role Domain Entity & Hierarchy
 */

import { ROLES } from '../../config/constants.js';

export { ROLES };

export class RoleEntity {
  constructor({ code, name, description }) {
    this.code = code.toUpperCase();
    this.name = name;
    this.description = description;
  }

  isAdmin() {
    return this.code === ROLES.ADMIN;
  }

  isChairman() {
    return this.code === ROLES.CHAIRMAN;
  }

  isMember() {
    return this.code === ROLES.MEMBER;
  }
}

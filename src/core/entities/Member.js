/**
 * Member Domain Entity
 * Exactly matches database schema: id, member_number, user_id, full_name, identity_number, member_type, phone, address, join_date, status, created_at, updated_at
 */

import { MEMBER_TYPES, MEMBER_STATUS } from '../../config/constants.js';

export class MemberEntity {
  constructor({
    id,
    member_number,
    user_id,
    full_name,
    identity_number = '',
    member_type = MEMBER_TYPES.MAHASISWA,
    phone = '',
    address = '',
    join_date = new Date().toISOString().split('T')[0],
    status = MEMBER_STATUS.ACTIVE,
    created_at = new Date().toISOString(),
    updated_at = new Date().toISOString()
  }) {
    this.id = id;
    this.member_number = member_number;
    this.user_id = user_id;
    this.full_name = full_name;
    this.identity_number = identity_number;
    this.member_type = member_type.toUpperCase();
    this.phone = phone;
    this.address = address;
    this.join_date = join_date;
    this.status = status.toUpperCase();
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  isDosen() {
    return this.member_type === MEMBER_TYPES.DOSEN;
  }

  isMahasiswa() {
    return this.member_type === MEMBER_TYPES.MAHASISWA;
  }

  isStaf() {
    return this.member_type === MEMBER_TYPES.STAF;
  }

  isActive() {
    return this.status === MEMBER_STATUS.ACTIVE;
  }

  toJSON() {
    return {
      id: this.id,
      member_number: this.member_number,
      user_id: this.user_id,
      full_name: this.full_name,
      identity_number: this.identity_number,
      member_type: this.member_type,
      phone: this.phone,
      address: this.address,
      join_date: this.join_date,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

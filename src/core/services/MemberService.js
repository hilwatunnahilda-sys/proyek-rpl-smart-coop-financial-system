import { DatabaseAdapter } from '../../infrastructure/database/adapter.js';
import { MemberEntity } from '../entities/Member.js';
import { MEMBER_STATUS, ROLES } from '../../config/constants.js';
import { AuthorizationError } from '../../infrastructure/rbac/authorizationMiddleware.js';

export class MemberService {
  constructor(adapter = null) {
    this.db = adapter || new DatabaseAdapter();
    this.tableName = 'members';
  }

  _assertNotChairman(user, actionName = 'mengubah data anggota') {
    if (user && user.role === ROLES.CHAIRMAN) {
      throw new AuthorizationError(
        `Ketua bersifat READ-ONLY dan tidak diperkenankan untuk ${actionName}.`,
        'CHAIRMAN_READONLY_VIOLATION'
      );
    }
  }

  async getAll(query = {}) {
    const records = await this.db.find(this.tableName, query);
    return records.map(record => new MemberEntity(record));
  }

  async getById(id) {
    const record = await this.db.findById(this.tableName, id);
    if (!record) return null;
    return new MemberEntity(record);
  }

  async getByMemberNumber(memberNumber) {
    const records = await this.db.find(this.tableName, { member_number: memberNumber });
    if (records.length === 0) return null;
    return new MemberEntity(records[0]);
  }

  async create(data, user = null) {
    this._assertNotChairman(user, 'menambah anggota baru');
    // Check for duplicate member number
    const existing = await this.getByMemberNumber(data.member_number);
    if (existing) {
      throw new Error(`Anggota dengan nomor ${data.member_number} sudah terdaftar.`);
    }

    const member = new MemberEntity({
      id: crypto.randomUUID(),
      ...data,
      status: MEMBER_STATUS.ACTIVE, // Force active on creation
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await this.db.insert(this.tableName, member.toJSON());

    // Non-blocking Telegram notification dispatch (Anggota Baru Terdaftar)
    this._dispatchTelegramNotification('NEW_MEMBER', { member: member.toJSON() });

    return member;
  }

  _dispatchTelegramNotification(eventType, eventData) {
    try {
      if (typeof fetch !== 'undefined') {
        fetch('/api/telegram/notify-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType, eventData })
        }).catch(() => {});
      }
    } catch {
      // Safe non-blocking catch: Financial and data mutation never fails
    }
  }

  async update(id, data, user = null) {
    this._assertNotChairman(user, 'memperbarui data anggota');
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Anggota tidak ditemukan.');
    }

    // Check duplicate if member number is updated
    if (data.member_number && data.member_number !== existing.member_number) {
      const duplicate = await this.getByMemberNumber(data.member_number);
      if (duplicate) {
        throw new Error(`Anggota dengan nomor ${data.member_number} sudah terdaftar.`);
      }
    }

    const updatedData = {
      ...existing.toJSON(),
      ...data,
      updated_at: new Date().toISOString()
    };

    const updatedRecord = await this.db.update(this.tableName, id, updatedData);
    return new MemberEntity(updatedRecord);
  }

  async deactivate(id, user = null) {
    this._assertNotChairman(user, 'menonaktifkan anggota');
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Anggota tidak ditemukan.');
    }

    return await this.update(id, { status: MEMBER_STATUS.INACTIVE }, user);
  }

  async activate(id, user = null) {
    this._assertNotChairman(user, 'mengaktifkan anggota');
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Anggota tidak ditemukan.');
    }

    return await this.update(id, { status: MEMBER_STATUS.ACTIVE }, user);
  }
}

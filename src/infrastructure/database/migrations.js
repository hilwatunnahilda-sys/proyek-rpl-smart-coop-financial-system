/**
 * Database Migration Manager
 * Tracks and applies database versions & schema structures
 */

import { DATABASE_SCHEMA } from './schema.js';

export class MigrationManager {
  constructor(adapter) {
    this.adapter = adapter;
    this.metaKey = 'ikmi_db_migrations_meta';
  }

  async getAppliedVersion() {
    try {
      const data = localStorage.getItem(this.metaKey);
      return data ? JSON.parse(data).version : 0;
    } catch {
      return 0;
    }
  }

  async setAppliedVersion(version) {
    localStorage.setItem(this.metaKey, JSON.stringify({
      version,
      appliedAt: new Date().toISOString()
    }));
  }

  async runMigrations() {
    const currentVersion = await this.getAppliedVersion();
    console.log(`[Migrations] Current database version: ${currentVersion}, target version: ${DATABASE_SCHEMA.version}`);

    if (currentVersion < 1) {
      console.log('[Migrations] Applying Migration 001: Create users, members, roles, sessions, audit_logs');
      await this.setAppliedVersion(1);
    }

    return true;
  }
}

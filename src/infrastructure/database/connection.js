/**
 * Database Connection Manager & Lifecycle Coordinator
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { ENV } from '../../config/env.js';
import { DB_CONNECTION_STATUS } from '../../config/constants.js';
import { DatabaseAdapter } from './adapter.js';
import { DATABASE_SCHEMA } from './schema.js';
import { MigrationManager } from './migrations.js';
import { DatabaseSeeder } from './seeder.js';

class DatabaseConnectionManager {
  constructor() {
    this.status = DB_CONNECTION_STATUS.DISCONNECTED;
    this.adapter = new DatabaseAdapter(ENV.DATABASE.NAME);
    this.migrationManager = new MigrationManager(this.adapter);
    this.seeder = new DatabaseSeeder(this.adapter);
    this.listeners = [];
    this.latencyMs = 0;
    this.lastCheckedAt = null;
    this.schema = DATABASE_SCHEMA;
  }

  onStatusChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.getHealthStatus());
      } catch (e) {
        console.error('Error in DB status listener:', e);
      }
    });
  }

  async connect() {
    this.status = DB_CONNECTION_STATUS.CONNECTING;
    this.notify();

    const startTime = performance.now();

    try {
      // 1. Handshake latency simulation
      await new Promise(resolve => setTimeout(resolve, 60));

      // 2. Run schema migrations
      await this.migrationManager.runMigrations();

      // 3. Auto seed development accounts with PBKDF2 hashed passwords
      if (ENV.DATABASE.AUTO_SEED) {
        await this.seeder.seed();
      }

      this.latencyMs = Math.round(performance.now() - startTime);
      this.status = DB_CONNECTION_STATUS.CONNECTED;
      this.lastCheckedAt = new Date().toISOString();

      this.notify();
      console.log(`[DatabaseConnection] Connected to '${ENV.DATABASE.NAME}' via ${ENV.DATABASE.DRIVER} (${this.latencyMs}ms)`);
      return true;
    } catch (err) {
      this.status = DB_CONNECTION_STATUS.ERROR;
      this.lastCheckedAt = new Date().toISOString();
      this.notify();
      console.error('[DatabaseConnection] Connection failed:', err);
      return false;
    }
  }

  async ping() {
    const startTime = performance.now();
    try {
      await this.adapter.getAll('users');
      this.latencyMs = Math.max(1, Math.round(performance.now() - startTime));
      this.lastCheckedAt = new Date().toISOString();
      this.status = DB_CONNECTION_STATUS.CONNECTED;
      this.notify();
      return { ok: true, latencyMs: this.latencyMs };
    } catch (err) {
      this.status = DB_CONNECTION_STATUS.ERROR;
      this.notify();
      return { ok: false, error: err.message };
    }
  }

  getHealthStatus() {
    return {
      status: this.status,
      driver: ENV.DATABASE.DRIVER,
      database: ENV.DATABASE.NAME,
      version: DATABASE_SCHEMA.version,
      latencyMs: this.latencyMs,
      lastCheckedAt: this.lastCheckedAt,
      tablesCount: Object.keys(DATABASE_SCHEMA.tables).length,
      isConnected: this.status === DB_CONNECTION_STATUS.CONNECTED
    };
  }
}

export const db = new DatabaseConnectionManager();

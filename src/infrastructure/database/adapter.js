/**
 * Database Storage Adapter Interface & Implementation
 * Provides asynchronous data access abstraction for persistent storage
 */

const inMemoryStore = new Map();
let fileStoreLoaded = false;

function getFsModule() {
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      return (globalThis.process?.getBuiltinModule ? globalThis.process.getBuiltinModule('fs') : null) || null;
    } catch {
      return null;
    }
  }
  return null;
}

function getStorageFilePath() {
  if (typeof process !== 'undefined' && process.cwd) {
    try {
      const cwd = process.cwd();
      return `${cwd}/.dev_db_storage.json`;
    } catch {
      return null;
    }
  }
  return null;
}

function loadFileStore() {
  if (fileStoreLoaded) return;
  fileStoreLoaded = true;
  const fs = getFsModule();
  const filePath = getStorageFilePath();
  if (fs && filePath && fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      for (const [k, v] of Object.entries(data)) {
        inMemoryStore.set(k, v);
      }
    } catch (e) {
      // Ignore load error
    }
  }
}

function saveFileStore() {
  const fs = getFsModule();
  const filePath = getStorageFilePath();
  if (fs && filePath) {
    try {
      const obj = {};
      for (const [k, v] of inMemoryStore.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      // Ignore save error
    }
  }
}

function getStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function') {
      return localStorage;
    }
  } catch {}
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage && typeof globalThis.localStorage.getItem === 'function') {
      return globalThis.localStorage;
    }
  } catch {}

  loadFileStore();

  return {
    getItem: (key) => inMemoryStore.get(key) || null,
    setItem: (key, val) => {
      inMemoryStore.set(key, String(val));
      saveFileStore();
    },
    removeItem: (key) => {
      inMemoryStore.delete(key);
      saveFileStore();
    },
    clear: () => {
      inMemoryStore.clear();
      saveFileStore();
    }
  };
}

export class DatabaseAdapter {
  constructor(storagePrefix = 'ikmi_smart_coop_db') {
    this.storagePrefix = storagePrefix;
  }

  getKey(tableName) {
    return `${this.storagePrefix}_${tableName}`;
  }

  getStorageInstance() {
    return getStorage();
  }

  async find(tableName, query = {}) {
    const records = await this.getAll(tableName);
    if (!query || Object.keys(query).length === 0) {
      return records;
    }
    return records.filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
  }

  async findById(tableName, id, keyField = 'id') {
    const records = await this.getAll(tableName);
    return records.find(item => item[keyField] === id) || null;
  }

  async insert(tableName, record) {
    const records = await this.getAll(tableName);
    records.push(record);
    await this.saveAll(tableName, records);
    return record;
  }

  async update(tableName, id, updateData, keyField = 'id') {
    const records = await this.getAll(tableName);
    const index = records.findIndex(item => item[keyField] === id);
    if (index === -1) return null;
    records[index] = { ...records[index], ...updateData, updatedAt: new Date().toISOString() };
    await this.saveAll(tableName, records);
    return records[index];
  }

  async delete(tableName, id, keyField = 'id') {
    const records = await this.getAll(tableName);
    const filtered = records.filter(item => item[keyField] !== id);
    await this.saveAll(tableName, filtered);
    return true;
  }

  async getAll(tableName) {
    try {
      const storage = this.getStorageInstance();
      const data = storage.getItem(this.getKey(tableName));
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading table ${tableName}:`, e);
      return [];
    }
  }

  async saveAll(tableName, records) {
    try {
      const storage = this.getStorageInstance();
      storage.setItem(this.getKey(tableName), JSON.stringify(records));
      return true;
    } catch (e) {
      console.error(`Error writing table ${tableName}:`, e);
      return false;
    }
  }

  async clearTable(tableName) {
    const storage = this.getStorageInstance();
    storage.removeItem(this.getKey(tableName));
  }
}

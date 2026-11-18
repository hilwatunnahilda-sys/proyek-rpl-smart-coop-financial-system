// Authentication & User Session Manager
import { store } from './store.js';

const AUTH_STORAGE_KEY = 'ikmi_smart_coop_session_v1';

class AuthManager {
  constructor() {
    this.currentUser = this.loadSession();
    this.authSubscribers = [];
  }

  loadSession() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Session load error', e);
    }
    // Default to Admin session on initial launch for immediate rich exploration
    return this.getDemoUser('admin@ikmi.ac.id');
  }

  saveSession(user) {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Session save error', e);
    }
    this.notify();
  }

  subscribe(cb) {
    this.authSubscribers.push(cb);
    return () => {
      this.authSubscribers = this.authSubscribers.filter(c => c !== cb);
    };
  }

  notify() {
    this.authSubscribers.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error('Error in auth subscriber', e);
      }
    });
  }

  getDemoUser(email) {
    const member = store.data.members.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (!member) {
      return {
        id: 'IKMI-MBR-002',
        name: 'Admin Koperasi IKMI',
        role: 'admin',
        type: 'admin',
        email: 'admin@ikmi.ac.id',
        identifier: 'NIP: 198504122008',
        department: 'Unit Pengelola Koperasi'
      };
    }
    return {
      id: member.id,
      name: member.name,
      role: member.role || (member.type === 'admin' ? 'admin' : member.type === 'ketua' ? 'ketua' : 'anggota'),
      type: member.type,
      email: member.email,
      identifier: member.identifier,
      department: member.department,
      phone: member.phone,
      joinDate: member.joinDate,
      status: member.status
    };
  }

  login(email, password) {
    const member = store.data.members.find(m => m.email.toLowerCase() === (email || '').trim().toLowerCase());
    if (member) {
      const user = {
        id: member.id,
        name: member.name,
        role: member.role || (member.type === 'admin' ? 'admin' : member.type === 'ketua' ? 'ketua' : 'anggota'),
        type: member.type,
        email: member.email,
        identifier: member.identifier,
        department: member.department,
        phone: member.phone,
        joinDate: member.joinDate,
        status: member.status
      };
      this.saveSession(user);
      return { success: true, user };
    }
    return { success: false, message: 'Email tidak ditemukan dalam database keanggotaan.' };
  }

  quickSwitch(email) {
    const user = this.getDemoUser(email);
    this.saveSession(user);
    return user;
  }

  logout() {
    this.saveSession(null);
  }

  getUser() {
    return this.currentUser;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }

  isKetua() {
    return this.currentUser && (this.currentUser.role === 'ketua' || this.currentUser.type === 'ketua');
  }

  isAnggota() {
    return this.currentUser && this.currentUser.role === 'anggota';
  }
}

export const auth = new AuthManager();

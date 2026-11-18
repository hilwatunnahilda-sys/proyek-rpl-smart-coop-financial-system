/**
 * About Application View (Tentang Aplikasi)
 * Displays Developer Identity, Application Information, and System Architecture
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { router } from '../router/router.js';

export function renderAboutView(container, { user } = {}) {
  container.innerHTML = `
    <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 1.75rem;">
      
      <!-- Hero Banner -->
      <div style="background: linear-gradient(135deg, #0A2540 0%, #1e3a8a 60%, #3b82f6 100%); border-radius: var(--radius-xl); padding: 2.25rem; color: #fff; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
        <div style="position: absolute; right: -20px; bottom: -20px; opacity: 0.08; font-size: 15rem; font-weight: 900; pointer-events: none; line-height: 1;">
          IKMI
        </div>

        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); padding: 0.35rem 0.85rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #93c5fd; margin-bottom: 0.85rem; border: 1px solid rgba(255,255,255,0.2);">
          <span>🏛️ STMIK IKMI CIREBON</span>
          <span>&bull;</span>
          <span>SISTEM INFORMASI KOPERASI</span>
        </div>

        <h1 style="font-size: 2rem; font-weight: 800; color: #ffffff; margin-bottom: 0.5rem; letter-spacing: -0.02em; font-family: 'Outfit', sans-serif;">
          Smart Co-op Financial System
        </h1>

        <p style="font-size: 0.95rem; color: rgba(255,255,255,0.9); max-width: 850px; line-height: 1.65; margin-bottom: 1.25rem;">
          Sistem informasi keuangan koperasi berbasis web yang dirancang untuk mendukung pengelolaan data anggota, simpanan, pinjaman, angsuran, transaksi, dan laporan keuangan koperasi di lingkungan STMIK IKMI Cirebon sesuai dengan fitur yang tersedia pada aplikasi.
        </p>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button type="button" id="btn-back-dashboard" class="btn btn-sm" style="background: #ffffff; color: #0A2540; font-weight: 700; border: none; padding: 0.55rem 1.15rem; border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            ← Kembali ke Dashboard
          </button>
          <button type="button" id="btn-open-reports" class="btn btn-sm" style="background: rgba(255,255,255,0.18); color: #ffffff; font-weight: 600; border: 1px solid rgba(255,255,255,0.3); padding: 0.55rem 1.15rem; border-radius: var(--radius-md);">
            📑 Buka Laporan Keuangan
          </button>
        </div>
      </div>

      <!-- Main Two-Column Information Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 1.75rem;">
        
        <!-- Left Column: Developer Profile Card -->
        <div class="card" style="box-shadow: var(--shadow-md); border: 1px solid var(--border-color); display: flex; flex-direction: column;">
          <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--primary-100); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                👨‍💻
              </div>
              <div>
                <h3 class="card-title" style="margin: 0; font-size: 1.05rem;">Profil Pengembang</h3>
                <span style="font-size: 0.725rem; color: var(--text-tertiary);">Developer Credit & Informasi Akademik</span>
              </div>
            </div>
            <span class="badge badge-primary" style="font-size: 0.7rem;">PROFIL RESMI</span>
          </div>

          <div style="padding: 1.25rem 0; display: flex; flex-direction: column; gap: 1.25rem;">
            
            <!-- Developer Avatar & Name Box -->
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
              <div style="width: 64px; height: 64px; border-radius: var(--radius-full); background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; box-shadow: var(--shadow-md); border: 3px solid rgba(255,255,255,0.2); flex-shrink: 0;">
                AMI
              </div>
              <div style="min-width: 0;">
                <h4 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); font-family: 'Outfit', sans-serif;">
                  Ahmad Maulana Ibrohim
                </h4>
                <div style="font-size: 0.8rem; color: var(--primary-600); font-weight: 700; margin-top: 0.15rem;">
                  Full-Stack Developer & AI Integrator
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.1rem;">
                  Program Studi Teknik Informatika
                </div>
              </div>
            </div>

            <!-- Detailed Academic Credentials Grid -->
            <div style="display: flex; flex-direction: column; gap: 0.65rem;">
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <span style="font-size: 0.8rem; color: var(--text-tertiary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>🆔</span> Nomor Induk Mahasiswa (NIM):
                </span>
                <strong style="font-size: 0.9rem; font-family: monospace; color: var(--primary-700);">41257087</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <span style="font-size: 0.8rem; color: var(--text-tertiary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>🏫</span> Kelas:
                </span>
                <strong style="font-size: 0.875rem; color: var(--text-primary);">TI-2025-KIP-1A</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <span style="font-size: 0.8rem; color: var(--text-tertiary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>🏛️</span> Institusi:
                </span>
                <strong style="font-size: 0.875rem; color: var(--text-primary);">STMIK IKMI Cirebon</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <span style="font-size: 0.8rem; color: var(--text-tertiary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>📅</span> Tahun Pengembangan:
                </span>
                <strong style="font-size: 0.875rem; color: var(--text-primary);">2026</strong>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <span style="font-size: 0.8rem; color: var(--text-tertiary); display: flex; align-items: center; gap: 0.4rem;">
                  <span>📦</span> Status Proyek:
                </span>
                <span class="badge badge-success" style="font-size: 0.7rem; font-weight: 700;">PRODUKSI v1.0.0</span>
              </div>

            </div>

          </div>
        </div>

        <!-- Right Column: Application Details & Features -->
        <div class="card" style="box-shadow: var(--shadow-md); border: 1px solid var(--border-color); display: flex; flex-direction: column;">
          <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--success-light); color: var(--success); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                📋
              </div>
              <div>
                <h3 class="card-title" style="margin: 0; font-size: 1.05rem;">Tentang Sistem & Modul Utama</h3>
                <span style="font-size: 0.725rem; color: var(--text-tertiary);">Cakupan Modul Smart Co-op Financial System</span>
              </div>
            </div>
            <span class="badge badge-success" style="font-size: 0.7rem;">TERINTEGRASI</span>
          </div>

          <div style="padding-top: 1.25rem; display: flex; flex-direction: column; gap: 1.15rem;">
            
            <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
              Smart Co-op Financial System dibangun khusus untuk modernisasi tata kelola keuangan koperasi di STMIK IKMI Cirebon. Mengadopsi arsitektur bersih (*Clean Architecture*), sistem ini mendukung akuntabilitas penuh mulai dari registrasi anggota hingga pembukuan arus kas otomatis.
            </p>

            <!-- Features Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              
              <div style="padding: 0.85rem; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 1.25rem; margin-bottom: 0.35rem;">👥</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem;">Manajemen Anggota</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); line-height: 1.45;">
                  Pencatatan Dosen, Mahasiswa, dan Staf dengan NIDN/NIM/NIP, status aktif/nonaktif.
                </div>
              </div>

              <div style="padding: 0.85rem; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 1.25rem; margin-bottom: 0.35rem;">💰</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem;">Subsistem Simpanan</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); line-height: 1.45;">
                  Simpanan Pokok, Wajib, Sukarela dengan aturan penarikan saldo dan mutasi real-time.
                </div>
              </div>

              <div style="padding: 0.85rem; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 1.25rem; margin-bottom: 0.35rem;">📈</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem;">Pinjaman & Angsuran</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); line-height: 1.45;">
                  Kalkulasi skema Flat, Menurun, Anuitas, Syariah 0% Qardh, dan evaluasi tunggakan.
                </div>
              </div>

              <div style="padding: 0.85rem; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 1.25rem; margin-bottom: 0.35rem;">📑</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem;">Buku Kas & Transaksi</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); line-height: 1.45;">
                  Ledger keuangan kas masuk/keluar yang *immutable* dengan jejak audit reversal.
                </div>
              </div>

              <div style="padding: 0.85rem; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 1.25rem; margin-bottom: 0.35rem;">🤖</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem;">Smart Co-op AI</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); line-height: 1.45;">
                  Asisten cerdas terintegrasi basis data aktual via backend RBAC & NVIDIA NIM.
                </div>
              </div>

              <div style="padding: 0.85rem; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 1.25rem; margin-bottom: 0.35rem;">🛡️</div>
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.2rem;">Keamanan & RBAC</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); line-height: 1.45;">
                  Enkripsi PBKDF2-SHA256, token sesi aman, isolasi data anggota, dan route guard.
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

      <!-- Bottom System Architecture Badge Card -->
      <div class="card" style="box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); background: var(--bg-surface); padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">
              Teknologi & Standar Arsitektur Koperasi
            </h4>
            <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-tertiary);">
              Standar Akuntansi SAK ETAP / PSAK 27 &bull; Cryptographic PBKDF2-SHA256 &bull; Vite &bull; NVIDIA NIM AI
            </p>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <span class="badge badge-primary">JavaScript ES6+</span>
            <span class="badge badge-success">Clean Architecture</span>
            <span class="badge badge-purple">PBKDF2 Enkripsi</span>
            <span class="badge badge-warning">NVIDIA NIM API</span>
          </div>
        </div>
      </div>

    </div>
  `;

  // Attach button events
  const backDashboardBtn = container.querySelector('#btn-back-dashboard');
  if (backDashboardBtn) {
    backDashboardBtn.addEventListener('click', () => {
      router.navigate('/dashboard');
    });
  }

  const openReportsBtn = container.querySelector('#btn-open-reports');
  if (openReportsBtn) {
    openReportsBtn.addEventListener('click', () => {
      router.navigate('/reports');
    });
  }
}

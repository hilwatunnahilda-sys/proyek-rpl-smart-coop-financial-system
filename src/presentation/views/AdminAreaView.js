/**
 * Protected Admin Area View
 * Accessible STRICTLY by role 'ADMIN' only
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { auth } from '../../infrastructure/auth/authService.js';
import { db } from '../../infrastructure/database/connection.js';
import { requireAuthorization } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES } from '../../config/constants.js';

export function renderAdminAreaView(container, { user }) {
  // Service-level authorization enforcement
  requireAuthorization(user, [ROLES.ADMIN]);

  const health = db.getHealthStatus();

  container.innerHTML = `
    <div class="animate-fade-in">
      
      <div style="background: linear-gradient(135deg, #0A2540 0%, #1e40af 100%); border-radius: var(--radius-xl); padding: 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-md);">
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(139, 92, 246, 0.3); padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #d8b4fe; margin-bottom: 0.6rem;">
          <span>🛡️ AREA ADMINISTRATOR TINGKAT TINGGI</span>
        </div>
        <h2 style="font-size: 1.6rem; color: #fff; margin-bottom: 0.35rem;">Konsol Administrasi & Pengaturan Koperasi</h2>
        <p style="font-size: 0.875rem; color: rgba(255,255,255,0.85); max-width: 700px;">
          Halaman ini dilindungi secara ketat oleh Route Guard dan Service Authorization Middleware. Hanya akun dengan peran <strong>ADMIN</strong> yang memiliki wewenang untuk membuka konsol ini.
        </p>
      </div>

      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <h3 class="card-title">Status Otorisasi & Kontrol Keamanan</h3>
          <span class="badge badge-purple">SUPERUSER ACCESS</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
          <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">PENGGUNA AKTIF</div>
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary); margin-top: 0.2rem;">${user.name}</div>
            <div style="font-size: 0.75rem; color: var(--primary-600); font-weight: 600;">${user.email}</div>
          </div>

          <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">LEVEL OTORISASI</div>
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--purple-text); margin-top: 0.2rem;">ROLE: ${user.role}</div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">Universal Permissions Granted</div>
          </div>

          <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">ENKRIPSI DATA</div>
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--success); margin-top: 0.2rem;">PBKDF2-SHA256</div>
            <div style="font-size: 0.75rem; color: var(--text-tertiary);">Salt: 16-byte cryptographically secure</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <h3 class="card-title">Modul Sistem</h3>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
          <div class="admin-module-card" onclick="window.location.hash = '/admin/members'" style="cursor: pointer; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: var(--primary-50); color: var(--primary-600); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">👥</div>
              <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Manajemen Anggota</h4>
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Kelola data anggota dosen, staf, dan mahasiswa. Tambah, edit, dan pantau status keanggotaan.</p>
          </div>

          <div class="admin-module-card" onclick="window.location.hash = '/admin/loans'" style="cursor: pointer; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: var(--success-light); color: var(--success); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">💳</div>
              <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Pinjaman & Angsuran</h4>
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Pengajuan, review, persetujuan/penolakan, pencairan dana, jadwal angsuran, dan pelunasan pinjaman.</p>
          </div>

          <div class="admin-module-card" onclick="window.location.hash = '/admin/transactions'" style="cursor: pointer; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: var(--primary-100); color: var(--primary-700); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📒</div>
              <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Buku Kas & Mutasi</h4>
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Ledger transaksi keuangan immutable, pencatatan income & expense, mutasi kas, dan koreksi reversal.</p>
          </div>

          <div class="admin-module-card" onclick="window.location.hash = '/reports'" style="cursor: pointer; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: #dcfce7; color: #15803d; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📊</div>
              <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Laporan & Rekapitulasi</h4>
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">8 Laporan resmi koperasi, ringkasan arus kas, filter multi-kriteria, ekspor CSV/Excel, dan cetak PDF resmi ber-Kop Surat.</p>
          </div>

          <div class="admin-module-card" onclick="window.location.hash = '/settings/telegram'" style="cursor: pointer; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: #e0f2fe; color: #0088cc; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">✈️</div>
              <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Notifikasi Telegram</h4>
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Kelola integrasi bot Telegram, kode OTP sekali pakai, otomasi pengingat angsuran, dan ringkasan eksekutif.</p>
          </div>

          <div class="admin-module-card" onclick="window.location.hash = '/admin/ai-control'" style="cursor: pointer; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: #ede9fe; color: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">🤖</div>
              <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">AI Model Control Center</h4>
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Pusat kendali multi-model AI: NVIDIA, OpenAI, Gemini, Claude, OpenRouter & Ollama. Routing, fallback, dan telemetri biaya.</p>
          </div>
        </div>
      </div>

    </div>
  `;
}

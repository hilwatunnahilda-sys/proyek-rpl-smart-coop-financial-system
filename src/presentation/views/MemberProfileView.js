/**
 * Protected Member Profile & Self-Service Portal View
 * Enforces Member Data Isolation at Backend/Database Query Layer
 * 
 * Features:
 * - Profil Lengkap & Nomor Anggota
 * - Total Simpanan
 * - Detail Simpanan Pokok
 * - Detail Simpanan Wajib
 * - Detail Simpanan Sukarela
 * - Riwayat Mutasi Simpanan
 * - Ringkasan Pinjaman Aktif & Sisa Pinjaman
 * - Empty State untuk anggota baru yang belum memiliki simpanan
 * 
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { auth } from '../../infrastructure/auth/authService.js';
import { requireAuthorization, enforceMemberDataIsolation } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { SavingService } from '../../core/services/SavingService.js';
import { LoanService } from '../../core/services/LoanService.js';
import { ROLES, MEMBER_TYPES, SAVING_TYPES } from '../../config/constants.js';

export async function renderMemberProfileView(container, { user }) {
  // Service-level authorization enforcement
  requireAuthorization(user, [ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.MEMBER]);

  const member = auth.getMember();

  // Enforce data isolation
  if (member) {
    enforceMemberDataIsolation(user, member.user_id);
  }

  const memberId = member ? member.id : `mbr-${user.id}`;
  const savingService = new SavingService();
  const loanService = new LoanService();

  // Fetch Member's own data from backend query
  const [savingsBalances, savingTransactions, memberLoansData] = await Promise.all([
    savingService.getMemberBalances(memberId, user),
    savingService.getMemberTransactions(memberId, user),
    loanService.getMemberLoans(memberId, user)
  ]);

  // Compute active loan highlights
  let activeLoansCount = 0;
  let totalRemainingPrincipal = 0;
  memberLoansData.forEach(item => {
    if (item.loan.isActive()) {
      activeLoansCount++;
      totalRemainingPrincipal += Number(item.loan.remaining_principal || 0);
    }
  });

  let typeBadgeClass = 'badge-primary';
  if (member && member.member_type === MEMBER_TYPES.MAHASISWA) typeBadgeClass = 'badge-warning';
  if (member && member.member_type === MEMBER_TYPES.STAF) typeBadgeClass = 'badge-purple';

  const hasSavings = (savingsBalances.total > 0) || (savingTransactions.length > 0);

  container.innerHTML = `
    <div class="animate-fade-in" style="padding-bottom: 3.5rem;">
      
      <!-- Member Hero Banner -->
      <div style="background: linear-gradient(135deg, #0A2540 0%, #1e40af 50%, #2563eb 100%); border-radius: var(--radius-xl); padding: 2.25rem 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
        <div style="position: absolute; right: -25px; bottom: -25px; opacity: 0.08; font-size: 11rem; font-weight: 900; pointer-events: none; user-select: none;">MEMBER</div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 0.35rem 0.9rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #fff;">
            <span>👤 PORTAL LAYANAN MANDIRI ANGGOTA</span>
            <span style="opacity: 0.5;">&bull;</span>
            <span>NO. ANGGOTA: ${member ? member.member_number : 'IKMI-MBR-000'}</span>
          </div>

          <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(16, 185, 129, 0.3); padding: 0.35rem 0.8rem; border-radius: var(--radius-full); font-size: 0.725rem; font-weight: 700; color: #a7f3d0;">
            <span>🔒 ISOLASI DATA TERVERIFIKASI</span>
          </div>
        </div>

        <h2 style="font-size: 1.85rem; color: #fff; margin-bottom: 0.4rem; font-family: 'Outfit', sans-serif;">
          Selamat Datang, ${member ? member.full_name : user.name}
        </h2>
        <p style="font-size: 0.875rem; color: rgba(255,255,255,0.9); max-width: 800px; line-height: 1.6; margin: 0;">
          Kelola seluruh simpanan pokok, wajib, dan sukarela Anda secara transparan. Anda juga dapat memantau fasilitas pinjaman aktif, jadwal angsuran, serta riwayat mutasi kas pribadi.
        </p>
      </div>

      <!-- Quick Navigation Shortcuts -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.75rem;">
        <a href="#/member/loans" class="btn btn-outline-primary" style="justify-content: center; padding: 0.85rem 1rem; font-size: 0.85rem; border-radius: var(--radius-md); text-decoration: none;">
          💳 Pinjaman & Jadwal Angsuran (${activeLoansCount} Aktif)
        </a>
        <a href="#/member/transactions" class="btn btn-outline-primary" style="justify-content: center; padding: 0.85rem 1rem; font-size: 0.85rem; border-radius: var(--radius-md); text-decoration: none;">
          📜 Buku Riwayat Transaksi Keuangan
        </a>
        <a href="#/reports" class="btn btn-outline-primary" style="justify-content: center; padding: 0.85rem 1rem; font-size: 0.85rem; border-radius: var(--radius-md); text-decoration: none;">
          📊 Laporan & Rekapitulasi Pribadi
        </a>
        <a href="#/settings/telegram" class="btn btn-outline-primary" style="justify-content: center; padding: 0.85rem 1rem; font-size: 0.85rem; border-radius: var(--radius-md); text-decoration: none; color: #0088cc; border-color: #0088cc;">
          ✈️ Notifikasi Telegram
        </a>
      </div>

      <!-- Section 1: Member Savings Breakdown & Balances -->
      <div style="margin-bottom: 1.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
          <h3 style="font-size: 1.15rem; color: var(--text-primary); margin: 0; font-family: 'Outfit', sans-serif;">
            💰 Rekening & Rincian Simpanan Saya
          </h3>
          <span style="font-size: 0.75rem; color: var(--text-tertiary);">Terhubung ke Basis Data Terenkripsi</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
          
          <!-- Total Simpanan -->
          <div class="stat-card" style="--stat-accent: #10b981;">
            <div class="stat-info">
              <span class="stat-label">Total Akumulasi Simpanan</span>
              <span class="stat-value" style="color: var(--success); font-size: 1.55rem;">
                Rp ${savingsBalances.total.toLocaleString('id-ID')}
              </span>
              <span class="stat-subtext">Gabungan Simpanan Pokok, Wajib & Sukarela</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--success-light); --stat-icon-color: var(--success);">
              💰
            </div>
          </div>

          <!-- Simpanan Pokok -->
          <div class="stat-card" style="--stat-accent: #3b82f6;">
            <div class="stat-info">
              <span class="stat-label">Detail Simpanan Pokok</span>
              <span class="stat-value" style="color: var(--primary-600); font-size: 1.35rem;">
                Rp ${(savingsBalances[SAVING_TYPES.POKOK] || 0).toLocaleString('id-ID')}
              </span>
              <span class="stat-subtext">Setoran Awal Keanggotaan Koperasi</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--primary-100); --stat-icon-color: var(--primary-600);">
              🏛️
            </div>
          </div>

          <!-- Simpanan Wajib -->
          <div class="stat-card" style="--stat-accent: #6366f1;">
            <div class="stat-info">
              <span class="stat-label">Detail Simpanan Wajib</span>
              <span class="stat-value" style="color: #4f46e5; font-size: 1.35rem;">
                Rp ${(savingsBalances[SAVING_TYPES.WAJIB] || 0).toLocaleString('id-ID')}
              </span>
              <span class="stat-subtext">Iuran Berkala Bulanan Anggota</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: #e0e7ff; --stat-icon-color: #4338ca;">
              📅
            </div>
          </div>

          <!-- Simpanan Sukarela -->
          <div class="stat-card" style="--stat-accent: #8b5cf6;">
            <div class="stat-info">
              <span class="stat-label">Detail Simpanan Sukarela</span>
              <span class="stat-value" style="color: var(--purple); font-size: 1.35rem;">
                Rp ${(savingsBalances[SAVING_TYPES.SUKARELA] || 0).toLocaleString('id-ID')}
              </span>
              <span class="stat-subtext">Dapat Disetor & Ditarik Sewaktu-waktu</span>
            </div>
            <div class="stat-icon" style="--stat-icon-bg: var(--purple-light); --stat-icon-color: var(--purple);">
              ✨
            </div>
          </div>

        </div>
      </div>

      <!-- Empty State for Savings if Member has no savings yet -->
      ${!hasSavings ? `
        <div class="card" style="background: var(--bg-subtle); border: 2px dashed var(--border-color); text-align: center; padding: 2.75rem 1.5rem; margin-bottom: 1.75rem; border-radius: var(--radius-lg);">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">🌱</div>
          <h4 style="margin: 0 0 0.5rem 0; font-size: 1.2rem; color: var(--text-primary); font-family: 'Outfit', sans-serif;">
            Belum Ada Catatan Simpanan
          </h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 580px; margin: 0 auto 1.25rem auto; line-height: 1.6;">
            Akun Anda belum memiliki transaksi simpanan pokok, wajib, maupun sukarela. Silakan hubungi Kasir/Teller Koperasi STMIK IKMI untuk melakukan setoran simpanan pertama Anda.
          </p>
          <div style="display: inline-flex; gap: 0.5rem; font-size: 0.775rem; color: var(--primary-700); background: var(--primary-50); padding: 0.4rem 0.85rem; border-radius: var(--radius-full); border: 1px solid var(--primary-200);">
            ℹ️ Setoran Simpanan Pokok Mahasiswa: Rp 100.000 &bull; Dosen/Staf: Rp 500.000 - Rp 1.000.000
          </div>
        </div>
      ` : `
        <!-- Recent Savings Mutations Table (if has savings) -->
        <div class="card" style="margin-bottom: 1.75rem; padding: 0; overflow: hidden;">
          <div class="card-header" style="padding: 1rem 1.25rem;">
            <h3 class="card-title" style="font-size: 0.95rem;">
              <span>📜 Mutasi Simpanan Terakhir</span>
            </h3>
            <a href="#/member/transactions" style="font-size: 0.75rem; color: var(--primary-600); text-decoration: none; font-weight: 600;">
              Lihat Semua Transaksi &rarr;
            </a>
          </div>

          <div class="table-responsive">
            <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.825rem; margin: 0;">
              <thead>
                <tr style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-color); text-align: left;">
                  <th style="padding: 0.65rem 1rem;">No. Transaksi</th>
                  <th style="padding: 0.65rem 1rem;">Tanggal</th>
                  <th style="padding: 0.65rem 1rem;">Jenis Simpanan</th>
                  <th style="padding: 0.65rem 1rem;">Keterangan</th>
                  <th style="padding: 0.65rem 1rem; text-align: right;">Nominal</th>
                </tr>
              </thead>
              <tbody>
                ${savingTransactions.slice(0, 5).map(trx => {
                  const isDep = trx.isDeposit();
                  return `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                      <td style="padding: 0.65rem 1rem; font-family: monospace; font-weight: 700; color: var(--primary-700);">
                        ${trx.id}
                      </td>
                      <td style="padding: 0.65rem 1rem; color: var(--text-secondary);">
                        ${new Date(trx.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td style="padding: 0.65rem 1rem;">
                        <span class="badge ${isDep ? 'badge-success' : 'badge-danger'}">
                          ${trx.transaction_type} ${trx.saving_type}
                        </span>
                      </td>
                      <td style="padding: 0.65rem 1rem; color: var(--text-primary);">
                        ${trx.description || '-'}
                      </td>
                      <td style="padding: 0.65rem 1rem; text-align: right; font-weight: 800; color: ${isDep ? 'var(--success)' : 'var(--danger)'};">
                        ${isDep ? '+' : '-'} Rp ${trx.amount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}

      <!-- Section 2: Grid for Profile Info & Loan Overview -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; margin-bottom: 1.75rem;">
        
        <!-- Member Profile Details Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <span>👤 Data Profil & Identitas Keanggotaan</span>
            </h3>
            <span class="badge ${typeBadgeClass}">${member ? member.member_type : user.role}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.875rem;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-tertiary);">Nomor Anggota Resmi:</span>
              <strong><code style="font-size: 0.95rem; color: var(--primary-700);">${member ? member.member_number : 'ADMIN-N/A'}</code></strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-tertiary);">Nomor Identitas (NIDN/NIM/NIP):</span>
              <strong>${member ? member.identity_number : user.id}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-tertiary);">Nama Lengkap:</span>
              <span style="font-weight: 700; color: var(--text-primary);">${member ? member.full_name : user.name}</span>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-tertiary);">Email Akun:</span>
              <span>${user.email}</span>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-tertiary);">No. Telepon / WhatsApp:</span>
              <span>${member ? member.phone : '-'}</span>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-tertiary);">Tanggal Bergabung:</span>
              <span>${member ? member.join_date : user.created_at.split('T')[0]}</span>
            </div>

            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
              <span style="color: var(--text-tertiary);">Alamat Domisili:</span>
              <span style="text-align: right; max-width: 250px;">${member ? member.address : '-'}</span>
            </div>

            <div style="display: flex; justify-content: space-between; padding-top: 0.25rem;">
              <span style="color: var(--text-tertiary);">Status Keanggotaan:</span>
              <span class="badge badge-success">${member ? member.status : user.status}</span>
            </div>
          </div>
        </div>

        <!-- Loan Summary Card & Security Isolation Box -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <!-- Loan Quick Summary Card -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <span>💳 Fasilitas Pinjaman Anda</span>
              </h3>
              <span class="badge ${activeLoansCount > 0 ? 'badge-primary' : 'badge-neutral'}">
                ${activeLoansCount} Aktif
              </span>
            </div>

            <div style="font-size: 0.85rem; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="color: var(--text-tertiary);">Total Sisa Pokok Pinjaman:</span>
                <strong style="font-size: 1.15rem; color: ${totalRemainingPrincipal > 0 ? 'var(--warning-dark)' : 'var(--success)'};">
                  Rp ${totalRemainingPrincipal.toLocaleString('id-ID')}
                </strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-tertiary);">Total Fasilitas Terdaftar:</span>
                <span>${memberLoansData.length} Pengajuan</span>
              </div>
            </div>

            <a href="#/member/loans" class="btn btn-primary btn-sm" style="width: 100%; justify-content: center; text-decoration: none;">
              🔍 Buka Detail Jadwal Angsuran & Simulasi Pinjaman &rarr;
            </a>
          </div>

          <!-- Data Isolation & Privacy Guarantee Box -->
          <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color);">
            <div class="card-header" style="padding-bottom: 0.5rem;">
              <h3 class="card-title" style="font-size: 0.9rem;">
                🛡️ Jaminan Keamanan & Isolasi Data
              </h3>
            </div>

            <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6; display: flex; flex-direction: column; gap: 0.6rem;">
              <div style="padding: 0.6rem 0.75rem; background: var(--success-light); border-left: 3px solid var(--success); border-radius: var(--radius-sm); color: var(--success-text);">
                🔒 <strong>Isolasi Database Terproteksi:</strong> Kueri basis data difilter secara ketat berdasarkan ID Anggota <code>${memberId}</code>. Anda tidak dapat melihat data simpanan atau pinjaman anggota lain.
              </div>

              <div style="padding: 0.5rem 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-sm);">
                🛡️ <strong>Kredensial Aman:</strong> Password dilindungi hash PBKDF2-SHA256 (100.000 iterasi).
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;
}

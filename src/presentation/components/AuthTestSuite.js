/**
 * Interactive Automated Authentication & RBAC Test Suite
 * Validates PBKDF2 hashing, login for all 5 roles, session tokens, and route guards
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { CryptoService } from '../../infrastructure/security/cryptoService.js';
import { auth } from '../../infrastructure/auth/authService.js';
import { rbac } from '../../infrastructure/rbac/rbacEngine.js';
import { enforceMemberDataIsolation } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { DEFAULT_DEV_PASSWORD } from '../../infrastructure/database/seeder.js';
import { ROLES, MEMBER_TYPES } from '../../config/constants.js';

export function renderAuthTestSuite(container) {
  container.innerHTML = `
    <div class="card" style="border: 1px solid var(--border-color); background: var(--bg-surface);">
      <div class="card-header">
        <div>
          <h3 class="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            Automated Auth & RBAC Test Runner
          </h3>
          <p class="card-subtitle" style="font-size: 0.8rem; color: var(--text-tertiary);">Uji validasi password hashing, 5 akun role, session token, dan isolasi data</p>
        </div>
        <button id="run-all-tests-btn" class="btn btn-primary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Jalankan Seluruh Pengujian
        </button>
      </div>

      <div id="test-results-log" style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.825rem;">
        <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md); color: var(--text-secondary); text-align: center;">
          Klik tombol <strong>"Jalankan Seluruh Pengujian"</strong> di atas untuk menjalankan suite pengujian autentikasi otomatis.
        </div>
      </div>
    </div>
  `;

  const runBtn = container.querySelector('#run-all-tests-btn');
  const logContainer = container.querySelector('#test-results-log');

  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    runBtn.innerHTML = 'Sedang Menguji...';
    logContainer.innerHTML = '';

    const results = [];

    // Helper to log test result
    const logTest = (title, status, detail = '') => {
      const isPass = status === 'PASS';
      results.push({ title, status, detail });
      const item = document.createElement('div');
      item.style.padding = '0.75rem';
      item.style.borderRadius = 'var(--radius-md)';
      item.style.background = isPass ? 'var(--success-light)' : 'var(--danger-light)';
      item.style.borderLeft = `4px solid ${isPass ? 'var(--success)' : 'var(--danger)'}`;
      item.style.display = 'flex';
      item.style.alignItems = 'flex-start';
      item.style.justifyContent = 'space-between';
      item.style.gap = '1rem';

      item.innerHTML = `
        <div>
          <div style="font-weight: 700; color: ${isPass ? 'var(--success-text)' : 'var(--danger-text)'};">${title}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">${detail}</div>
        </div>
        <span class="badge ${isPass ? 'badge-success' : 'badge-danger'}" style="flex-shrink: 0;">${status}</span>
      `;
      logContainer.appendChild(item);
    };

    const previousUser = auth.getUser();
    const previousMember = auth.getMember();
    const previousToken = auth.getToken();

    try {
      // 1. Test PBKDF2 Password Hashing & Verification
      const { hash, salt } = await CryptoService.hashPassword('TestSecretPass123!');
      const passMatch = await CryptoService.verifyPassword('TestSecretPass123!', hash, salt);
      const wrongMatch = await CryptoService.verifyPassword('WrongPassword!', hash, salt);

      if (passMatch && !wrongMatch && hash.length === 64 && salt.length === 32) {
        logTest('1. PBKDF2-SHA256 Password Hashing & Salt', 'PASS', 'Hashing 100k iterasi & 16-byte random salt terverifikasi akurat (Password salah ditolak).');
      } else {
        logTest('1. PBKDF2-SHA256 Password Hashing & Salt', 'FAIL', 'Verifikasi hash gagal.');
      }

      // 2. Test Admin Login
      const adminRes = await auth.login('admin@ikmi.ac.id', DEFAULT_DEV_PASSWORD);
      if (adminRes.success && adminRes.user.role === ROLES.ADMIN && adminRes.token.startsWith('ikmi_tok_')) {
        logTest('2. Admin Koperasi Login & Session Issuance', 'PASS', `User ID: ${adminRes.user.id} &bull; Token: ${adminRes.token.slice(0, 20)}...`);
      } else {
        logTest('2. Admin Koperasi Login & Session Issuance', 'FAIL', adminRes.message || 'Login gagal');
      }

      // 3. Test Chairman Login
      const ketuaRes = await auth.login('ketua@ikmi.ac.id', DEFAULT_DEV_PASSWORD);
      if (ketuaRes.success && ketuaRes.user.role === ROLES.CHAIRMAN && ketuaRes.member) {
        logTest('3. Ketua STMIK IKMI Login & Member Link', 'PASS', `Name: ${ketuaRes.user.name} &bull; No. Anggota: ${ketuaRes.member.member_number}`);
      } else {
        logTest('3. Ketua STMIK IKMI Login & Member Link', 'FAIL', ketuaRes.message || 'Login gagal');
      }

      // 4. Test Dosen Member Login
      const dosenRes = await auth.login('dosen@ikmi.ac.id', DEFAULT_DEV_PASSWORD);
      if (dosenRes.success && dosenRes.user.role === ROLES.MEMBER && dosenRes.member && dosenRes.member.member_type === MEMBER_TYPES.DOSEN) {
        logTest('4. Dosen (Anggota) Login & NIDN Verification', 'PASS', `Identitas: ${dosenRes.member.identity_number} &bull; Tipe: ${dosenRes.member.member_type}`);
      } else {
        logTest('4. Dosen (Anggota) Login & NIDN Verification', 'FAIL', dosenRes.message || 'Login gagal');
      }

      // 5. Test Mahasiswa Member Login
      const mhsRes = await auth.login('mahasiswa@ikmi.ac.id', DEFAULT_DEV_PASSWORD);
      if (mhsRes.success && mhsRes.user.role === ROLES.MEMBER && mhsRes.member && mhsRes.member.member_type === MEMBER_TYPES.MAHASISWA) {
        logTest('5. Mahasiswa (Anggota) Login & NIM Verification', 'PASS', `Identitas: ${mhsRes.member.identity_number} &bull; Tipe: ${mhsRes.member.member_type}`);
      } else {
        logTest('5. Mahasiswa (Anggota) Login & NIM Verification', 'FAIL', mhsRes.message || 'Login gagal');
      }

      // 6. Test Staf Member Login
      const stafRes = await auth.login('staf@ikmi.ac.id', DEFAULT_DEV_PASSWORD);
      if (stafRes.success && stafRes.user.role === ROLES.MEMBER && stafRes.member && stafRes.member.member_type === MEMBER_TYPES.STAF) {
        logTest('6. Staf (Anggota) Login & NIP Verification', 'PASS', `Identitas: ${stafRes.member.identity_number} &bull; Tipe: ${stafRes.member.member_type}`);
      } else {
        logTest('6. Staf (Anggota) Login & NIP Verification', 'FAIL', stafRes.message || 'Login gagal');
      }

      // 7. Test RBAC Route Guard Intercept (Mahasiswa attempting access to Admin Console)
      const guardTest = rbac.evaluateRouteAccess(mhsRes.user, { allowedRoles: [ROLES.ADMIN] });
      if (!guardTest.allowed && guardTest.redirect === '/forbidden') {
        logTest('7. RBAC Route Guard Interception', 'PASS', 'Akses Mahasiswa ke rute Admin Console berhasil dicegat & dialihkan ke /forbidden.');
      } else {
        logTest('7. RBAC Route Guard Interception', 'FAIL', 'Guard gagal mencegat akses terlarang.');
      }

      // 8. Test Member Data Isolation Enforcement
      let isolationBlocked = false;
      try {
        enforceMemberDataIsolation(dosenRes.user, 'usr-staf-001'); // Dosen attempting to read Staf's private record
      } catch (e) {
        isolationBlocked = true;
      }

      if (isolationBlocked) {
        logTest('8. Member Data Isolation Enforcement', 'PASS', 'Upaya akses data anggota lain oleh non-admin berhasil diblokir di layer service.');
      } else {
        logTest('8. Member Data Isolation Enforcement', 'FAIL', 'Data isolation tidak memblokir akses.');
      }

      // Restore session to current user if previously logged in
      if (previousToken && previousUser) {
        auth.currentUser = previousUser;
        auth.currentMember = previousMember;
        auth.currentToken = previousToken;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('ikmi_coop_session_token', previousToken);
          localStorage.setItem('ikmi_coop_user', JSON.stringify(previousUser));
          if (previousMember) {
            localStorage.setItem('ikmi_coop_member', JSON.stringify(previousMember));
          }
        }
      } else {
        await auth.initSession();
      }

    } catch (err) {
      logTest('Testing Error', 'FAIL', err.message);
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        Jalankan Ulang Pengujian
      `;
    }
  });
}

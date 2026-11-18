/**
 * Telegram Notification & Bot Integration Settings View
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Supports:
 * - Real-time Bot status check
 * - Secure Expiring One-Time Link Code (OTP) generator
 * - Deep link connection to Telegram
 * - Manual Chat ID verification for localhost testing
 * - Role-tailored notification preferences
 * - Test notification dispatch
 * - Executive summary & installment reminder triggers
 */

import { telegramClient } from '../../infrastructure/telegram/telegramClientService.js';
import { auth } from '../../infrastructure/auth/authService.js';
import { toast } from '../components/Toast.js';
import { ROLES } from '../../config/constants.js';

export async function renderTelegramSettingsView(container, { user, navigate }) {
  const currentUser = user || auth.getUser();
  if (!currentUser) {
    navigate('/login');
    return;
  }

  let botStatus = { configured: false, botUsername: '' };
  let accountData = { linked: false, account: null };
  let activeOtpCode = null;
  let otpCountdownInterval = null;
  let linkCheckInterval = null;

  async function loadData() {
    try {
      const [statusRes, accRes] = await Promise.all([
        telegramClient.getStatus(),
        telegramClient.getAccount()
      ]);
      botStatus = statusRes || { configured: false };
      accountData = accRes || { linked: false };
    } catch (e) {
      console.warn('Failed loading Telegram data:', e);
    }
  }

  await loadData();

  function render() {
    const isLinked = Boolean(accountData && accountData.linked && accountData.account);
    if (isLinked && linkCheckInterval) {
      clearInterval(linkCheckInterval);
      linkCheckInterval = null;
    }
    const account = accountData.account || {};
    const botUser = botStatus.botUsername || 'SmartCoopIKMI_bot';

    container.innerHTML = `
      <div class="animate-fade-in" style="padding-bottom: 3.5rem;">
        
        <!-- Hero Header -->
        <div style="background: linear-gradient(135deg, #0A2540 0%, #0088cc 60%, #0284c7 100%); border-radius: var(--radius-xl); padding: 2.25rem 2rem; color: #fff; margin-bottom: 1.75rem; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;">
          <div style="position: absolute; right: -15px; bottom: -25px; opacity: 0.1; font-size: 11rem; font-weight: 900; pointer-events: none; user-select: none;">TG</div>
          
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 0.35rem 0.9rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; color: #fff;">
              <span>✈️ INTEGRASI BOT TELEGRAM RESMI</span>
              <span style="opacity: 0.5;">&bull;</span>
              <span>STMIK IKMI CIREBON</span>
            </div>

            <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: ${botStatus.configured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; padding: 0.35rem 0.8rem; border-radius: var(--radius-full); font-size: 0.725rem; font-weight: 700; color: ${botStatus.configured ? '#a7f3d0' : '#fecaca'};">
              <span>${botStatus.configured ? '🟢 SERVER BOT AKTIF' : '⚠️ BOT BELUM DIKONFIGURASI'}</span>
              ${botStatus.botUsername ? `<span style="opacity: 0.8;">(@${botStatus.botUsername})</span>` : ''}
            </div>

            <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: ${isLinked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}; padding: 0.35rem 0.8rem; border-radius: var(--radius-full); font-size: 0.725rem; font-weight: 700; color: ${isLinked ? '#a7f3d0' : '#fef08a'};">
              <span>${isLinked ? '✅ AKUN TERHUBUNG' : '⚪ AKUN BELUM TERHUBUNG'}</span>
            </div>
          </div>

          <h2 style="font-size: 1.85rem; color: #fff; margin-bottom: 0.4rem; font-family: 'Outfit', sans-serif;">
            Notifikasi Telegram & Pengaturan Akun
          </h2>
          <p style="font-size: 0.875rem; color: rgba(255,255,255,0.92); max-width: 780px; line-height: 1.6; margin: 0;">
            Dapatkan notifikasi instan dan real-time langsung ke smartphone atau desktop Anda melalui Telegram Bot Koperasi STMIK IKMI Cirebon. Transparan, aman, dan terintegrasi otomatis.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.75rem;">
          
          <!-- 1. Connection Card -->
          <div class="card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
              <h3 class="card-title" style="display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                <span>🔗 Status Koneksi Telegram</span>
              </h3>
              <span class="badge ${isLinked ? 'badge-success' : 'badge-warning'}">
                ${isLinked ? 'TERHUBUNG' : 'BELUM TERHUBUNG'}
              </span>
            </div>
            
            <div style="padding: 0.5rem 0;">
              ${isLinked ? `
                <!-- Linked State -->
                <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
                  <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    <div style="width: 50px; height: 50px; border-radius: var(--radius-full); background: #0088cc; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.6rem;">
                      ✈️
                    </div>
                    <div>
                      <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">
                        ${account.first_name || currentUser.name}
                      </div>
                      <div style="font-size: 0.825rem; color: #0088cc; font-weight: 600;">
                        ${account.telegram_username ? '@' + account.telegram_username : 'ID: ' + account.telegram_chat_id}
                      </div>
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.8rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
                    <div>
                      <span style="color: var(--text-tertiary);">Chat ID:</span>
                      <strong style="display: block; color: var(--text-primary);">${account.telegram_chat_id}</strong>
                    </div>
                    <div>
                      <span style="color: var(--text-tertiary);">Terhubung Pada:</span>
                      <strong style="display: block; color: var(--text-primary);">
                        ${account.linked_at ? new Date(account.linked_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
                  <button id="btn-test-send" class="btn btn-primary" style="flex: 1; justify-content: center; min-width: 150px;">
                    🧪 Kirim Uji Coba Pesan
                  </button>
                  <button id="btn-unlink" class="btn btn-outline-danger" style="justify-content: center;">
                    Putuskan Hubungan
                  </button>
                </div>
              ` : `
                <!-- Unlinked State -->
                <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.25rem;">
                  Hubungkan akun Anda dengan bot Telegram untuk menerima pemberitahuan otomatis mengenai simpanan, pinjaman, dan transaksi koperasi secara aman.
                </p>

                <div id="otp-generator-area">
                  <button id="btn-generate-otp" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 0.85rem; font-weight: 700;">
                    🔑 Buat Kode Verifikasi Sekali Pakai (OTP)
                  </button>
                </div>

                <div id="otp-display-area" style="display: none; margin-top: 1.25rem;"></div>

                <!-- Manual Connection Option for Localhost/Dev -->
                <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px dashed var(--border-color);">
                  <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" id="toggle-manual-link">
                    <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-tertiary);">
                      🛠️ Opsi Pengujian / Sambungkan Manual (Localhost)
                    </span>
                    <span id="manual-arrow" style="font-size: 0.75rem; color: var(--text-tertiary);">▼</span>
                  </div>

                  <div id="manual-link-panel" style="display: none; margin-top: 0.75rem;">
                    <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.5rem;">
                      Jika menjalankan sistem di localhost tanpa tunnel webhook publik, Anda dapat memasukkan Chat ID Telegram secara langsung setelah membuat kode OTP di atas.
                    </p>
                    <div style="display: flex; gap: 0.5rem;">
                      <input type="text" id="manual-chat-id" class="form-control form-control-sm" placeholder="Contoh Chat ID: 123456789" style="font-family: monospace;" />
                      <button id="btn-manual-verify" class="btn btn-secondary btn-sm" style="white-space: nowrap;">
                        Sambungkan
                      </button>
                    </div>
                  </div>
                </div>
              `}
            </div>
          </div>

          <!-- 2. Notification Preferences Card -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🔔 Preferensi Notifikasi Akun</h3>
              <span class="badge badge-primary">ROLE: ${currentUser.role}</span>
            </div>

            <p style="font-size: 0.825rem; color: var(--text-tertiary); margin-bottom: 1rem;">
              Sesuaikan jenis pemberitahuan Telegram yang ingin Anda terima sesuai dengan hak akses Anda:
            </p>

            <form id="preferences-form">
              <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.5rem;">
                
                ${currentUser.role === ROLES.ADMIN ? `
                  <label class="form-check" style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
                    <input type="checkbox" id="pref-new-member" ${account.notify_new_member !== false ? 'checked' : ''} style="margin-top: 0.2rem; transform: scale(1.2);">
                    <div>
                      <strong style="display: block; font-size: 0.875rem; color: var(--text-primary);">Pendaftaran Anggota Baru</strong>
                      <span style="font-size: 0.75rem; color: var(--text-tertiary);">Pemberitahuan saat ada anggota dosen, mahasiswa, atau staf baru yang didaftarkan.</span>
                    </div>
                  </label>
                ` : ''}

                <label class="form-check" style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
                  <input type="checkbox" id="pref-loans" ${account.notify_loan_updates !== false ? 'checked' : ''} style="margin-top: 0.2rem; transform: scale(1.2);">
                  <div>
                    <strong style="display: block; font-size: 0.875rem; color: var(--text-primary);">
                      ${currentUser.role === ROLES.MEMBER ? 'Pembaruan Pinjaman Pribadi' : 'Pengajuan & Status Pinjaman'}
                    </strong>
                    <span style="font-size: 0.75rem; color: var(--text-tertiary);">
                      ${currentUser.role === ROLES.MEMBER 
                        ? 'Notifikasi saat pinjaman Anda disetujui, ditolak, dicairkan, atau lunas.' 
                        : 'Pemberitahuan saat ada pengajuan pinjaman baru dan status persetujuan.'}
                    </span>
                  </div>
                </label>

                <label class="form-check" style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
                  <input type="checkbox" id="pref-transactions" ${account.notify_transactions !== false ? 'checked' : ''} style="margin-top: 0.2rem; transform: scale(1.2);">
                  <div>
                    <strong style="display: block; font-size: 0.875rem; color: var(--text-primary);">
                      ${currentUser.role === ROLES.MEMBER ? 'Mutasi Simpanan & Transaksi Saya' : 'Transaksi Keuangan & Buku Kas'}
                    </strong>
                    <span style="font-size: 0.75rem; color: var(--text-tertiary);">
                      ${currentUser.role === ROLES.MEMBER 
                        ? 'Bukti pencatatan digital setoran dan penarikan simpanan pokok, wajib, dan sukarela.' 
                        : 'Notifikasi mutasi kas dan pencatatan transaksi keuangan koperasi.'}
                    </span>
                  </div>
                </label>

                <label class="form-check" style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
                  <input type="checkbox" id="pref-reminders" ${account.notify_installment_reminders !== false ? 'checked' : ''} style="margin-top: 0.2rem; transform: scale(1.2);">
                  <div>
                    <strong style="display: block; font-size: 0.875rem; color: var(--text-primary);">Pengingat Pembayaran Angsuran</strong>
                    <span style="font-size: 0.75rem; color: var(--text-tertiary);">Pengingat otomatis saat mendekati jatuh tempo atau terdapat angsuran yang menunggak.</span>
                  </div>
                </label>

                ${currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.CHAIRMAN ? `
                  <label class="form-check" style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
                    <input type="checkbox" id="pref-reports" ${account.notify_reports_summary !== false ? 'checked' : ''} style="margin-top: 0.2rem; transform: scale(1.2);">
                    <div>
                      <strong style="display: block; font-size: 0.875rem; color: var(--text-primary);">Ringkasan Laporan Eksekutif</strong>
                      <span style="font-size: 0.75rem; color: var(--text-tertiary);">Rangkuman kinerja arus kas, simpanan, dan pinjaman harian atau bulanan.</span>
                    </div>
                  </label>
                ` : ''}

              </div>

              <button type="submit" class="btn btn-secondary" style="width: 100%; justify-content: center;" ${!isLinked ? 'disabled' : ''}>
                💾 Simpan Preferensi
              </button>
            </form>
          </div>

        </div>

        <!-- 3. Executive Actions Panel (Admin & Chairman Only) -->
        ${currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.CHAIRMAN ? `
          <div class="card" style="margin-bottom: 1.75rem;">
            <div class="card-header">
              <h3 class="card-title">⚡ Aksi Cepat & Otomasi Notifikasi Koperasi</h3>
              <span class="badge badge-purple">EKSEKUTIF</span>
            </div>
            
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
              Jalankan rekapitulasi real-time atau kirim pengingat tagihan massal langsung ke anggota terdaftar via Telegram:
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
              <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem; color: var(--text-primary);">📊 Ringkasan Harian</h4>
                <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.85rem;">
                  Kirim rangkuman arus kas dan status operasional hari ini ke seluruh pimpinan terhubung.
                </p>
                <button id="btn-trigger-daily-summary" class="btn btn-outline-primary btn-sm" style="width: 100%; justify-content: center;">
                  Kirim Laporan Harian
                </button>
              </div>

              <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem; color: var(--text-primary);">📅 Ringkasan Bulanan</h4>
                <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.85rem;">
                  Kirim rekapitulasi simpan pinjam dan saldo kas bulan berjalan.
                </p>
                <button id="btn-trigger-monthly-summary" class="btn btn-outline-primary btn-sm" style="width: 100%; justify-content: center;">
                  Kirim Laporan Bulanan
                </button>
              </div>

              ${currentUser.role === ROLES.ADMIN ? `
                <div style="padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                  <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem; color: var(--text-primary);">⏰ Pengingat Angsuran Massal</h4>
                  <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.85rem;">
                    Pindai seluruh jadwal angsuran mendekati jatuh tempo dan kirim pengingat ke anggota.
                  </p>
                  <button id="btn-trigger-installment-scan" class="btn btn-outline-primary btn-sm" style="width: 100%; justify-content: center;">
                    Pindai & Kirim Pengingat
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- 4. Security & Safety Guarantee Notice -->
        <div class="card" style="background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-subtle) 100%); border-left: 4px solid var(--primary-500);">
          <div style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.75rem; line-height: 1;">🛡️</div>
            <div>
              <h4 style="font-size: 0.95rem; margin: 0 0 0.35rem 0; color: var(--text-primary);">
                Jaminan Keamanan & Integritas Transaksi Keuangan
              </h4>
              <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
                1. <strong>Privasi Kredensial:</strong> Token Telegram disimpan secara eksklusif di server backend dan tidak pernah dikirim ke browser atau log publik.<br />
                2. <strong>Isolasi Transaksi:</strong> Sistem notifikasi berjalan secara asinkron (non-blocking). Gangguan jaringan Telegram tidak akan pernah membatalkan atau menggagalkan transaksi keuangan di koperasi.<br />
                3. <strong>Kode Sekali Pakai (OTP):</strong> Kode verifikasi kedaluwarsa otomatis dalam 10 menit dan hanya dapat digunakan 1 kali demi mencegah pembajakan akun.
              </p>
            </div>
          </div>
        </div>

      </div>
    `;

    attachEventListeners();
  }

  function attachEventListeners() {
    // 1. Generate OTP Code
    const btnGenOtp = container.querySelector('#btn-generate-otp');
    if (btnGenOtp) {
      btnGenOtp.addEventListener('click', async () => {
        btnGenOtp.disabled = true;
        btnGenOtp.innerHTML = '⏳ Menghasilkan Kode...';

        const res = await telegramClient.createLinkCode();
        if (res.success) {
          activeOtpCode = res.code;
          displayOtpCode(res);
          toast.success('Kode verifikasi sekali pakai berhasil dibuat.');
        } else {
          toast.error(res.error || 'Gagal membuat kode verifikasi.');
          btnGenOtp.disabled = false;
          btnGenOtp.innerHTML = '🔑 Buat Kode Verifikasi Sekali Pakai (OTP)';
        }
      });
    }

    // 2. Toggle manual link panel
    const toggleManual = container.querySelector('#toggle-manual-link');
    const manualPanel = container.querySelector('#manual-link-panel');
    const manualArrow = container.querySelector('#manual-arrow');
    if (toggleManual && manualPanel) {
      toggleManual.addEventListener('click', () => {
        const isHidden = manualPanel.style.display === 'none';
        manualPanel.style.display = isHidden ? 'block' : 'none';
        manualArrow.textContent = isHidden ? '▲' : '▼';
      });
    }

    // 3. Manual verify button
    const btnManualVerify = container.querySelector('#btn-manual-verify');
    if (btnManualVerify) {
      btnManualVerify.addEventListener('click', async () => {
        const chatIdInput = container.querySelector('#manual-chat-id');
        const chatId = chatIdInput?.value.trim();

        if (!chatId) {
          toast.warning('Masukkan Chat ID Telegram Anda terlebih dahulu.');
          return;
        }

        if (!activeOtpCode) {
          toast.warning('Harap klik "Buat Kode Verifikasi (OTP)" terlebih dahulu.');
          return;
        }

        btnManualVerify.disabled = true;
        btnManualVerify.textContent = 'Menyambungkan...';

        const res = await telegramClient.verifyCode(activeOtpCode, chatId);
        if (res.success) {
          toast.success('Akun Telegram berhasil terhubung!');
          await loadData();
          render();
        } else {
          toast.error(res.error || 'Gagal menyambungkan akun.');
          btnManualVerify.disabled = false;
          btnManualVerify.textContent = 'Sambungkan';
        }
      });
    }

    // 4. Test send notification
    const btnTest = container.querySelector('#btn-test-send');
    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        btnTest.disabled = true;
        btnTest.innerHTML = '⏳ Mengirim...';

        const res = await telegramClient.sendTestNotification();
        if (res.success) {
          toast.success(res.message || 'Pesan uji coba berhasil dikirim ke Telegram!');
        } else {
          toast.error(res.error || res.message || 'Gagal mengirim pesan uji coba.');
        }

        btnTest.disabled = false;
        btnTest.innerHTML = '🧪 Kirim Uji Coba Pesan';
      });
    }

    // 5. Unlink account
    const btnUnlink = container.querySelector('#btn-unlink');
    if (btnUnlink) {
      btnUnlink.addEventListener('click', async () => {
        if (!confirm('Apakah Anda yakin ingin memutuskan tautan bot Telegram? Anda tidak akan menerima notifikasi sampai akun dihubungkan kembali.')) {
          return;
        }

        btnUnlink.disabled = true;
        btnUnlink.textContent = 'Memutuskan...';

        const res = await telegramClient.unlink();
        if (res.success) {
          toast.info('Akun Telegram berhasil diputuskan.');
          await loadData();
          render();
        } else {
          toast.error(res.error || 'Gagal memutuskan tautan.');
          btnUnlink.disabled = false;
          btnUnlink.textContent = 'Putuskan Hubungan';
        }
      });
    }

    // 6. Preferences form
    const prefForm = container.querySelector('#preferences-form');
    if (prefForm) {
      prefForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const preferences = {
          notify_new_member: container.querySelector('#pref-new-member')?.checked ?? true,
          notify_loan_updates: container.querySelector('#pref-loans')?.checked ?? true,
          notify_transactions: container.querySelector('#pref-transactions')?.checked ?? true,
          notify_installment_reminders: container.querySelector('#pref-reminders')?.checked ?? true,
          notify_reports_summary: container.querySelector('#pref-reports')?.checked ?? true
        };

        const res = await telegramClient.updatePreferences(preferences);
        if (res.success) {
          toast.success('Preferensi notifikasi Telegram berhasil disimpan!');
          await loadData();
        } else {
          toast.error(res.error || 'Gagal menyimpan preferensi.');
        }
      });
    }

    // 7. Executive Action: Trigger Daily Summary
    const btnDaily = container.querySelector('#btn-trigger-daily-summary');
    if (btnDaily) {
      btnDaily.addEventListener('click', async () => {
        btnDaily.disabled = true;
        btnDaily.textContent = 'Mengirim...';

        const res = await telegramClient.triggerSummaryReport('Harian');
        if (res.success) {
          toast.success(`Ringkasan Laporan Harian berhasil dikirim ke ${res.delivered} akun Telegram pimpinan!`);
        } else {
          toast.error(res.error || 'Gagal mengirim ringkasan harian.');
        }

        btnDaily.disabled = false;
        btnDaily.textContent = 'Kirim Laporan Harian';
      });
    }

    // 8. Executive Action: Trigger Monthly Summary
    const btnMonthly = container.querySelector('#btn-trigger-monthly-summary');
    if (btnMonthly) {
      btnMonthly.addEventListener('click', async () => {
        btnMonthly.disabled = true;
        btnMonthly.textContent = 'Mengirim...';

        const res = await telegramClient.triggerSummaryReport('Bulanan');
        if (res.success) {
          toast.success(`Ringkasan Laporan Bulanan berhasil dikirim ke ${res.delivered} akun Telegram pimpinan!`);
        } else {
          toast.error(res.error || 'Gagal mengirim ringkasan bulanan.');
        }

        btnMonthly.disabled = false;
        btnMonthly.textContent = 'Kirim Laporan Bulanan';
      });
    }

    // 9. Executive Action: Trigger Installment Reminders Scan
    const btnScan = container.querySelector('#btn-trigger-installment-scan');
    if (btnScan) {
      btnScan.addEventListener('click', async () => {
        btnScan.disabled = true;
        btnScan.textContent = 'Memindai...';

        const res = await telegramClient.triggerInstallmentReminders();
        if (res.success) {
          toast.success(res.message || `Pengingat angsuran berhasil dikirim! (${res.sentRemindersCount} terkirim)`);
        } else {
          toast.error(res.error || 'Gagal memindai jadwal angsuran.');
        }

        btnScan.disabled = false;
        btnScan.textContent = 'Pindai & Kirim Pengingat';
      });
    }
  }

  function displayOtpCode(data) {
    const displayArea = container.querySelector('#otp-display-area');
    if (!displayArea) return;

    if (otpCountdownInterval) {
      clearInterval(otpCountdownInterval);
    }
    if (linkCheckInterval) {
      clearInterval(linkCheckInterval);
    }

    const expiresAt = new Date(data.expiresAt).getTime();
    const deepLink = data.deepLink || (botStatus.botUsername ? `https://t.me/${botStatus.botUsername.replace(/^@/, '')}?start=${data.code}` : null);

    displayArea.style.display = 'block';
    displayArea.innerHTML = `
      <div style="background: var(--primary-50); border: 2px dashed var(--primary-400); border-radius: var(--radius-lg); padding: 1.5rem; text-align: center;">
        <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 800; color: var(--primary-800); letter-spacing: 0.05em;">
          KODE VERIFIKASI SEKALI PAKAI (OTP)
        </span>
        
        <div style="font-family: monospace; font-size: 2.25rem; font-weight: 900; color: var(--primary-700); margin: 0.5rem 0; letter-spacing: 0.15em;">
          ${data.code}
        </div>

        <div id="otp-timer-badge" style="font-size: 0.8rem; font-weight: 700; color: var(--warning-dark); margin-bottom: 0.5rem;">
          ⏱️ Berlaku: 30:00 menit
        </div>

        <div style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: var(--primary-700); background: rgba(0, 136, 204, 0.1); padding: 0.25rem 0.75rem; border-radius: var(--radius-full); margin-bottom: 1rem; font-weight: 600;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #0088cc; animation: pulse 1.5s infinite;"></span>
          <span>Menunggu input di Telegram... (Otomatis terhubung)</span>
        </div>

        ${deepLink ? `
          <a href="${deepLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="display: inline-flex; justify-content: center; width: 100%; padding: 0.85rem; font-weight: 700; text-decoration: none; margin-bottom: 0.75rem;">
            ✈️ Buka Bot di Telegram (@${botStatus.botUsername})
          </a>
        ` : `
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
            Buka Telegram, cari bot <strong>@${botStatus.botUsername || 'SmartCoopIKMI_bot'}</strong> dan kirim:
            <code style="display: block; padding: 0.5rem; background: #fff; margin-top: 0.25rem;">/start ${data.code}</code>
          </p>
        `}

        <div style="text-align: left; background: #fff; padding: 0.85rem 1rem; border-radius: var(--radius-md); font-size: 0.775rem; color: var(--text-secondary); line-height: 1.5;">
          <strong>Langkah Mudah Menyambungkan:</strong>
          <ol style="margin: 0.25rem 0 0 1.2rem; padding: 0;">
            <li>Klik tombol biru <strong>Buka Bot di Telegram</strong> di atas (atau cari <b>@${botStatus.botUsername || 'SmartCoopIKMI_bot'}</b> di Telegram).</li>
            <li>Di Telegram, tekan tombol <strong>START</strong> atau kirim <code>/start ${data.code}</code> atau cukup ketik <code>${data.code}</code>.</li>
            <li>Bot akan langsung merespons dan halaman ini otomatis berubah menjadi <b>TERHUBUNG</b>!</li>
          </ol>
        </div>
      </div>
    `;

    // Start timer countdown
    function updateTimer() {
      const remainingMs = expiresAt - Date.now();
      const timerElement = container.querySelector('#otp-timer-badge');
      if (!timerElement) return;

      if (remainingMs <= 0) {
        clearInterval(otpCountdownInterval);
        if (linkCheckInterval) clearInterval(linkCheckInterval);
        timerElement.innerHTML = '❌ Kode telah kedaluwarsa. Silakan buat kode baru.';
        timerElement.style.color = 'var(--danger)';
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        timerElement.innerHTML = `⏱️ Berlaku: ${mins}:${String(secs).padStart(2, '0')} menit`;
      }
    }

    updateTimer();
    otpCountdownInterval = setInterval(updateTimer, 1000);

    // Auto-detect Telegram connection via background polling every 2.5s
    linkCheckInterval = setInterval(async () => {
      try {
        const checkRes = await telegramClient.getAccount();
        if (checkRes && checkRes.linked && checkRes.account) {
          clearInterval(linkCheckInterval);
          clearInterval(otpCountdownInterval);
          linkCheckInterval = null;
          toast.success(`🎉 Akun Telegram (@${checkRes.account.telegram_username || checkRes.account.first_name || 'Anda'}) berhasil terhubung!`);
          await loadData();
          render();
        }
      } catch {
        // Non-blocking background check
      }
    }, 2500);
  }

  render();
}

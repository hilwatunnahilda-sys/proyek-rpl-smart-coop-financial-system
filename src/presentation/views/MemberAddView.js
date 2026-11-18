import { MemberService } from '../../core/services/MemberService.js';
import { toast } from '../../js/utils/toast.js';
import { requireAuthorization } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES, MEMBER_TYPES } from '../../config/constants.js';

export function renderMemberAddView(container, { user, router }) {
  requireAuthorization(user, [ROLES.ADMIN]);

  const service = new MemberService();

  const html = `
    <div class="animate-fade-in">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Tambah Anggota Baru</h2>
        <button id="back-btn" class="btn btn-secondary">Kembali</button>
      </div>

      <div class="card" style="max-width: 800px; margin: 0 auto;">
        <form id="add-member-form" style="display: flex; flex-direction: column; gap: 1rem;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label for="member_number" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Nomor Anggota <span style="color:var(--danger)">*</span></label>
              <input type="text" id="member_number" class="form-control" required placeholder="Contoh: M-2026-001">
            </div>
            
            <div>
              <label for="identity_number" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">NIDN/NIM/NIP</label>
              <input type="text" id="identity_number" class="form-control" placeholder="Nomor Identitas">
            </div>
          </div>

          <div>
            <label for="full_name" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Nama Lengkap <span style="color:var(--danger)">*</span></label>
            <input type="text" id="full_name" class="form-control" required placeholder="Nama Lengkap">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label for="member_type" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Jenis Anggota <span style="color:var(--danger)">*</span></label>
              <select id="member_type" class="form-control" required>
                <option value="">Pilih Jenis</option>
                <option value="${MEMBER_TYPES.DOSEN}">Dosen</option>
                <option value="${MEMBER_TYPES.MAHASISWA}">Mahasiswa</option>
                <option value="${MEMBER_TYPES.STAF}">Staf</option>
              </select>
            </div>
            
            <div>
              <label for="phone" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Nomor Telepon</label>
              <input type="tel" id="phone" class="form-control" placeholder="081234567890">
            </div>
          </div>

          <div>
            <label for="address" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Alamat Lengkap</label>
            <textarea id="address" class="form-control" rows="3" placeholder="Alamat domisili"></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
            <button type="button" id="cancel-btn" class="btn btn-secondary">Batal</button>
            <button type="submit" id="submit-btn" class="btn btn-primary">Simpan Anggota</button>
          </div>

        </form>
      </div>
    </div>
  `;

  container.innerHTML = html;

  document.getElementById('back-btn').addEventListener('click', () => router.navigate('/admin/members'));
  document.getElementById('cancel-btn').addEventListener('click', () => router.navigate('/admin/members'));

  document.getElementById('add-member-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Menyimpan...';

    const data = {
      member_number: document.getElementById('member_number').value.trim(),
      identity_number: document.getElementById('identity_number').value.trim(),
      full_name: document.getElementById('full_name').value.trim(),
      member_type: document.getElementById('member_type').value,
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      user_id: null // To be linked later when they create an account
    };

    try {
      await service.create(data);
      toast.success('Anggota baru berhasil ditambahkan.');
      router.navigate('/admin/members');
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan anggota.');
      submitBtn.disabled = false;
      submitBtn.innerText = 'Simpan Anggota';
    }
  });
}

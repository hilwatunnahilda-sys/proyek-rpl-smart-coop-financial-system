import { MemberService } from '../../core/services/MemberService.js';
import { toast } from '../../js/utils/toast.js';
import { requireAuthorization } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES, MEMBER_TYPES, MEMBER_STATUS } from '../../config/constants.js';

export async function renderMemberEditView(container, { user, router, params }) {
  requireAuthorization(user, [ROLES.ADMIN]);

  const service = new MemberService();
  const id = params.id;

  container.innerHTML = `
    <div style="display:flex; justify-content:center; padding: 3rem;">
      <div class="loader"></div> <span style="margin-left: 1rem;">Memuat data anggota...</span>
    </div>
  `;

  try {
    const member = await service.getById(id);
    if (!member) {
      toast.error('Anggota tidak ditemukan.');
      router.navigate('/admin/members');
      return;
    }

    const html = `
      <div class="animate-fade-in">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 600;">Edit Anggota: ${member.full_name}</h2>
          <button id="back-btn" class="btn btn-secondary">Kembali</button>
        </div>

        <div class="card" style="max-width: 800px; margin: 0 auto;">
          <form id="edit-member-form" style="display: flex; flex-direction: column; gap: 1rem;">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label for="member_number" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Nomor Anggota <span style="color:var(--danger)">*</span></label>
                <input type="text" id="member_number" class="form-control" required value="${member.member_number}">
              </div>
              
              <div>
                <label for="identity_number" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">NIDN/NIM/NIP</label>
                <input type="text" id="identity_number" class="form-control" value="${member.identity_number}">
              </div>
            </div>

            <div>
              <label for="full_name" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Nama Lengkap <span style="color:var(--danger)">*</span></label>
              <input type="text" id="full_name" class="form-control" required value="${member.full_name}">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label for="member_type" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Jenis Anggota <span style="color:var(--danger)">*</span></label>
                <select id="member_type" class="form-control" required>
                  <option value="${MEMBER_TYPES.DOSEN}" ${member.member_type === MEMBER_TYPES.DOSEN ? 'selected' : ''}>Dosen</option>
                  <option value="${MEMBER_TYPES.MAHASISWA}" ${member.member_type === MEMBER_TYPES.MAHASISWA ? 'selected' : ''}>Mahasiswa</option>
                  <option value="${MEMBER_TYPES.STAF}" ${member.member_type === MEMBER_TYPES.STAF ? 'selected' : ''}>Staf</option>
                </select>
              </div>
              
              <div>
                <label for="phone" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Nomor Telepon</label>
                <input type="tel" id="phone" class="form-control" value="${member.phone}">
              </div>
            </div>

            <div>
              <label for="address" style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Alamat Lengkap</label>
              <textarea id="address" class="form-control" rows="3">${member.address}</textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
              <button type="button" id="cancel-btn" class="btn btn-secondary">Batal</button>
              <button type="submit" id="submit-btn" class="btn btn-primary">Simpan Perubahan</button>
            </div>

          </form>
        </div>
      </div>
    `;

    container.innerHTML = html;

    document.getElementById('back-btn').addEventListener('click', () => router.navigate('/admin/members'));
    document.getElementById('cancel-btn').addEventListener('click', () => router.navigate('/admin/members'));

    document.getElementById('edit-member-form').addEventListener('submit', async (e) => {
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
      };

      try {
        await service.update(id, data);
        toast.success('Perubahan berhasil disimpan.');
        router.navigate('/admin/members');
      } catch (error) {
        toast.error(error.message || 'Gagal menyimpan perubahan.');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Simpan Perubahan';
      }
    });

  } catch (error) {
    toast.error('Gagal memuat anggota.');
    router.navigate('/admin/members');
  }
}

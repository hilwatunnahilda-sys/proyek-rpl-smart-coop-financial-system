import { MemberService } from '../../core/services/MemberService.js';
import { toast } from '../../js/utils/toast.js';
import { requireAuthorization } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES, MEMBER_TYPES, MEMBER_STATUS } from '../../config/constants.js';

export async function renderMemberDetailView(container, { user, router, params }) {
  requireAuthorization(user, [ROLES.ADMIN, ROLES.CHAIRMAN]); // Chairman also can view details

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

    let typeBadgeClass = 'badge-primary';
    if (member.member_type === MEMBER_TYPES.MAHASISWA) typeBadgeClass = 'badge-warning';
    if (member.member_type === MEMBER_TYPES.STAF) typeBadgeClass = 'badge-purple';

    const statusBadge = member.status === MEMBER_STATUS.ACTIVE ? 'badge-success' : 'badge-danger';

    const html = `
      <div class="animate-fade-in">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 600;">Detail Anggota</h2>
          <div style="display: flex; gap: 0.5rem;">
            <button id="back-btn" class="btn btn-secondary">Kembali</button>
            ${user.role === ROLES.ADMIN ? `<button id="edit-btn" class="btn btn-primary">Edit Data</button>` : ''}
          </div>
        </div>

        <div class="card" style="max-width: 800px; margin: 0 auto;">
          <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="font-size: 1.25rem; margin-bottom: 0.25rem;">${member.full_name}</h3>
              <p style="color: var(--text-tertiary); font-size: 0.875rem;">Bergabung pada: ${member.join_date}</p>
            </div>
            <div>
              <span class="badge ${typeBadgeClass}">${member.member_type}</span>
              <span class="badge ${statusBadge}">${member.status}</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.9rem;">
            <div style="display: grid; grid-template-columns: 1fr 2fr; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-color);">
              <span style="color: var(--text-tertiary);">Nomor Anggota</span>
              <strong>${member.member_number}</strong>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 2fr; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-color);">
              <span style="color: var(--text-tertiary);">NIDN/NIM/NIP</span>
              <span>${member.identity_number || '-'}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 2fr; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-color);">
              <span style="color: var(--text-tertiary);">Nomor Telepon</span>
              <span>${member.phone || '-'}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 2fr; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-color);">
              <span style="color: var(--text-tertiary);">Alamat Domisili</span>
              <span>${member.address || '-'}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 2fr; padding-bottom: 0.5rem;">
              <span style="color: var(--text-tertiary);">Akun Tertaut (User ID)</span>
              <code>${member.user_id || 'Belum ditautkan'}</code>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    document.getElementById('back-btn').addEventListener('click', () => window.history.back());
    
    if (user.role === ROLES.ADMIN) {
      document.getElementById('edit-btn').addEventListener('click', () => {
        router.navigate(`/admin/members/edit/${id}`);
      });
    }

  } catch (error) {
    toast.error('Gagal memuat anggota.');
    router.navigate('/admin/members');
  }
}

import { MemberService } from '../../core/services/MemberService.js';
import { toast } from '../../js/utils/toast.js';
import { requireAuthorization } from '../../infrastructure/rbac/authorizationMiddleware.js';
import { ROLES, MEMBER_TYPES, MEMBER_STATUS } from '../../config/constants.js';

export async function renderMemberListView(container, { user, router }) {
  requireAuthorization(user, [ROLES.ADMIN, ROLES.CHAIRMAN], 'member.read');

  const isAdmin = user && (user.role === ROLES.ADMIN || user.role === 'ADMIN');
  const service = new MemberService();
  let members = [];
  let currentFilter = {
    search: '',
    type: '',
    status: ''
  };
  
  // State for pagination
  let currentPage = 1;
  const itemsPerPage = 10;

  async function loadData() {
    try {
      showLoading();
      members = await service.getAll();
      render();
    } catch (error) {
      toast.error('Gagal memuat data anggota.');
      console.error(error);
    }
  }

  function showLoading() {
    container.innerHTML = `
      <div style="display:flex; justify-content:center; padding: 3rem;">
        <div class="loader"></div> <span style="margin-left: 1rem;">Memuat data...</span>
      </div>
    `;
  }

  function handleFilter() {
    const searchInput = document.getElementById('search-input');
    const typeSelect = document.getElementById('type-filter');
    const statusSelect = document.getElementById('status-filter');
    
    if(searchInput) currentFilter.search = searchInput.value.toLowerCase();
    if(typeSelect) currentFilter.type = typeSelect.value;
    if(statusSelect) currentFilter.status = statusSelect.value;
    
    currentPage = 1; // reset page on filter
    render();
  }

  async function handleToggleStatus(id, currentStatus) {
    if (!confirm(`Apakah Anda yakin ingin ${currentStatus === MEMBER_STATUS.ACTIVE ? 'menonaktifkan' : 'mengaktifkan'} anggota ini?`)) {
      return;
    }
    
    try {
      if (currentStatus === MEMBER_STATUS.ACTIVE) {
        await service.deactivate(id);
        toast.success('Anggota berhasil dinonaktifkan.');
      } else {
        await service.activate(id);
        toast.success('Anggota berhasil diaktifkan.');
      }
      await loadData();
    } catch (error) {
      toast.error(error.message || 'Gagal mengubah status anggota.');
    }
  }

  function render() {
    let filtered = members.filter(m => {
      let match = true;
      if (currentFilter.search) {
        match = match && (m.full_name.toLowerCase().includes(currentFilter.search) || 
                          m.member_number.toLowerCase().includes(currentFilter.search));
      }
      if (currentFilter.type) {
        match = match && m.member_type === currentFilter.type;
      }
      if (currentFilter.status) {
        match = match && m.status === currentFilter.status;
      }
      return match;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

    let html = `
      <div class="animate-fade-in">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 600;">Manajemen Anggota</h2>
          ${isAdmin ? `
          <button id="add-member-btn" class="btn btn-primary" style="display:flex; align-items:center; gap:0.5rem;">
            <span>+</span> Tambah Anggota Baru
          </button>
          ` : `
          <span class="badge badge-info" style="padding: 0.5rem 0.75rem;">Mode Monitoring (Read-Only)</span>
          `}
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
          <div style="display:flex; gap: 1rem; flex-wrap: wrap;">
            <input type="text" id="search-input" class="form-control" placeholder="Cari nama atau No. Anggota..." value="${currentFilter.search}" style="flex:1; min-width: 200px;">
            <select id="type-filter" class="form-control" style="width: auto;">
              <option value="">Semua Jenis</option>
              <option value="${MEMBER_TYPES.DOSEN}" ${currentFilter.type === MEMBER_TYPES.DOSEN ? 'selected' : ''}>Dosen</option>
              <option value="${MEMBER_TYPES.MAHASISWA}" ${currentFilter.type === MEMBER_TYPES.MAHASISWA ? 'selected' : ''}>Mahasiswa</option>
              <option value="${MEMBER_TYPES.STAF}" ${currentFilter.type === MEMBER_TYPES.STAF ? 'selected' : ''}>Staf</option>
            </select>
            <select id="status-filter" class="form-control" style="width: auto;">
              <option value="">Semua Status</option>
              <option value="${MEMBER_STATUS.ACTIVE}" ${currentFilter.status === MEMBER_STATUS.ACTIVE ? 'selected' : ''}>Aktif</option>
              <option value="${MEMBER_STATUS.INACTIVE}" ${currentFilter.status === MEMBER_STATUS.INACTIVE ? 'selected' : ''}>Nonaktif</option>
            </select>
            <button id="apply-filter-btn" class="btn btn-secondary">Filter</button>
          </div>
        </div>
    `;

    if (filtered.length === 0) {
      html += `
        <div class="card" style="text-align: center; padding: 4rem 2rem;">
          <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem;">Data Kosong</h3>
          <p style="color: var(--text-tertiary);">Tidak ada data anggota yang sesuai dengan pencarian Anda.</p>
        </div>
      `;
    } else {
      html += `
        <div class="card" style="overflow-x: auto;">
          <table style="width:100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color);">
                <th style="padding: 1rem 0.5rem;">No. Anggota</th>
                <th style="padding: 1rem 0.5rem;">Nama Lengkap</th>
                <th style="padding: 1rem 0.5rem;">Jenis</th>
                <th style="padding: 1rem 0.5rem;">Telepon</th>
                <th style="padding: 1rem 0.5rem;">Status</th>
                <th style="padding: 1rem 0.5rem; text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
      `;

      paginated.forEach(m => {
        let typeBadge = 'badge-primary';
        if (m.member_type === MEMBER_TYPES.MAHASISWA) typeBadge = 'badge-warning';
        if (m.member_type === MEMBER_TYPES.STAF) typeBadge = 'badge-purple';
        
        let statusBadge = m.status === MEMBER_STATUS.ACTIVE ? 'badge-success' : 'badge-danger';

        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 1rem 0.5rem;"><strong>${m.member_number}</strong></td>
            <td style="padding: 1rem 0.5rem;">${m.full_name}</td>
            <td style="padding: 1rem 0.5rem;"><span class="badge ${typeBadge}">${m.member_type}</span></td>
            <td style="padding: 1rem 0.5rem;">${m.phone || '-'}</td>
            <td style="padding: 1rem 0.5rem;"><span class="badge ${statusBadge}">${m.status}</span></td>
            <td style="padding: 1rem 0.5rem; text-align: right; display: flex; justify-content: flex-end; gap: 0.5rem;">
              <button class="btn btn-sm btn-secondary view-btn" data-id="${m.id}">Detail</button>
              ${isAdmin ? `
              <button class="btn btn-sm btn-primary edit-btn" data-id="${m.id}">Edit</button>
              <button class="btn btn-sm ${m.status === MEMBER_STATUS.ACTIVE ? 'btn-danger' : 'btn-success'} toggle-btn" data-id="${m.id}" data-status="${m.status}">
                ${m.status === MEMBER_STATUS.ACTIVE ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              ` : ''}
            </td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <div style="font-size: 0.875rem; color: var(--text-secondary);">
              Menampilkan ${startIdx + 1} - ${Math.min(startIdx + itemsPerPage, filtered.length)} dari ${filtered.length} anggota
            </div>
            <div style="display:flex; gap: 0.5rem;">
              <button id="prev-page" class="btn btn-sm btn-secondary" ${currentPage === 1 ? 'disabled' : ''}>Kembali</button>
              <button id="next-page" class="btn btn-sm btn-secondary" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>Selanjutnya</button>
            </div>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
    
    // Attach event listeners
    if (document.getElementById('add-member-btn')) {
      document.getElementById('add-member-btn').addEventListener('click', () => {
        router.navigate('/admin/members/add');
      });
    }

    if (document.getElementById('apply-filter-btn')) {
      document.getElementById('apply-filter-btn').addEventListener('click', handleFilter);
      document.getElementById('search-input').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') handleFilter();
      });
    }

    if (document.getElementById('prev-page')) {
      document.getElementById('prev-page').addEventListener('click', () => {
        if(currentPage > 1) { currentPage--; render(); }
      });
      document.getElementById('next-page').addEventListener('click', () => {
        if(currentPage < totalPages) { currentPage++; render(); }
      });
    }

    // Row actions
    container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        router.navigate(`/admin/members/${e.target.dataset.id}`);
      });
    });

    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        router.navigate(`/admin/members/edit/${e.target.dataset.id}`);
      });
    });

    container.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        handleToggleStatus(e.target.dataset.id, e.target.dataset.status);
      });
    });
  }

  await loadData();
}

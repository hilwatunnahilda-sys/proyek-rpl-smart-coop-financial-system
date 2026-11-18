/**
 * Intelligent Answer Formatter & High-Precision Template Engine
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Formats factual database records into structured, concise, executive-grade Indonesian markdown.
 * Guaranteed ZERO raw JSON leakage and direct-to-the-point answers.
 */

export class IntelligentAnswerFormatter {
  static formatRupiah(amount) {
    const num = Number(amount || 0);
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
  }

  static formatAnswer(intent, dataContext, userContext = {}) {
    if (!dataContext) {
      return 'Mohon maaf, data belum dapat ditemukan dalam basis data sistem koperasi saat ini.';
    }

    if (dataContext.authorized === false) {
      const reason = dataContext.message || dataContext.reason || 'Akses ditolak berdasarkan kebijakan wewenang pengguna (RBAC).';
      return `🔒 **Akses Ditolak (RBAC):**\n${reason}\n\n*Prinsip Least Privilege diterapkan untuk menjamin privasi data keuangan civitas STMIK IKMI Cirebon.*`;
    }

    switch (intent) {
      // 1. DATA ANGGOTA
      case 'MEMBER_TOTAL': {
        const s = dataContext.summary || {};
        const b = s.breakdownTipe || {};
        return `**Total Anggota Terdaftar: ${s.totalTerdaftar || 0} orang**\n\n` +
          `- ✅ **Anggota Aktif:** ${s.totalAktif || 0} orang\n` +
          `- ⏸️ **Anggota Nonaktif:** ${s.totalNonaktif || 0} orang\n` +
          `- 👥 **Komposisi Civitas:** Dosen: ${b.dosen || 0} orang, Mahasiswa: ${b.mahasiswa || 0} orang, Staf: ${b.staf || 0} orang.\n\n` +
          `*Data diverifikasi langsung dari basis data resmi STMIK IKMI Cirebon.*`;
      }

      case 'MEMBER_ACTIVE': {
        const s = dataContext.summary || {};
        return `Berdasarkan data database koperasi STMIK IKMI, jumlah **anggota aktif** saat ini adalah **${s.totalAktif || 0} orang** (dari total ${s.totalTerdaftar || 0} anggota terdaftar).`;
      }

      case 'MEMBER_INACTIVE': {
        const s = dataContext.summary || {};
        return `Jumlah **anggota nonaktif** saat ini adalah **${s.totalNonaktif || 0} orang** (dari total ${s.totalTerdaftar || 0} anggota terdaftar).`;
      }

      case 'MEMBER_LIST': {
        const list = dataContext.members || [];
        if (list.length === 0) return 'Belum ada anggota terdaftar dalam basis data.';
        const rows = list.map((m, idx) => `${idx + 1}. **${m.fullName}** (${m.memberNumber}) &bull; ${m.memberType} &bull; Status: \`${m.status}\``).join('\n');
        return `### 📋 Daftar Anggota Koperasi (Total: ${dataContext.total || list.length} orang)\n\n${rows}`;
      }

      case 'REGISTRATION_THIS_MONTH': {
        return `**Statistik Pendaftaran Anggota Bulan Ini:**\n\n` +
          `- 📅 **Bulan Ini (${dataContext.currentPeriod}):** **${dataContext.bulanIni || 0} orang baru**\n` +
          `- 📆 **Bulan Lalu (${dataContext.previousPeriod}):** ${dataContext.bulanLalu || 0} orang\n` +
          `- 📈 **Pertumbuhan:** ${dataContext.pertumbuhan || '0%'}\n` +
          `- ☀️ **Pendaftaran Hari Ini:** ${dataContext.hariIni || 0} orang baru.`;
      }

      case 'REGISTRATION_LAST_MONTH': {
        return `Pada **${dataContext.previousPeriod}**, terdapat **${dataContext.bulanLalu || 0} orang** anggota baru yang terdaftar (berbanding ${dataContext.bulanIni || 0} orang pada ${dataContext.currentPeriod}).`;
      }

      case 'REGISTRATION_TODAY': {
        return `Pendaftaran anggota **hari ini** tercatat sebanyak **${dataContext.hariIni || 0} orang baru** (Total bulan ini: ${dataContext.bulanIni || 0} orang).`;
      }

      case 'REGISTRATION_COMPARE':
      case 'EXPLAIN_DIFFERENCE': {
        const diffSign = dataContext.selisih >= 0 ? `+${dataContext.selisih}` : `${dataContext.selisih}`;
        return `### 📊 Perbandingan Pendaftaran Anggota\n\n` +
          `- **Pendaftaran bulan ini** (${dataContext.currentPeriod}): **${dataContext.bulanIni || 0}** orang\n` +
          `- **Pendaftaran bulan lalu** (${dataContext.previousPeriod}): **${dataContext.bulanLalu || 0}** orang\n` +
          `- **Selisih**: **${diffSign}** orang (Pertumbuhan: **${dataContext.pertumbuhan || '0%'}**)\n\n` +
          `| Periode | Jumlah Pendaftar |\n` +
          `| :--- | :--- |\n` +
          `| **Bulan Ini** (${dataContext.currentPeriod}) | **${dataContext.bulanIni || 0} orang** |\n` +
          `| **Bulan Lalu** (${dataContext.previousPeriod}) | **${dataContext.bulanLalu || 0} orang** |\n` +
          `| **Selisih** | **${diffSign} orang** |\n` +
          `| **Pertumbuhan** | **${dataContext.pertumbuhan || '0%'}** |\n\n` +
          `**Kesimpulan Analisis:**\n${dataContext.keterangan || 'Data pendaftaran terekam akurat di database koperasi.'}`;
      }

      // 2. DATA SIMPANAN
      case 'SAVINGS_TOTAL': {
        const fmt = dataContext.formatted || {};
        return `**Total Saldo Simpanan Koperasi: ${fmt.total || 'Rp 0'}**\n\n` +
          `- 🔹 **Simpanan Pokok:** ${fmt.pokok || 'Rp 0'}\n` +
          `- 🔹 **Simpanan Wajib:** ${fmt.wajib || 'Rp 0'}\n` +
          `- 🔹 **Simpanan Sukarela:** ${fmt.sukarela || 'Rp 0'}\n\n` +
          `Total perputaran: Setoran ${fmt.setoran || 'Rp 0'}, Penarikan ${fmt.penarikan || 'Rp 0'} (${dataContext.totalTransaksi || 0} transaksi).`;
      }

      case 'SAVINGS_POKOK': {
        const fmt = dataContext.formatted || {};
        return `Total **Simpanan Pokok** koperasi saat ini adalah **${fmt.pokok || 'Rp 0'}** (dari total saldo simpanan ${fmt.total || 'Rp 0'}).`;
      }

      case 'SAVINGS_WAJIB': {
        const fmt = dataContext.formatted || {};
        return `Total **Simpanan Wajib** koperasi saat ini adalah **${fmt.wajib || 'Rp 0'}** (dari total saldo simpanan ${fmt.total || 'Rp 0'}).`;
      }

      case 'SAVINGS_SUKARELA': {
        const fmt = dataContext.formatted || {};
        return `Total **Simpanan Sukarela** koperasi saat ini adalah **${fmt.sukarela || 'Rp 0'}** (dari total saldo simpanan ${fmt.total || 'Rp 0'}).`;
      }

      case 'SAVINGS_TOP_SAVER': {
        const list = dataContext.topRank || [];
        if (list.length === 0) return 'Belum ada data saldo simpanan anggota yang tercatat.';
        const rows = list.map((item, idx) => `${idx + 1}. 🥇 **${item.memberName}** (${item.memberType}) — **${item.formattedSaldo}** (No. ${item.memberNumber})`).join('\n');
        return `### 🏆 Anggota dengan Saldo Simpanan Terbesar\n\n${rows}`;
      }

      case 'SAVINGS_MY': {
        const fmt = dataContext.formatted || {};
        return `**Rincian Saldo Simpanan Anda (${dataContext.memberName}):**\n\n` +
          `- 💰 **Total Saldo:** **${fmt.total || 'Rp 0'}**\n` +
          `- 🔹 Simpanan Pokok: ${fmt.pokok || 'Rp 0'}\n` +
          `- 🔹 Simpanan Wajib: ${fmt.wajib || 'Rp 0'}\n` +
          `- 🔹 Simpanan Sukarela: ${fmt.sukarela || 'Rp 0'}\n\n` +
          `Jumlah transaksi tercatat: ${dataContext.jumlahTransaksi || 0} transaksi.`;
      }

      // 3. DATA PINJAMAN
      case 'LOAN_SUMMARY': {
        const fmt = dataContext.formatted || {};
        return `**Portofolio Pinjaman Koperasi STMIK IKMI:**\n\n` +
          `- 💳 **Total Dana Disalurkan:** **${fmt.totalDisalurkan || 'Rp 0'}**\n` +
          `- ⏳ **Sisa Pokok Pinjaman (Outstanding):** **${fmt.sisaPokok || 'Rp 0'}**\n` +
          `- 🔄 **Pengembalian Masuk:** ${fmt.totalKembali || 'Rp 0'}\n` +
          `- 📊 **Status:** ${dataContext.pinjamanBerjalan || 0} pinjaman berjalan, ${dataContext.pinjamanLunas || 0} lunas, ${dataContext.pinjamanPending || 0} menunggu persetujuan.`;
      }

      case 'LOAN_ACTIVE':
      case 'LOAN_UNPAID': {
        const fmt = dataContext.formatted || {};
        return `Terdapat **${dataContext.pinjamanBerjalan || 0} pinjaman yang belum lunas (aktif/berjalan)** dengan total sisa pokok pinjaman sebesar **${fmt.sisaPokok || 'Rp 0'}**.`;
      }

      case 'LOAN_PENDING': {
        return `Terdapat **${dataContext.pinjamanPending || 0} pengajuan pinjaman** yang berstatus \`PENDING\` menunggu peninjauan dan persetujuan pengurus.`;
      }

      case 'LOAN_LIST': {
        const loans = dataContext.loans || [];
        if (loans.length === 0) return 'Tidak ada data pinjaman aktif yang tercatat saat ini.';
        const rows = loans.map((l, idx) => `${idx + 1}. **${l.loanNumber}** &bull; ${l.memberName} &bull; Pokok: ${l.formattedPrincipal} &bull; Sisa: **${l.formattedRemaining}** &bull; Tenor: ${l.tenure}`).join('\n');
        return `### 📋 Daftar Pinjaman Belum Lunas (Total: ${dataContext.total || loans.length})\n\n${rows}`;
      }

      case 'LOAN_MY': {
        const fmt = dataContext.formatted || {};
        const items = dataContext.daftarPinjaman || [];
        const itemsText = items.length > 0
          ? items.map(i => `- No. ${i.loanNumber}: Pokok ${i.pokok}, Sisa: **${i.sisaPokok}**, Status: \`${i.status}\``).join('\n')
          : '- Tidak ada pinjaman aktif saat ini.';
        return `**Status Pinjaman Anda (${dataContext.memberName}):**\n\n` +
          `- 🔹 Pinjaman Aktif: ${dataContext.pinjamanAktif || 0}\n` +
          `- ⏳ Sisa Pokok: **${fmt.sisaPokok || 'Rp 0'}**\n` +
          `- 💳 Telah Dibayar: ${fmt.telahDibayar || 'Rp 0'}\n\n` +
          `**Rincian Pinjaman:**\n${itemsText}`;
      }

      // 4. DATA ANGSURAN
      case 'INSTALLMENT_SUMMARY': {
        const fmt = dataContext.formatted || {};
        return `**Ringkasan Angsuran Koperasi:**\n\n` +
          `- 📑 Total Tagihan Terjadwal: ${fmt.totalTagihan || 'Rp 0'}\n` +
          `- 💵 Total Penerimaan Masuk: ${fmt.totalDiterima || 'Rp 0'}\n` +
          `- ⚠️ Total Nominal Tunggakan: **${fmt.nominalTunggakan || 'Rp 0'}**\n` +
          `- 📊 Rincian: ${dataContext.lunasCount || 0} lunas, ${dataContext.belumBayarCount || 0} belum lunas, ${dataContext.tunggakanCount || 0} jadwal menunggak.`;
      }

      case 'INSTALLMENT_OVERDUE': {
        const fmt = dataContext.formatted || {};
        return `Terdapat **${dataContext.tunggakanCount || 0} angsuran menunggak** dari ${dataContext.pinjamanMenunggakCount || 0} pinjaman, dengan total nominal tunggakan sebesar **${fmt.nominalTunggakan || 'Rp 0'}**.`;
      }

      case 'INSTALLMENT_UNPAID_MEMBERS': {
        const items = dataContext.items || [];
        if (items.length === 0) return 'Alhamdulillah, tidak ada anggota yang memiliki tunggakan atau angsuran belum dibayar saat ini.';
        const rows = items.slice(0, 10).map((i, idx) => `${idx + 1}. **${i.memberName}** (${i.memberNumber}) &bull; Pinjaman: ${i.loanNumber} &bull; Angsuran #${i.installmentNumber} &bull; Sisa: **${i.formattedRemaining}** &bull; Status: \`${i.status}\``).join('\n');
        return `### ⚠️ Anggota yang Belum Membayar Angsuran (Total: ${dataContext.count || items.length})\n\n${rows}`;
      }

      case 'INSTALLMENT_MY': {
        const fmt = dataContext.formatted || {};
        return `**Tagihan & Jadwal Angsuran Anda:**\n\n` +
          `- Total Jadwal Angsuran: ${dataContext.totalAngsuran || 0}\n` +
          `- Telah Dibayar: ${dataContext.telahDibayar || 0}\n` +
          `- Belum Dibayar: ${dataContext.belumDibayar || 0}\n` +
          `- Tunggakan: **${dataContext.tunggakanCount || 0} angsuran** (${fmt.totalTunggakan || 'Rp 0'})`;
      }

      // 5. LAPORAN KEUANGAN & ARUS KAS
      case 'FINANCIAL_REPORT': {
        const fmt = dataContext.formatted || {};
        return `**Laporan Arus Kas & Keuangan Koperasi:**\n\n` +
          `- 📈 **Total Pemasukan Kas:** **${fmt.pemasukan || 'Rp 0'}**\n` +
          `- 📉 **Total Pengeluaran Kas:** **${fmt.pengeluaran || 'Rp 0'}**\n` +
          `- 💰 **Surplus Kas Bersih:** **${fmt.surplusBersih || 'Rp 0'}**\n\n` +
          `Pencatatan kas dihitung real-time berbasis cash-basis mengikuti standar PSAK 27 / SAK ETAP (${dataContext.totalTransaksiBukuKas || 0} transaksi buku kas).`;
      }

      case 'FINANCIAL_INCOME': {
        const fmt = dataContext.formatted || {};
        return `**Total Pemasukan Kas Koperasi: ${fmt.pemasukan || 'Rp 0'}**\n\n` +
          `- 💰 Setoran Simpanan Masuk: ${fmt.simpananMasuk || 'Rp 0'}\n` +
          `- 💳 Pembayaran Angsuran Masuk: ${fmt.angsuranMasuk || 'Rp 0'}\n` +
          `- 🔹 Pendapatan Lain-lain: ${fmt.pendapatanLain || 'Rp 0'}`;
      }

      case 'FINANCIAL_EXPENSE': {
        const fmt = dataContext.formatted || {};
        return `**Total Pengeluaran Kas Koperasi: ${fmt.pengeluaran || 'Rp 0'}**\n\n` +
          `- 💳 Pencairan Pinjaman: ${fmt.pencairanPinjaman || 'Rp 0'}\n` +
          `- 💰 Penarikan Saldo Simpanan: ${fmt.penarikanSimpanan || 'Rp 0'}\n` +
          `- 🏢 Beban Operasional: ${fmt.bebanOperasional || 'Rp 0'}`;
      }

      case 'FINANCIAL_TREND': {
        const fmt = dataContext.formatted || {};
        return `### 📈 Analisis Tren Keuangan Koperasi\n\n` +
          `**${dataContext.kesimpulan || 'Analisis keuangan koperasi'}**\n\n` +
          `| Indikator | Bulan Ini (${dataContext.periodeBulanIni}) | Bulan Lalu (${dataContext.periodeBulanLalu}) |\n` +
          `| :--- | :--- | :--- |\n` +
          `| **Pemasukan Kas** | **${fmt.inBulanIni}** | ${fmt.inBulanLalu} |\n` +
          `| **Pengeluaran Kas** | **${fmt.outBulanIni}** | ${fmt.outBulanLalu} |\n` +
          `| **Surplus Bersih** | **${fmt.surplusBulanIni}** | ${fmt.surplusBulanLalu} |\n` +
          `| **Pertumbuhan Surplus** | **${dataContext.pertumbuhanSurplus || '0%'}** | Selisih: ${fmt.selisihSurplus} |`;
      }

      // 6. RINGKASAN KONDISI KOPERASI (EXECUTIVE SUMMARY)
      case 'COOP_SUMMARY': {
        const r = dataContext.ringkasan || {};
        const a = r.anggota || {};
        const s = r.simpanan || {};
        const p = r.pinjaman || {};
        const k = r.kas || {};
        const ang = r.angsuran || {};

        return `### 🏛️ Ringkasan Kondisi Koperasi STMIK IKMI\n\n` +
          `1. 👥 **Keanggotaan:** Total **${a.total || 0} anggota** (${a.aktif || 0} aktif, ${a.nonaktif || 0} nonaktif).\n` +
          `2. 💰 **Dana Simpanan:** Total saldo simpanan **${s.totalSaldo || 'Rp 0'}** (Pokok: ${s.pokok}, Wajib: ${s.wajib}, Sukarela: ${s.sukarela}).\n` +
          `3. 💳 **Portofolio Pinjaman:** Disalurkan **${p.totalDisalurkan || 'Rp 0'}**, Sisa Pokok: **${p.sisaPokok || 'Rp 0'}** (${p.pinjamanBerjalan || 0} pinjaman berjalan, ${p.menungguPersetujuan || 0} pending).\n` +
          `4. ⚠️ **Kualitas Angsuran:** Total tunggakan **${ang.totalTunggakan || 'Rp 0'}** dari ${ang.pinjamanMenunggak || 0} pinjaman.\n` +
          `5. 📊 **Pembukuan Kas:** Pemasukan **${k.pemasukan || 'Rp 0'}**, Pengeluaran **${k.pengeluaran || 'Rp 0'}**, **Surplus Bersih Kas: ${k.surplusBersih || 'Rp 0'}**.\n\n` +
          `*Data terverifikasi real-time dari database produksi Koperasi STMIK IKMI Cirebon.*`;
      }

      // 7. INVENTARIS / STOK
      case 'INVENTORY_QUERY': {
        return `Modul inventaris dan stok barang fisik saat ini **BELUM TERSEDIA** pada sistem Smart Co-op Financial System STMIK IKMI Cirebon.\n\nSistem saat ini difokuskan penuh pada pengelolaan simpanan (pokok, wajib, sukarela), pinjaman & pembiayaan, angsuran, dan pembukuan kas. Tidak ada data stok fisik barang yang tercatat dalam database.`;
      }

      // 8. OWN PROFILE
      case 'OWN_PROFILE': {
        return `**Profil Keanggotaan Anda:**\n\n` +
          `- 👤 **Nama Lengkap:** **${dataContext.name || '-'}**\n` +
          `- 🆔 **Nomor Anggota:** \`${dataContext.memberNumber || '-'}\`\n` +
          `- 🎓 **Peran / Kategori:** ${dataContext.memberType || dataContext.role || '-'}\n` +
          `- 📄 **Nomor Identitas (NIDN/NIM/NIP):** ${dataContext.identityNumber || '-'}\n` +
          `- 📞 **Telepon:** ${dataContext.phone || '-'}\n` +
          `- 📅 **Tanggal Bergabung:** ${dataContext.joinDate || '-'}\n` +
          `- 🟢 **Status Keanggotaan:** \`${dataContext.statusAnggota || 'ACTIVE'}\``;
      }

      // 9. OUT OF DOMAIN
      case 'OUT_OF_DOMAIN': {
        return `Mohon maaf, saya adalah **Smart Co-op Financial Assistant** khusus untuk pengelolaan administrasi dan keuangan Koperasi STMIK IKMI Cirebon. Saya hanya dapat menjawab pertanyaan seputar keanggotaan, simpanan, pinjaman, angsuran, laporan keuangan, dan fitur sistem koperasi. Silakan tanyakan hal terkait koperasi yang dapat saya bantu! 😊`;
      }

      default: {
        if (dataContext.description) return dataContext.description;
        return 'Data aktual telah diambil dari basis data sistem koperasi STMIK IKMI Cirebon.';
      }
    }
  }
}

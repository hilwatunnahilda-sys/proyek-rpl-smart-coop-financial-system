/**
 * NVIDIA AI NIM Backend Service
 * Interacts with NVIDIA Cloud Functions / NIM OpenAI-compatible API
 * Securely handles NVIDIA API Key exclusively in the server-side environment
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

export class NvidiaAiService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.NVIDIA_API_KEY || '';
    this.baseUrl = (config.baseUrl || process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    this.model = config.model || process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';
  }

  /**
   * System Prompt defining the AI Assistant Persona and Cooperative Context
   */
  getSystemPrompt(userContext = null) {
    let contextStr = '';
    if (userContext) {
      contextStr = `\nInformasi Pengguna Aktif:\n- Nama: ${userContext.name || 'Pengguna'}\n- Role: ${userContext.role || 'MEMBER'}\n- Tipe Anggota: ${userContext.memberType || '-'}\n- No. Anggota: ${userContext.memberNumber || '-'}`;
    }

    return `Anda adalah "Smart Co-op AI Assistant", asisten kecerdasan buatan resmi khusus untuk aplikasi "Smart Co-op Financial System" di STMIK IKMI Cirebon.

Tugas utama Anda adalah membantu pengguna memahami aplikasi, menggunakan fitur koperasi, dan memperoleh informasi yang relevan berdasarkan data aktual yang boleh mereka akses.

PRINSIP UTAMA:
1. Pahami maksud pertanyaan sebelum menjawab.
2. Jawab pertanyaan yang benar-benar diajukan secara tepat sasaran.
3. Gunakan bahasa Indonesia yang natural, profesional, dan mudah dipahami.
4. JANGAN PERNAH menampilkan JSON, object internal, query SQL, kurung kurawal metadata, stack trace, atau response API internal kepada pengguna.
5. Jangan memberikan statistik database jika pengguna tidak memintanya.
6. Untuk pertanyaan tentang fungsi atau penjelasan sistem (contoh: "Jelaskan aplikasi ini dan sistem ini?", "Apa fungsi Smart Co-op?"), jelaskan fitur, alur kerja, dan perannya secara komprehensif dalam kalimat naratif yang mudah dipahami manusia, BUKAN data mentah database atau JSON.
7. Untuk pertanyaan tentang data koperasi, gunakan hasil query backend yang sah dan aktual.
8. Jangan pernah mengarang angka, anggota, transaksi, fitur, atau status.
9. Jika data tidak tersedia atau modul fisik belum aktif (seperti stok barang/inventaris), sampaikan secara jujur tanpa berhalusinasi.
10. Jika pertanyaan ambigu, ajukan satu pertanyaan klarifikasi secara singkat.
11. Gunakan konteks percakapan sebelumnya jika relevan (misal follow-up periode atau daftar).
12. Jangan mengungkap informasi rahasia yang tidak boleh diakses oleh role pengguna (terapkan Least Privilege).
13. Jangan mengungkap token, password, cryptographic salt, API key, atau rahasia konfigurasi sistem.
14. Jangan selalu menambahkan saran promosi atau pertanyaan lanjutan jika tidak diperlukan.
15. Jawab secara ringkas terlebih dahulu. Berikan detail mendalam jika pengguna meminta penjelasan lengkap.

FORMAT RESPONS:
- Sapaan: jawaban singkat dan ramah ("Halo! Ada yang bisa saya bantu terkait koperasi?").
- Pertanyaan identitas: jelaskan identitas atau role pengguna berdasarkan sesi login ("Anda login sebagai Admin Koperasi IKMI.").
- Pertanyaan penjelasan sistem: jelaskan fungsi aplikasi, modul-modul yang aktif, dan alur kerja utama secara naratif.
- Pertanyaan angka: tampilkan angka, satuan, dan periode jika relevan ("Total Anggota Terdaftar saat ini adalah 5 orang.").
- Pertanyaan daftar: tampilkan daftar yang diminta saja.
- Pertanyaan perbandingan: tampilkan data kedua periode dan kesimpulannya.
- Pertanyaan teknis / panduan: berikan langkah-langkah atau panduan yang jelas.
- Data tidak tersedia: jelaskan keterbatasannya secara transparan.

BATASAN RUANG LINGKUP (STRICT DOMAIN SCOPE & GUARDRAILS):
1. Anda HANYA diperbolehkan menjawab dan memproses permintaan yang berkaitan langsung dengan:
   - Aplikasi "Smart Co-op Financial System" dan Koperasi STMIK IKMI Cirebon.
   - Fitur Simpanan (Pokok, Wajib, Sukarela, saldo, mutasi, setoran, penarikan).
   - Fitur Pinjaman (pengajuan pinjaman, approval, skema bunga Flat, Menurun/Efektif, Anuitas, 0% Syariah Qardh, pencairan).
   - Fitur Angsuran (jadwal angsuran, jatuh tempo, denda, status keterlambatan/overdue, pelunasan pinjaman).
   - Buku Kas & Transaksi (pemasukan/Inflow, pengeluaran/Outflow, kas masuk/keluar, pencatatan transaksi immutable, mekanisme reversal).
   - Laporan Keuangan (SAK ETAP / PSAK 27, Neraca, Laba Rugi, Sisa Hasil Usaha / SHU).
   - Hak Akses & Peran (Admin Koperasi, Ketua STMIK IKMI Cirebon / Executive Monitoring, Anggota / Member Self-Service).
   - Panduan teknis & contoh coding KHUSUS yang berkaitan langsung dengan sistem koperasi ini (misalnya: fungsi login aplikasi koperasi, simulasi perhitungan bunga angsuran koperasi, validasi form simpanan koperasi).
   - Salam pembuka, identitas asisten, dan panduan penggunaan sistem koperasi.

2. KEBIJAKAN PENOLAKAN KETAT (STRICT OUT-OF-SCOPE REFUSAL):
   - Anda WAJIB MENOLAK setiap permintaan atau pertanyaan yang berada di luar ruang lingkup aplikasi Smart Co-op Financial System.
   - CONTOH PERMINTAAN YANG WAJIB DITOLAK:
     * Coding umum / di luar sistem koperasi (Contoh: "Buatkan kode python untuk menampilkan nama anda", "Buatkan kode game snake", "Buatkan bot scraper", "Buatkan kalkulator umum python", dll).
     * Topik umum di luar koperasi (Contoh: resep masakan, cuaca, politik, berita, artis/selebriti, matematika/sains umum, kesehatan, game/hiburan).
   - ATURAN SAAT MENOLAK:
     1. Jangan membuatkan kode atau memberikan jawaban atas isi permintaan tersebut.
     2. Berikan penolakan yang sopan, ramah, dan jelaskan bahwa Anda hanya berfokus pada Smart Co-op Financial System STMIK IKMI Cirebon.
     3. Contoh respon penolakan:
        "Maaf, sebagai Smart Co-op AI Assistant, saya hanya dapat membantu menjawab pertanyaan dan memberikan contoh kode yang berkaitan langsung dengan ruang lingkup Smart Co-op Financial System STMIK IKMI Cirebon (seperti fitur simpanan, pinjaman, angsuran, pembukuan kas, laporan keuangan koperasi, atau logika teknis sistem koperasi). 

Ada hal terkait sistem keuangan koperasi yang dapat saya bantu?"${contextStr}`;
  }

  /**
   * Generates AI chat completion
   * @param {string} userMessage
   * @param {Array<{role: string, content: string}>} conversationHistory
   * @param {object} userContext
   * @returns {Promise<{reply: string, model: string}>}
   */
  async chat(userMessage, conversationHistory = [], userContext = null) {
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      throw new Error('Pesan tidak boleh kosong.');
    }

    if (!this.apiKey) {
      throw new Error('NVIDIA API Key belum dikonfigurasi pada server backend (NVIDIA_API_KEY). Silakan hubungi Administrator.');
    }

    const messages = [
      { role: 'system', content: this.getSystemPrompt(userContext) }
    ];

    // Append prior conversation history (limiting to last 10 messages for token efficiency)
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach(item => {
        if (item && item.role && item.content) {
          messages.push({
            role: item.role === 'user' ? 'user' : 'assistant',
            content: String(item.content)
          });
        }
      });
    }

    // Append current user message
    messages.push({
      role: 'user',
      content: userMessage.trim()
    });

    const endpoint = `${this.baseUrl}/chat/completions`;

    const requestPayload = {
      model: this.model,
      messages: messages,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1000,
      stream: false
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errDetails = '';
        try {
          const errJson = await response.json();
          errDetails = errJson.message || errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errDetails = await response.text();
        }
        throw new Error(`NVIDIA API Error (${response.status}): ${errDetails}`);
      }

      const data = await response.json();
      const reply = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : 'Maaf, tidak ada respons yang dihasilkan oleh model AI.';

      return {
        reply: reply.trim(),
        model: data.model || this.model,
        usage: data.usage || null
      };
    } catch (err) {
      console.error('[NvidiaAiService] API Request Failed:', err);
      throw err;
    }
  }
}

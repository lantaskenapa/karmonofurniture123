// js/main.js — VERSI FINAL + REALTIME PENGELUARAN 100% JALAN!

import { initUI } from './ui.js';

// ==================== INISIALISASI FIREBASE ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgQffKzO-b15e21Oe6n_SiqkyTzfe69NE",
  authDomain: "karmono-furniture-9d021.firebaseapp.com",
  projectId: "karmono-furniture-9d021",
  storageBucket: "karmono-furniture-9d021.firebasestorage.app",
  messagingSenderId: "167366354680",
  appId: "1:167366354680:web:0911b8f475fc16d7dc7d0d",
  measurementId: "G-KZ894CFM7C"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const projectsCol = collection(db, 'projects');

// ==================== HELPER ====================
const formatRupiah = (angka) => {
  if (!angka) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(angka);
};

const formatTanggal = (tgl) => {
  if (!tgl) return '-';
  if (typeof tgl === 'string' && tgl.includes('/')) return tgl;
  const date = new Date(tgl);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }); // → 28 November 2025
};

// Card project (index.html)
function createProjectCard(project, docId) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.dataset.docId = docId;

  // FIX: Langsung ambil project.tanggal — karena di ui.js sudah disimpan ke sini!


  const tanggalMulai = formatTanggal(project.tanggal);

  const urgensiBadge = project.urgensi === 'Rush'
    ? `<span class="urgensi-badge rush">RUSH</span>`
    : `<span class="urgensi-badge normal">Normal</span>`;

  div.innerHTML = `
  <div class="file-icon ${project.urgensi === 'Rush' ? 'purple' : 'yellow'}">
    <i class="fas fa-folder"></i>
  </div>
  <div class="file-info">
    <div class="title-and-budget">
      <div class="title-and-location">
        <h4 class="project-title-long">${project.nama || 'Tanpa Nama'}</h4>
        <p class="text-sm location-line">${project.lokasi || '-'} -</p>
      </div>
      <div class="budget-and-urgensi">
        <span class="budget-text">${formatRupiah(project.anggaran)}</span>
        <div class="urgensi-container-revised">
          ${urgensiBadge}
        </div>
      </div>
    </div>
    <div class="bottom-line">
      <p class="text-sm estimate-line">${project.estimasi || '-'}</p>
      <p class="text-sm tanggal-mulai-kecil">${tanggalMulai}</p>
    </div>
  </div>`;

  div.style.cursor = 'pointer';
  div.addEventListener('click', () => {
    localStorage.setItem('currentProject', project.nama);
    localStorage.setItem('currentProjectDocId', docId);
    window.location.href = 'project-detail.html';
  });
  return div;
}

// Render daftar proyek
function renderProjectsRealtime() {
  const container = document.querySelector('.file-list');
  if (!container) return;

  container.innerHTML = '<p class="text-center col-span-full py-10">Memuat proyek dari cloud...</p>';

  onSnapshot(projectsCol, (snapshot) => {
    container.innerHTML = '';
    if (snapshot.empty) {
      container.innerHTML = '<p class="text-center text-gray-500 col-span-full py-10">Belum ada proyek. Klik tombol + untuk menambahkan.</p>';
      return;
    }
       snapshot.forEach(doc => {
      const projectData = doc.data();
      const docId = doc.id;

      // Simpan data untuk sorting
      window.projectData[docId] = projectData;

      // Buat card
      const card = createProjectCard(projectData, docId);
      container.appendChild(card);
    });

    // Sort ulang setelah data dimuat (pakai sort default)
    sortProjectsNow();

  }, (err) => {
    console.error("Error realtime:", err);
    container.innerHTML = '<p class="text-danger">Gagal memuat data.</p>';
  });
}

// Load detail proyek
async function loadProjectDetail() {
  if (!location.pathname.includes('project-detail.html')) return;

  const docId = localStorage.getItem('currentProjectDocId');
  if (!docId) {
    document.getElementById('projectTitle')?.replaceChildren('Proyek tidak ditemukan');
    return;
  }

  try {
    // 1. Load data utama proyek (nama, anggaran, dll)
    const docSnap = await getDoc(doc(db, 'projects', docId));
    if (!docSnap.exists()) {
      document.getElementById('projectTitle')?.replaceChildren('Proyek tidak ditemukan');
      return;
    }

    const data = docSnap.data();
    const el = id => document.getElementById(id);
    if (el('projectTitle')) el('projectTitle').textContent = data.nama || 'Tanpa Nama';
    if (el('infoAnggaran')) el('infoAnggaran').textContent = formatRupiah(data.anggaran);
    if (el('infoEstimasi')) el('infoEstimasi').textContent = data.estimasi || '-';
    if (el('infoTanggal')) el('infoTanggal').textContent = data.tanggal || '-';
    if (el('infoLokasi')) el('infoLokasi').textContent = data.lokasi || '-';

    const urgensiEl = el('infoUrgensi');
    if (urgensiEl) {
      urgensiEl.innerHTML = data.urgensi === 'Rush'
        ? `<span class="detail-urgensi-badge rush">Rush</span>`
        : `<span class="detail-urgensi-badge normal">Normal</span>`;
    }

    // 2. BARU: Load semua pengeluaran dari subcollection "pengeluaran" (real-time!)
    const pengeluaranCol = collection(db, 'projects', docId, 'pengeluaran');
    const tbody = document.querySelector('#tabelPengeluaran tbody');

    if (!tbody) return; // kalau tabelnya nggak ada, skip

    // Listener real-time
    // Listener real-time — VERSI AMAN + EVENT DELEGATION (INI YANG HARUS KAMU PAKAI!)
onSnapshot(pengeluaranCol, (snapshot) => {
      tbody.innerHTML = '';
      let grandTotal = 0;

      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-8">Belum ada pengeluaran</td></tr>';
        document.getElementById('totalPengeluaranAll').textContent = 'Rp 0';
        return;
      }

      // Urutkan dari terbaru
      const sortedDocs = snapshot.docs.sort((a, b) => 
        (b.data().timestamp?.toDate() || 0) - (a.data().timestamp?.toDate() || 0)
      );

      sortedDocs.forEach(doc => {
        const p = doc.data();
        const totalItem = p.total || 0;
        grandTotal += totalItem;

        const row = document.createElement('tr');
        row.dataset.docId = doc.id;

        row.innerHTML = `
          <td>${p.keterangan || '-'}</td>
          <td>${p.jumlah || 1}</td>
          <td>${formatRupiah(p.hargaSatuan || 0)}</td>
          <td>${p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID') : '-'}</td>
          <td>${formatRupiah(totalItem)}</td>
          <td style="text-align:center; white-space:nowrap;">
            <button class="btn-edit-pengeluaran" style="background:none; border:none; color:#06b6d4; font-size:18px; cursor:pointer; padding:6px;" title="Edit">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn-delete-pengeluaran" style="background:none; border:none; color:#ef4444; font-size:18px; cursor:pointer; padding:6px;" title="Hapus">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        `;

        row.querySelector('.btn-edit-pengeluaran').addEventListener('click', () => {
          window.editPengeluaran(doc.id, p);
        });

        row.querySelector('.btn-delete-pengeluaran').addEventListener('click', () => {
          window.hapusPengeluaran(doc.id);
        });

        tbody.appendChild(row);
      });

      // UPDATE TOTAL DI LUAR TABEL (INI YANG PENTING!)
      const totalEl = document.getElementById('totalPengeluaranAll');
      if (totalEl) {
        totalEl.textContent = formatRupiah(grandTotal);
      }
    }, (err) => {
      console.error("Error load pengeluaran:", err);
      tbody.innerHTML = '<tr><td colspan="6" class="text-danger">Gagal memuat pengeluaran</td></tr>';
    });

const dpCol = collection(db, 'projects', docId, 'dp');
    const tbodyDP = document.querySelector('#tabelDP tbody');

    if (tbodyDP) {
      onSnapshot(dpCol, (snapshot) => {
        tbodyDP.innerHTML = '';
        let totalDP = 0;   // ← ini yang baru: hitung total

        if (snapshot.empty) {
          tbodyDP.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-8">Belum ada Down Payment</td></tr>';
          document.getElementById('totalDownPayment').textContent = 'Rp 0';
          return;
        }

        // Urutkan dari terbaru
        const sorted = snapshot.docs.sort((a, b) => 
          (b.data().timestamp?.toDate() || 0) - (a.data().timestamp?.toDate() || 0)
        );

        sorted.forEach(doc => {
          const d = doc.data();
          const nominal = d.nominal || 0;
          totalDP += nominal;   // ← tambah ke total

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${d.termin || '-'}</td>
            <td>${formatRupiah(nominal)}</td>
            <td>${d.tanggal ? new Date(d.tanggal).toLocaleDateString('id-ID') : '-'}</td>
            <td style="text-align:center; white-space:nowrap;">
              <button class="btn-delete-dp" style="background:none;border:none;color:#ef4444;font-size:18px;cursor:pointer;padding:6px;" title="Hapus">
                <i class="fas fa-trash-alt"></i>
              </button>
            </td>
          `;

          row.querySelector('.btn-delete-dp').addEventListener('click', () => {
            if (confirm('Hapus DP ini?')) {
              deleteDoc(doc.ref)
                .then(() => alert('DP dihapus!'))
                .catch(() => alert('Gagal hapus!'));
            }
          });

          tbodyDP.appendChild(row);
        });

        // UPDATE TOTAL DOWN PAYMENT DI LUAR TABEL
        const totalDPEl = document.getElementById('totalDownPayment');
        if (totalDPEl) {
          totalDPEl.textContent = formatRupiah(totalDP);
        }
      }, (err) => {
        console.error("Error load DP:", err);
        tbodyDP.innerHTML = '<tr><td colspan="4" class="text-danger">Gagal memuat DP</td></tr>';
      });
    }





  } catch (err) {
    console.error("Gagal load detail:", err);
  }
}

// Export global
window.createProjectCard = createProjectCard;
window.projectsCol = projectsCol;
window.addDoc = addDoc;
window.db = db;
window.formatRupiah = formatRupiah;

import { ModalManager } from './modal-manager.js';

// ==================== LOGIKA MODAL PENGELUARAN — DIPINDAH KE SINI! ====================
function hitungTotalPengeluaran() {
  const qty = parseInt(document.getElementById('qty')?.value) || 0;
  const harga = parseInt(document.getElementById('hargaSatuan')?.value) || 0;
  const totalEl = document.getElementById('totalRp');
  if (totalEl) totalEl.textContent = formatRupiah(qty * harga);
}

function initPengeluaranModal() {
  const keterangan = document.getElementById('keterangan');
  const qty = document.getElementById('qty');
  const hargaSatuan = document.getElementById('hargaSatuan');
  const tanggal = document.getElementById('tanggalPengeluaran');

  // Reset form
  if (keterangan) keterangan.value = '';
  if (qty) qty.value = 1;
  if (hargaSatuan) hargaSatuan.value = '';
  if (tanggal) tanggal.valueAsDate = new Date();

  hitungTotalPengeluaran();

  // Hapus listener lama
  qty?.removeEventListener('input', hitungTotalPengeluaran);
  hargaSatuan?.removeEventListener('input', hitungTotalPengeluaran);

  // Pasang listener realtime
  qty?.addEventListener('input', hitungTotalPengeluaran);
  hargaSatuan?.addEventListener('input', hitungTotalPengeluaran);

  // TOMBOL SIMPAN — SEKARANG SUDAH SIMPAN KE FIREBASE + UPDATE TABEL OTOMATIS!
  const btnSimpan = document.getElementById('btnSimpanPengeluaran');
  if (btnSimpan) {
    btnSimpan.onclick = async function() {
      const ket = keterangan?.value.trim();
      if (!ket) {
        alert('Keterangan wajib diisi!');
        return;
      }

      const jumlah = parseInt(qty.value) || 1;
      const harga = parseInt(hargaSatuan.value) || 0;
      const total = jumlah * harga;
      const tgl = tanggal.value || new Date().toISOString().split('T')[0];

      const projectId = localStorage.getItem('currentProjectDocId');
      if (!projectId) {
        alert('Error: Proyek tidak ditemukan!');
        return;
      }

      try {
        // SIMPAN KE FIREBASE
        await addDoc(collection(db, 'projects', projectId, 'pengeluaran'), {
          keterangan: ket,
          jumlah: jumlah,
          hargaSatuan: harga,
          total: total,
          tanggal: tgl,
          timestamp: new Date()
        });

        // TUTUP MODAL
        ModalManager.close('pengeluaranModal');

        // ALERT SUKSES
        alert('Pengeluaran berhasil disimpan ke database!');

        // TABEL AKAN UPDATE OTOMATIS karena ada onSnapshot di loadProjectDetail()

      } catch (error) {
        console.error("Gagal simpan pengeluaran:", error);
        alert('Gagal menyimpan! Cek konsol (F12)');
      }
    };
  }
}

// GANTI TOTAL fungsi tambahPengeluaran
window.tambahPengeluaran = async function () {
  const modalId = 'pengeluaranModal';

  if (document.getElementById(modalId)) {
    ModalManager.open(modalId);
    initPengeluaranModal();
    return;
  }

  await ModalManager.load('modals/pengeluaran-modal.html', modalId, () => {
    ModalManager.open(modalId);
    initPengeluaranModal();
  });
};

// DP Modal (jika butuh nanti)
window.tambahDP = async function () {
  const modalId = 'dpModal';

  const initDPModal = () => {
    const nominalEl = document.getElementById('dpNominal');
    const totalEl = document.getElementById('dpTotalRp');
    const tanggalEl = document.getElementById('dpTanggal');

    // Reset
    document.getElementById('dpTermin').value = '';
    nominalEl.value = '';
    tanggalEl.valueAsDate = new Date();
    totalEl.textContent = 'Rp 0';

    // Real-time format rupiah
    nominalEl.oninput = () => {
      const val = parseInt(nominalEl.value) || 0;
      totalEl.textContent = formatRupiah(val);
    };

    // Simpan DP
    document.getElementById('btnSimpanDP').onclick = async () => {
      const termin = document.getElementById('dpTermin').value.trim();
      const nominal = parseInt(nominalEl.value) || 0;
      const tanggal = tanggalEl.value;

      if (!termin || nominal <= 0) {
        alert('Termin dan nominal wajib diisi!');
        return;
      }

      try {
        await addDoc(collection(db, 'projects', localStorage.getItem('currentProjectDocId'), 'dp'), {
          termin,
          nominal,
          tanggal,
          timestamp: new Date()
        });

        ModalManager.close(modalId);
        alert('Down Payment berhasil disimpan!');
      } catch (err) {
        console.error(err);
        alert('Gagal menyimpan DP!');
      }
    };
  };

  if (document.getElementById(modalId)) {
    ModalManager.open(modalId);
    initDPModal();
  } else {
    await ModalManager.load('modals/dp-modal.html', modalId, () => {
      ModalManager.open(modalId);
      initDPModal();
    });
  }
};

let currentEditDocId = null;

window.editPengeluaran = async function(docId, data) {
  currentEditDocId = docId;
  const modalId = 'editPengeluaranModal';

  const openAndFill = () => {
    ModalManager.open(modalId);

    // Isi form
    document.getElementById('editKeterangan').value = data.keterangan || '';
    document.getElementById('editQty').value = data.jumlah || 1;
    document.getElementById('editHargaSatuan').value = data.hargaSatuan || 0;
    document.getElementById('editTanggal').value = data.tanggal || new Date().toISOString().split('T')[0];

    // Hitung total otomatis
    const hitung = () => {
      const qty = parseInt(document.getElementById('editQty').value) || 0;
      const harga = parseInt(document.getElementById('editHargaSatuan').value) || 0;
      document.getElementById('editTotalRp').textContent = formatRupiah(qty * harga);
    };
    hitung();

    // Event listener
    document.getElementById('editQty').oninput = hitung;
    document.getElementById('editHargaSatuan').oninput = hitung;

    // Tombol Update
    const btnUpdate = document.getElementById('btnUpdatePengeluaran');
    btnUpdate.onclick = async () => {
      const updatedData = {
        keterangan: document.getElementById('editKeterangan').value.trim(),
        jumlah: parseInt(document.getElementById('editQty').value) || 1,
        hargaSatuan: parseInt(document.getElementById('editHargaSatuan').value) || 0,
        total: (parseInt(document.getElementById('editQty').value) || 1) * (parseInt(document.getElementById('editHargaSatuan').value) || 0),
        tanggal: document.getElementById('editTanggal').value
      };

      try {
        await updateDoc(doc(db, 'projects', localStorage.getItem('currentProjectDocId'), 'pengeluaran', docId), updatedData);
        ModalManager.close(modalId);
        alert('Pengeluaran berhasil diperbarui!');
      } catch (err) {
        console.error(err);
        alert('Gagal update pengeluaran!');
      }
    };
  };

  if (document.getElementById(modalId)) {
    openAndFill();
  } else {
    await ModalManager.load('modals/edit-pengeluaran-modal.html', modalId, openAndFill);
  }
};

window.hapusPengeluaran = async function(docId) {
  const modalId = 'deleteConfirmModal';

  const openConfirm = () => {
    ModalManager.open(modalId);
    document.getElementById('btnConfirmDelete').onclick = async () => {
      try {
        await deleteDoc(doc(db, 'projects', localStorage.getItem('currentProjectDocId'), 'pengeluaran', docId));
        ModalManager.close(modalId);
        alert('Pengeluaran berhasil dihapus!');
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus!');
      }
    };
  };

  if (document.getElementById(modalId)) {
    openConfirm();
  } else {
    await ModalManager.load('modals/delete-confirm-modal.html', modalId, openConfirm);
  }
};



// ==================== POPUP LIST EDIT PROJECT ====================
document.getElementById('openEditListPopup')?.addEventListener('click', async () => {
  let overlay = document.getElementById('editListOverlay');
  let modal   = document.getElementById('editListModal');

  // Kalau modal belum ada → load sekali saja
  if (!overlay || !modal) {
    try {
      const response = await fetch('partials/edit-project-list-popup.html');
      if (!response.ok) throw new Error('Gagal load popup');
      const html = await response.text();

      const temp = document.createElement('div');
      temp.innerHTML = html;

      overlay = temp.querySelector('#editListOverlay');
      modal   = temp.querySelector('#editListModal');

      if (!overlay || !modal) throw new Error('HTML popup rusak');

      // Inject ke body (pasti di akhir, tapi karena fixed → aman!)
      document.body.appendChild(overlay);
      document.body.appendChild(modal);

    } catch (err) {
      console.error(err);
      alert('Gagal membuka daftar edit project!');
      return;
    }
  }

  // === TAMPILKAN MODAL ===
  overlay.classList.add('show');
  modal.classList.add('show');

  const container = document.getElementById('editProjectList');
  if (!container) return;

  container.innerHTML = '<p class="text-center py-8 text-gray-500">Memuat project...</p>';

  // Realtime listener
  let unsubscribe = () => {};
  unsubscribe = onSnapshot(projectsCol, (snapshot) => {
    if (snapshot.empty) {
      container.innerHTML = '<p class="text-center py-10 text-gray-500">Belum ada project.</p>';
      return;
    }

    container.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;

      const tanggal = data.tanggal 
        ? new Date(data.tanggal).toLocaleDateString('id-ID')
        : '-';

      const row = document.createElement('div');
      row.className = 'project-row';
      row.innerHTML = `
        <div class="project-info">
          <h5>${data.nama || 'Tanpa Nama'}</h5>
          <p>${data.lokasi || '-'} • ${formatRupiah(data.anggaran)} • ${tanggal}</p>
        </div>
        <button class="btn-edit-row" data-docid="${docId}">
          <i class="fas fa-pen"></i> Edit
        </button>
      `;

      row.querySelector('.btn-edit-row').addEventListener('click', () => {
        openEditProjectPopup(docId);
        closeList(); // langsung tutup list-nya
      });

      container.appendChild(row);
    });
  }, (err) => {
    console.error('Error realtime:', err);
    container.innerHTML = '<p class="text-danger">Gagal memuat data project.</p>';
  });

  // === TUTUP MODAL ===
  const closeList = () => {
    overlay.classList.remove('show');
    modal.classList.remove('show');
    unsubscribe(); // stop listener biar nggak boros
  };

  // Event close (cuma dipasang sekali per buka)
  const closeBtn = document.getElementById('editListCloseBtn');
  if (closeBtn) closeBtn.onclick = closeList;

  overlay.onclick = (e) => {
    if (e.target === overlay) closeList();
  };
});





// ==================== DOM LOADED ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Karmono Furniture + Firebase siap!');

  initUI();
  renderProjectsRealtime();
  loadProjectDetail();

  if (location.pathname.includes('project-detail.html')) {
    const btnPengeluaran = document.getElementById('btnTambahPengeluaran');
    const btnDP = document.getElementById('btnTambahDP');

    if (btnPengeluaran) {
      btnPengeluaran.addEventListener('click', window.tambahPengeluaran);
    }
    if (btnDP) {
      btnDP.addEventListener('click', window.tambahDP);
    }

    // ———— TAMBAHKAN DARI SINI KE BAWAH ————
    const btnSelesai = document.getElementById('btnSelesaiProject');
    const btnHapus = document.getElementById('btnHapusProject');

    if (btnSelesai) {
      btnSelesai.addEventListener('click', async () => {
        if (confirm('Tandai project ini sebagai SELESAI?\nData tetap tersimpan dan bisa dibuka kembali.')) {
          try {
            await updateDoc(doc(db, 'projects', localStorage.getItem('currentProjectDocId')), {
              status: 'Selesai',
              tanggalSelesai: new Date().toISOString().split('T')[0]
            });
            alert('Project berhasil ditandai SELESAI!');
            history.back(); // kembali ke daftar proyek
          } catch (err) {
            console.error(err);
            alert('Gagal update status project!');
          }
        }
      });
    }

    if (btnHapus) {
      btnHapus.addEventListener('click', async () => {
        const namaProject = localStorage.getItem('currentProject') || 'Project ini';
        if (confirm(`YAKIN ingin HAPUS project "${namaProject}"?\n\nSemua data pengeluaran & DP akan ikut terhapus!`)) {
          if (confirm('KONFIRMASI ULANG: Ini TIDAK BISA DIBALIK!')) {
            try {
              await deleteDoc(doc(db, 'projects', localStorage.getItem('currentProjectDocId')));
              alert('Project berhasil dihapus permanen!');
              localStorage.removeItem('currentProject');
              localStorage.removeItem('currentProjectDocId');
              window.location.href = 'index.html';
            } catch (err) {
              console.error(err);
              alert('Gagal menghapus project!');
            }
          }
        }
      });
    }
    // ———— SAMPAI SINI ————
  }
});

// ==================== SORT BY POPUP – FILE TERPISAH, SUPER RAPIH ====================
let currentSort = 'terdekat'; // default sort
window.projectData = {};      // simpan data project untuk sorting

// Load popup sort saat tombol "Sort by" diklik
document.getElementById('openSortPopup')?.addEventListener('click', () => {
  fetch('partials/sort-popup.html')
    .then(r => r.text())
    .then(html => {
      // Masukkan popup ke body
      document.body.insertAdjacentHTML('beforeend', html);

      // Tampilkan popup
      document.getElementById('sortPopupOverlay').classList.add('show');
      document.getElementById('sortPopup').classList.add('show');

      // Klik salah satu opsi sort
      document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', function () {
          // Hapus active dari semua, tambah ke yang dipilih
          document.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
          this.classList.add('active');

          currentSort = this.dataset.sort;
          sortProjectsNow(); // langsung sort
          closeSortPopup();
        });
      });

      // Tombol close & klik luar
      document.getElementById('sortCloseBtn').onclick = closeSortPopup;
      document.getElementById('sortPopupOverlay').onclick = closeSortPopup;
    })
    .catch(err => console.error('Gagal load sort popup:', err));
});

function closeSortPopup() {
  document.getElementById('sortPopupOverlay')?.remove();
  document.getElementById('sortPopup')?.remove();
}

// Fungsi utama sorting
// Ganti seluruh fungsi sortProjectsNow() dengan ini:
function sortProjectsNow() {
  const container = document.querySelector('.file-list');
  if (!container) return;

  const cards = Array.from(container.children);

  // Helper: konversi tanggal DD/MM/YYYY atau YYYY-MM-DD jadi Date yang valid
  const parseTanggal = (tgl) => {
    if (!tgl) return new Date('9999-12-31'); // jauh banget
    let date;
    if (typeof tgl === 'string') {
      // Coba format DD/MM/YYYY (dari project lama)
      if (tgl.includes('/')) {
        const [d, m, y] = tgl.split('/');
        date = new Date(`${y}-${m}-${d}`);
      } else {
        date = new Date(tgl);
      }
    } else {
      date = new Date(tgl);
    }
    return isNaN(date) ? new Date('9999-12-31') : date;
  };

  cards.sort((a, b) => {
    const idA = a.dataset.docId;
    const idB = b.dataset.docId;
    const dataA = window.projectData[idA] || {};
    const dataB = window.projectData[idB] || {};

    const dateA = parseTanggal(dataA.tanggal);
    const dateB = parseTanggal(dataB.tanggal);

    switch (currentSort) {
      case 'terdekat':
        return dateA - dateB;                    // kecil → besar
      case 'terjauh':
        return dateB - dateA;                    // besar → kecil
      case 'rush':
        const rushA = dataA.urgensi === 'Rush' ? 0 : 1;
        const rushB = dataB.urgensi === 'Rush' ? 0 : 1;
        return rushA - rushB;
      case 'budget-desc':
        return (dataB.anggaran || 0) - (dataA.anggaran || 0);
      case 'budget-asc':
        return (dataA.anggaran || 0) - (dataB.anggaran || 0);
      default:
        return 0;
    }
  });


  // Render ulang sesuai urutan baru
  cards.forEach(card => container.appendChild(card));
}

// ==================== EDIT PROJECT – VERSI AMAN & CANTIK (PAKAI OVERLAY HITAM) ====================
// ==================== EDIT PROJECT – TANPA TAILWIND, PAKAI CSS BIASA ====================
let currentEditProjectId = null;

// === EDIT PROJECT — VERSI FIX 100% (MUNGKIN DI TENGAH LAYAR, TIDAK DI BAWAH FOOTER) ===
// === EDIT PROJECT — FINAL FIX (MUNcul di tengah + data ter-load 100%) ===
// ==================== EDIT PROJECT — FINAL FIX 100% JALAN! ====================
async function openEditProjectPopup(docId) {
  // Hapus modal lama
  document.querySelector('.edit-project-overlay')?.remove();
  document.querySelector('.edit-project-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'edit-project-overlay';

  const modal = document.createElement('div');
  modal.className = 'edit-project-modal';

  modal.innerHTML = `
    <div class="edit-project-content">
      <div class="edit-project-header">
        <h3>Edit Project</h3>
        <button class="edit-close-btn">×</button>
      </div>

      <div class="edit-project-body">

        <!-- Nama Project -->
        <div class="edit-form-group">
          <label>Nama Project <span class="text-danger">*</span></label>
          <input type="text" id="editNamaProject" class="edit-input" placeholder="Masukkan nama project">
        </div>

        <!-- Lokasi -->
        <div class="edit-form-group">
          <label>Lokasi</label>
          <input type="text" id="editLokasiProject" class="edit-input" placeholder="Contoh: Bandung, Jakarta">
        </div>

        <!-- Grid 1: Anggaran + Tanggal -->
        <div class="edit-form-grid">
          <div class="edit-form-group">
            <label>Anggaran</label>
            <input type="number" id="editAnggaranProject" class="edit-input" placeholder="50000000">
          </div>
          <div class="edit-form-group">
            <label>Tanggal Mulai</label>
            <input type="date" id="editTanggalProject" class="edit-input">
          </div>
        </div>

        <!-- Grid 2: Estimasi (DROPDOWN) + Urgensi -->
        <div class="edit-form-grid">
          <div class="edit-form-group">
            <label>Estimasi Selesai</label>
            <select id="editEstimasiProject" class="edit-input">
              <option value="">Pilih estimasi</option>
              ${Array.from({length: 24}, (_, i) => {
                const week = i + 1;
                const label = week === 1 ? '1 minggu' : `${week} minggu`;
                return `<option value="${label}">${label}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="edit-form-group">
            <label>Urgensi</label>
            <select id="editUrgensiProject" class="edit-input">
              <option value="Normal">Normal</option>
              <option value="Rush">Rush</option>
            </select>
          </div>
        </div>

      </div>

      <div class="edit-project-footer">
        <button class="edit-btn-cancel">Batal</button>
        <button class="edit-btn-save">Update Project</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  // Tampilkan modal
  setTimeout(() => {
    overlay.classList.add('show');
    modal.classList.add('show');
  }, 10);

  // === AMBIL DATA PROJECT DARI FIRESTORE ===
  let projectData = {};
  try {
    const docSnap = await getDoc(doc(db, 'projects', docId));
    if (!docSnap.exists()) {
      alert('Project tidak ditemukan!');
      overlay.remove(); modal.remove();
      return;
    }
    projectData = docSnap.data();
  } catch (err) {
    console.error(err);
    alert('Gagal memuat data project dari server!');
    overlay.remove(); modal.remove();
    return;
  }

  // === ISI FORM DENGAN DATA ===
  modal.querySelector('#editNamaProject').value      = projectData.nama || '';
  modal.querySelector('#editLokasiProject').value    = projectData.lokasi || '';
  modal.querySelector('#editAnggaranProject').value  = projectData.anggaran || '';

  // Tanggal Mulai
  if (projectData.tanggal) {
    const date = new Date(projectData.tanggal);
    if (!isNaN(date)) {
      modal.querySelector('#editTanggalProject').value = date.toISOString().split('T')[0];
    }
  }

  // Urgensi
  modal.querySelector('#editUrgensiProject').value = projectData.urgensi || 'Normal';

  // ESTIMASI: Konversi data lama ke dropdown
  const estimasiSelect = modal.querySelector('#editEstimasiProject');
  if (projectData.estimasi) {
    if (projectData.estimasi.includes('minggu')) {
      estimasiSelect.value = projectData.estimasi; // sudah format baru
    } else {
      // Format lama: angka atau "3 bulan"
      const num = parseInt(projectData.estimasi);
      if (!isNaN(num) && num >= 1 && num <= 24) {
        estimasiSelect.value = num === 1 ? '1 minggu' : `${num} minggu`;
      } else {
        estimasiSelect.value = ''; // fallback
      }
    }
  }

  // === CLOSE MODAL ===
  const closeModal = () => {
    overlay.classList.remove('show');
    modal.classList.remove('show');
    setTimeout(() => { overlay.remove(); modal.remove(); }, 400);
  };

  modal.querySelector('.edit-close-btn').onclick = closeModal;
  modal.querySelector('.edit-btn-cancel').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  // === SIMPAN UPDATE ===
  modal.querySelector('.edit-btn-save').onclick = async () => {
    const updated = {
      nama:     modal.querySelector('#editNamaProject').value.trim(),
      lokasi:   modal.querySelector('#editLokasiProject').value.trim(),
      anggaran: parseInt(modal.querySelector('#editAnggaranProject').value) || 0,
      estimasi: modal.querySelector('#editEstimasiProject').value,  // langsung ambil dari dropdown
      urgensi:  modal.querySelector('#editUrgensiProject').value,
      tanggal:  modal.querySelector('#editTanggalProject').value || null,
    };

    if (!updated.nama) {
      alert('Nama project wajib diisi!');
      return;
    }

    try {
      await updateDoc(doc(db, 'projects', docId), updated);
      alert('Project berhasil diperbarui!');
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Gagal update project!');
    }
  };


if (data.estimasi && data.estimasi.includes('minggu')) {
  modal.querySelector('#editEstimasiProject').value = data.estimasi;
} else if (data.estimasi) {
  // Kalau datanya masih angka lama (misal: "3"), ubah jadi "3 minggu"
  const num = parseInt(data.estimasi);
  if (!isNaN(num) && num >= 1 && num <= 24) {
    modal.querySelector('#editEstimasiProject').value = num === 1 ? '1 minggu' : `${num} minggu`;
  }
}

}


// Simpan data project saat render (tambahkan di dalam onSnapshot di renderProjectsRealtime)
// js/main.js — VERSI FINAL MENGGUNAKAN FIREBASE FIRESTORE

import { initUI } from './ui.js';

// ==================== INISIALISASI FIREBASE ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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
const projectsCol = collection(db, 'projects'); // Collection di Firestore

// ==================== HELPER ====================
const formatRupiah = (angka) => {
  if (!angka) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(angka);
};

// Card project
function createProjectCard(project, docId) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.dataset.docId = docId;

  // === TAMBAHAN: Badge Urgensi === (TETAP DI SINI UNTUK GENERASI STRING)
  const urgensiBadge = project.urgensi === 'Rush' 
    ? `<span class="urgensi-badge rush">Rush</span>`
    : `<span class="urgensi-badge normal">Normal</span>`;

  div.innerHTML = `
  <div class="file-icon ${project.urgensi === 'Rush' ? 'purple' : 'yellow'}">
    <i class="fas fa-folder"></i>
  </div>

  <div class="file-info">
    <!-- JUDUL + LOKASI DI KIRI, ANGGARAN + BADGE DI KANAN -->
    <div class="title-and-budget">
      <div class="title-and-location">
        <h4 class="project-title-long">${project.nama || 'Tanpa Nama'}</h4>
        <p class="text-sm location-line">${project.lokasi || '-'}</p>
      </div>

      <div class="budget-and-urgensi">
        <span class="budget-text">${formatRupiah(project.anggaran)}</span>
        <div class="urgensi-container-revised">
          ${urgensiBadge}
        </div>
      </div>
    </div>

    <!-- ESTIMASI WAKTU SENDIRI DI BAWAH -->
    <p class="text-sm estimate-line">${project.estimasi || '-'} </p>
  </div>
`;

  div.style.cursor = 'pointer';
  div.addEventListener('click', () => {
    localStorage.setItem('currentProject', project.nama);
    localStorage.setItem('currentProjectDocId', docId);
    window.location.href = 'project-detail.html';
  });

  return div;
}

// ==================== RENDER REALTIME DARI FIRESTORE ====================
async function renderProjectsRealtime() {
  const isIndexPage = location.pathname.includes('index.html') || 
                      location.pathname === '/' || 
                      location.pathname.endsWith('/file-manager-karmono/');
  if (!isIndexPage) return;

  const container = document.querySelector('.file-list');
  if (!container) return;

  container.innerHTML = '<p class="text-center col-span-full py-10">Memuat proyek dari cloud...</p>';

  // Listener realtime
  onSnapshot(projectsCol, (snapshot) => {
    container.innerHTML = '';
    
    if (snapshot.empty) {
      container.innerHTML = '<p class="text-center text-gray-500 col-span-full py-10">Belum ada proyek. Klik tombol + untuk menambahkan.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      container.appendChild(createProjectCard(data, doc.id));
    });
  }, (error) => {
    console.error("Error listening to projects:", error);
    container.innerHTML = '<p class="text-danger">Gagal memuat data. Cek koneksi internet.</p>';
  });
}

// Export fungsi global
window.createProjectCard = createProjectCard;
window.projectsCol = projectsCol;
window.addDoc = addDoc;
window.db = db;

// ==================== DOM LOADED ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Karmono Furniture + Firebase siap!');

  initUI();
  renderProjectsRealtime();

  // Halaman detail
  if (location.pathname.includes('project-detail.html')) {
    const projectName = localStorage.getItem('currentProject') || 'Proyek';
    document.querySelector('.brand-title')?.insertAdjacentText('beforeend', ` — ${projectName}`);
    document.getElementById('projectTitle')?.(textContent = projectName);
  }
});

// Fungsi tambah baris tabel
window.tambahPengeluaran = () => {
  const tbody = document.querySelector('#tabelPengeluaran tbody');
  if (tbody) tbody.insertAdjacentHTML('beforeend', `<tr>
    <td contenteditable>Material Baru</td>
    <td contenteditable>1</td>
    <td contenteditable>0</td>
    <td contenteditable>${new Date().toLocaleDateString('id-ID')}</td>
    <td>0</td>
  </tr>`);
};

window.tambahDP = () => {
  const tbody = document.querySelector('#tabelDP tbody');
  if (tbody) tbody.insertAdjacentHTML('beforeend', `<tr>
    <td contenteditable>Termin Baru</td>
    <td contenteditable>0</td>
    <td contenteditable>${new Date().toLocaleDateString('id-ID')}</td>
    <td><button onclick="this.parentElement.parentElement.remove()" class="text-red-600 text-sm">Hapus</button></td>
  </tr>`);
};
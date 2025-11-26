// js/storage.js ← INI PUSAT DATA PROJECTMU!
import { $ } from './utils.js';

const STORAGE_KEY = 'projects';

// Baca semua project
export const getProjects = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// Simpan / update seluruh array project
export const saveProjects = (projects) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

// Tambah project baru (yang paling sering dipakai)
export const addProject = (newProject) => {
  const projects = getProjects();

  // Tambah ID unik + timestamp
  const project = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...newProject
  };

  projects.push(project);
  saveProjects(projects);
  return project; // return project yang sudah punya ID
};

// Hapus project berdasarkan ID (nanti kalau butuh)
export const deleteProject = (id) => {
  const projects = getProjects().filter(p => p.id !== id);
  saveProjects(projects);
};

// Render ulang seluruh daftar project ke DOM (dipanggil setiap kali ada perubahan)
export const renderProjectList = () => {
  const list = $('.file-list');
  if (!list) return;

  const projects = getProjects();

  if (projects.length === 0) {
    list.innerHTML = '<p class="text-center text-gray-500 mt-10">Belum ada project.<br>Silakan tambah project baru.</p>';
    return;
  }

  list.innerHTML = '';

  projects.forEach(project => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.dataset.id = project.id;
    item.style.cursor = 'pointer';

    item.innerHTML = `
      <div class="file-icon ${project.urgensi === 'Rush' ? 'purple' : 'yellow'}">
        <i class="fas fa-folder"></i>
      </div>
      <div class="file-info">
        <h4>${project.nama || 'Tanpa Nama'}</h4>
        <p>${project.lokasi || 'Lokasi tidak diisi'} • ${project.estimasi}</p>
      </div>
    `;

    // Klik item → buka detail
    item.addEventListener('click', () => {
      localStorage.setItem('currentProjectId', project.id);        // LEBIH BAIK PAKE ID!
      localStorage.setItem('currentProject', project.nama);        // masih bisa pakai nama juga
      window.location.href = 'project-detail.html';
    });

    list.appendChild(item);
  });
};
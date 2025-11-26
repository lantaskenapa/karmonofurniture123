// js/ui.js — VERSI FINAL MENGGUNAKAN FIREBASE FIRESTORE

import { $, showToast } from './utils.js';
import { ModalManager } from './modal-manager.js';

export const initUI = () => {
  $('#searchBtn')?.addEventListener('click', () => showToast('Fitur pencarian segera hadir!'));

  $('.btn-upgrade')?.addEventListener('click', () => showToast('Upgrade coming soon!', 'success'));

  document.querySelectorAll('.more-btn').forEach(btn => btn.remove());

  // Klik project card
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.file-item');
    if (item) {
      const namaProyek = item.querySelector('h4').textContent.trim();
      const docId = item.dataset.docId;

      localStorage.setItem('currentProject', namaProyek);
      localStorage.setItem('currentProjectDocId', docId);
      window.location.href = 'project-detail.html';
    }
  });

  // Tombol Add Project
  $('#openAddModal')?.addEventListener('click', () => {
    ModalManager.load('modals/add-project-modal.html', 'addProjectModal', () => {
      ModalManager.open('addProjectModal');
      initAddProjectForm();
    });
  });

  // Close modal
  document.addEventListener('click', (e) => {
    if (e.target.closest('.close-modal-btn') || e.target.closest('.close-modal')) {
      const modalId = e.target.closest('[data-modal]')?.dataset.modal;
      if (modalId) ModalManager.close(modalId);
    }
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
};

// ==================== TAMBAH PROJECT KE FIRESTORE ====================
async function initAddProjectForm() {
  const form = $('#addProjectForm');
  if (!form) return;

  // Isi dropdown estimasi
  const selectEstimasi = form.querySelector('#estimasi');
  if (selectEstimasi && selectEstimasi.options.length === 1) {
    for (let i = 1; i <= 24; i++) {
      const opt = document.createElement('option');
      opt.value = `${i} minggu`;
      opt.textContent = `${i} Minggu`;
      selectEstimasi.appendChild(opt);
    }
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const newProject = {
      nama: form.namaProject.value.trim(),
      lokasi: form.lokasi.value.trim(),
      anggaran: parseInt(form.anggaran.value.replace(/\D/g, '')) || 0,
      estimasi: form.estimasi.value,
      tanggal: new Date(form.tanggalMulai.value).toLocaleDateString('id-ID'),
      urgensi: form.querySelector('input[name="urgensi"]:checked')?.value || 'Normal',
      createdAt: new Date()
    };

    try {
      await window.addDoc(window.projectsCol, newProject);

      form.reset();
      ModalManager.close('addProjectModal');
      showToast('Proyek berhasil disimpan ke cloud Firebase!', 'success');
    } catch (err) {
      console.error("Gagal simpan:", err);
      showToast('Gagal menyimpan proyek. Cek internet!', 'error');
    }
  };
}
// js/modal-manager.js — Manager semua modal (bisa ditambah ratusan modal!)
// js/modal-manager.js

// Selector helper (tetap diperlukan di sini)
export const $ = (selector) => document.querySelector(selector);

export const ModalManager = {
  // Buka modal
  open(modalId) {
    const modal = $(`#${modalId}`);
    if (!modal) return;

    // Hitung lebar scrollbar (hanya sekali)
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Simpan ke CSS custom property
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollBarWidth}px`);

    // Tambah class ke body → otomatis kasih padding-right + overflow hidden
    document.body.classList.add('modal-open');

    // Tampilkan modal
    modal.classList.add('active');
  },

  // Tutup modal
  close(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.classList.remove('active');
      
      // 3. Hapus padding kanan & kembalikan overflow
      document.body.style.overflow = '';
      document.body.style.paddingRight = ''; // Hapus padding yang ditambahkan
    }
  },

  // Load modal dari file eksternal (Tidak berubah)
  async load(modalFile, modalId, callback) {
    try {
      const response = await fetch(modalFile);
      const html = await response.text();
      document.body.insertAdjacentHTML('beforeend', html);
      
      // Setelah dimuat, jalankan callback (misal: inisialisasi form)
      if (callback) callback();
    } catch (err) {
      console.error('Gagal load modal:', err);
    }
  }
};



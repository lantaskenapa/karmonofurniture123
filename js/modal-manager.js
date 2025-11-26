// js/modal-manager.js — Manager semua modal (bisa ditambah ratusan modal!)
export const ModalManager = {
  // Buka modal berdasarkan ID
  open(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  // Tutup modal
  close(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Load modal dari file eksternal
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

// Selector helper
export const $ = (selector) => document.querySelector(selector);
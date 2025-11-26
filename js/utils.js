export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => document.querySelectorAll(selector);

export const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
    background:${type==='success'?'#4CAF50':'#333'}; color:white;
    padding:12px 32px; border-radius:8px; z-index:9999; font-size:14px;
    box-shadow:0 4px 12px rgba(0,0,0,0.2);
    animation:fadeInOut 3s forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// Animasi toast
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0%,100% {opacity:0; transform:translateX(-50%) translateY(20px);}
    15%,85% {opacity:1; transform:translateX(-50%) translateY(0);}
  }
`;
document.head.appendChild(style);
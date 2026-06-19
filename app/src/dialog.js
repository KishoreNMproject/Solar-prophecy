export function showDialog({ title, message, actions }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  
  overlay.innerHTML = `
    <div class="glass-modal">
      <h2 style="margin: 0 0 12px 0; font-size: 1.2rem; font-weight: 800; color: var(--brand);">${title}</h2>
      <p style="margin: 0 0 20px 0; font-size: 0.95rem; color: var(--ink); line-height: 1.5;">${message}</p>
      <div class="modal-actions">
        ${actions.map((action, i) => `
          <button class="${action.danger ? 'danger' : (action.primary ? 'primary' : 'secondary')}" id="dialogAction${i}">
            ${action.label}
          </button>
        `).join("")}
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  actions.forEach((action, i) => {
    overlay.querySelector(`#dialogAction${i}`).addEventListener("click", () => {
      if (action.onClick) action.onClick(overlay);
      overlay.remove();
    });
  });
}

export function showAlert(title, message) {
  showDialog({
    title,
    message,
    actions: [{ label: "OK", primary: true }]
  });
}

export function showConfirm(title, message, onConfirm) {
  showDialog({
    title,
    message,
    actions: [
      { label: "Cancel", primary: false },
      { label: "Confirm", primary: true, onClick: onConfirm }
    ]
  });
}

export function showDangerConfirm(title, message, confirmLabel, onConfirm) {
  showDialog({
    title,
    message,
    actions: [
      { label: "Cancel", primary: false },
      { label: confirmLabel, primary: true, danger: true, onClick: onConfirm }
    ]
  });
}

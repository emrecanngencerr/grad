import React from "react";
import "./Modal.css"; // We'll create this CSS file next

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {" "}
        {/* Prevents closing when clicking inside modal */}
        <div className="modal-header">
          {title && <h3 className="modal-title">{title}</h3>}
          <button className="modal-close-button" onClick={onClose}>
            × {/* HTML entity for a multiplication sign (X) */}
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;

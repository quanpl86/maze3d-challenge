// src/components/Dialog/index.tsx

import React from 'react';
import './Dialog.css';

interface DialogProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <div className="dialog-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="dialog-close-button">&times;</button>
        </div>
        <div className="dialog-body">
          {children}
        </div>
        <div className="dialog-footer">
          <button onClick={onClose} className="primaryButton">OK</button>
        </div>
      </div>
    </div>
  );
};
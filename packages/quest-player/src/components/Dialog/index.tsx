// src/components/Dialog/index.tsx

import React from 'react';
import styles from './Dialog.module.css';

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
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogContent}>
        <div className={styles.dialogHeader}>
          <h2>{title}</h2>
          <button onClick={onClose} className={styles.dialogCloseButton}>&times;</button>
        </div>
        <div className={styles.dialogBody}>
          {children}
        </div>
        <div className={styles.dialogFooter}>
          <button onClick={onClose} className={styles.primaryButton}>OK</button>
        </div>
      </div>
    </div>
  );
};
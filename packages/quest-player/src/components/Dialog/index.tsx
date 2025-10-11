// packages/quest-player/src/components/Dialog/index.tsx

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Dialog.module.css';

interface DialogProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, title, children, onClose }) => {
  // State để đảm bảo component chỉ được render ở phía client, tránh lỗi SSR
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Chỉ render khi isOpen và đã được mount ở client
  if (!isOpen || !isMounted) {
    return null;
  }

  const dialogContent = (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogContent}>
        <div className={styles.dialogHeader}>
          <h2>{title}</h2>
          <button onClick={onClose} className={styles.dialogCloseButton} aria-label="Close">&times;</button>
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

  // Sử dụng createPortal để render dialog vào cuối thẻ body
  // Điều này đảm bảo nó không bị ảnh hưởng bởi CSS của các phần tử cha
  return createPortal(dialogContent, document.body);
};
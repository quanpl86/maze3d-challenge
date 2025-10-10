// src/components/BackgroundMusic/index.tsx

import { useEffect, useRef } from 'react';

interface BackgroundMusicProps {
  src?: string;
  play: boolean;
}

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({ src, play }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (src) {
      // Nếu src thay đổi, tạo một đối tượng Audio mới
      if (!audioRef.current || audioRef.current.src !== window.location.origin + src) {
        audioRef.current = new Audio(src);
        audioRef.current.loop = true;
      }
    } else {
      // Nếu không có src, dừng và xóa đối tượng Audio cũ
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }

    // Xử lý việc phát/dừng nhạc
    if (audioRef.current) {
      if (play) {
        audioRef.current.play().catch(error => {
          console.warn("Background music could not be played:", error);
        });
      } else {
        audioRef.current.pause();
      }
    }

    // Hàm cleanup để dừng nhạc khi component unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [src, play]);

  // Component này không render ra bất kỳ JSX nào
  return null;
};
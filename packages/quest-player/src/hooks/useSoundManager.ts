// src/hooks/useSoundManager.ts

import { useEffect, useRef, useCallback } from 'react';

type SoundMap = Record<string, string> | undefined;

export const useSoundManager = (sounds: SoundMap, enabled = true) => {
  const audioCache = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (!sounds) {
      return;
    }

    // Tải và cache các file âm thanh
    Object.entries(sounds).forEach(([name, src]) => {
      if (!audioCache.current[name]) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audioCache.current[name] = audio;
      }
    });

    // Cleanup: có thể thêm logic để giải phóng bộ nhớ nếu cần
    return () => {
      // Hiện tại không cần cleanup khi unmount
    };
  }, [sounds]);

  const playSound = useCallback((name: string, volume = 1.0) => {
    if (!enabled) {
      return;
    }
    const audio = audioCache.current[name];
    if (audio) {
      // Sử dụng cloneNode để cho phép phát nhiều âm thanh cùng lúc
      const audioInstance = audio.cloneNode() as HTMLAudioElement;
      audioInstance.volume = Math.max(0, Math.min(1, volume));
      audioInstance.play().catch(error => {
        // Trình duyệt có thể chặn tự động phát âm thanh nếu người dùng chưa tương tác
        console.warn(`Could not play sound "${name}":`, error);
      });
    } else {
      console.warn(`Sound "${name}" not found in cache.`);
    }
  }, [enabled]);

  return { playSound };
};
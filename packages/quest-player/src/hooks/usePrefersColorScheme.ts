// src/hooks/usePrefersColorScheme.ts

import { useState, useEffect } from 'react';

type ColorScheme = 'dark' | 'light';

const getPrefersColorScheme = (): ColorScheme => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export const usePrefersColorScheme = (): ColorScheme => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getPrefersColorScheme());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? 'dark' : 'light');
    };

    // Add listener for changes
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup listener on component unmount
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return colorScheme;
};
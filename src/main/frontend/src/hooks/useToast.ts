import { useCallback, useEffect, useState } from 'react';

/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

export function useToast(autoHideMs = 60_000) {
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, id: Date.now() });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), autoHideMs);
    return () => clearTimeout(t);
  }, [toast, autoHideMs]);

  return { toast, showToast, dismiss };
}
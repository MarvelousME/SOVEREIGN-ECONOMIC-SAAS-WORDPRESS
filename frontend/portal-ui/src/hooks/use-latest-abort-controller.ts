import { useCallback, useEffect, useRef } from 'react';

export function useLatestAbortController() {
  const controllerRef = useRef<AbortController | null>(null);

  const nextSignal = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller.signal;
  }, []);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return { nextSignal };
}

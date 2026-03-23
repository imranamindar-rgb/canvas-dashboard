import { useState, useCallback } from "react";

const STORAGE_KEY = "onboarding_complete";

export function useOnboarding() {
  const [complete, setComplete] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  );

  const markComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setComplete(true);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setComplete(false);
  }, []);

  return { complete, markComplete, reset };
}

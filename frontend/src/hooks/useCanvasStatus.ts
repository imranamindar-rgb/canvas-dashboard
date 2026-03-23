import { useState, useEffect } from "react";
import { api } from "../utils/api";

interface CanvasStatus {
  configured: boolean;
  api_url: string | null;
}

export function useCanvasStatus() {
  const [status, setStatus] = useState<CanvasStatus | null>(null);

  useEffect(() => {
    api.get<CanvasStatus>("/api/canvas/status")
      .then(setStatus)
      .catch(() => {/* ignore */});
  }, []);

  return status;
}

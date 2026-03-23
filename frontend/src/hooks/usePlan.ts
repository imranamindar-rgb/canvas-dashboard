import { useState, useCallback } from "react";
import { api } from "../utils/api";
import type { Assignment } from "../types";

export function usePlan() {
  const [saving, setSaving] = useState<string | null>(null); // assignment id being saved

  const setPlannedDay = useCallback(async (assignment: Assignment, day: string | null) => {
    setSaving(String(assignment.id));
    try {
      await api.put(`/api/assignments/${assignment.id}/planned-day`, { planned_day: day });
    } finally {
      setSaving(null);
    }
  }, []);

  return { saving, setPlannedDay };
}

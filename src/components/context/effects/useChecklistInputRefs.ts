import { useCallback, useMemo, useRef } from "react";

export function useChecklistInputRefs() {
  const checklistInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const setChecklistInputRef = useCallback(
    (id: string, el: HTMLInputElement | null) => {
      if (el) checklistInputRefs.current[id] = el;
      else delete checklistInputRefs.current[id];
    },
    [],
  );

  const focusChecklistInput = useCallback((id: string) => {
    checklistInputRefs.current[id]?.focus();
  }, []);

  return useMemo(
    () => ({ setChecklistInputRef, focusChecklistInput }),
    [setChecklistInputRef, focusChecklistInput],
  );
}

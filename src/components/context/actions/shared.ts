export const fetchGeneratedItems = async (
  prompt: string,
  maxItems = 10,
): Promise<string[]> => {
  const response = await fetch("/api/generate-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTasks: maxItems }),
  });
  if (!response.ok) {
    let message = "AI generation failed";
    try {
      const data = await response.json();
      message = data?.error ?? message;
    } catch { /* ignore parse failure */ }
    throw new Error(message);
  }
  const data = await response.json();
  return Array.isArray(data.response)
    ? data.response.map((item: unknown) => String(item).trim())
    : [];
};

export function handleChecklistKeyDown(
  event: KeyboardEvent,
  index: number,
  addItemFn: (focusNew: boolean, insertBeforeIndex?: number) => void,
) {
  if (event.key === "Enter" && event.shiftKey) {
    event.preventDefault();
    addItemFn(true, index);
  } else if (event.key === "Enter") {
    event.preventDefault();
    (event.target as HTMLElement).blur();
  }
}

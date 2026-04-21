export default function ChecklistSection({
  checklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  handleChecklistKeyDown,
  setChecklistInputRef,
}) {
  console.log("[DEBUG] ChecklistSection rendered - items:", checklist.length);
  return (
    <div class="space-y-3 rounded border border-base-300 p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold">
          Checklist items
        </p>
        <button
          type="button"
          class="rounded px-3 py-1 text-sm transition"
          onClick={() => addChecklistItem(true)}
        >
          Add item
        </button>
      </div>
      <div class="space-y-3">
        {checklist.map((item, index) => (
          <div
            key={item.id}
            class="flex items-center gap-3 rounded border border-base-300 px-3 py-2"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onInput={() =>
                updateChecklistItem(
                  item.id,
                  "checked",
                  !item.checked,
                )}
              class="h-4 w-4 rounded border-base-300 focus:ring-cyan-400"
            />
            <input
              class="w-full bg-transparent outline-none placeholder:"
              type="text"
              value={item.text}
              onInput={(e) =>
                updateChecklistItem(
                  item.id,
                  "text",
                  e.currentTarget.value,
                )}
              onKeyDown={(e) =>
                handleChecklistKeyDown(
                  e,
                  index,
                  checklist,
                  addChecklistItem,
                )}
              ref={(el) => setChecklistInputRef(item.id, el)}
              placeholder="Checklist item"
            />
            <button
              type="button"
              class="text-red-500 hover:text-red-700 transition-colors"
              onClick={() => deleteChecklistItem(item.id)}
              title="Delete checklist item"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

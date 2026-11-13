// Types shared by the web app, the /api/v1 server code, and the kanby CLI.
// No imports: the CLI imports this file by relative path and is compiled with
// cli/deno.jsonc, which has no path aliases and no app dependencies.

// ── STORED ENTITIES (aligned with src/db/schema.dbml) ──────────────────────────

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  order: string;
}

export interface Row {
  id: string;
  title: string;
  color: string;
  order: string;
}

export interface Column {
  id: string;
  title: string;
  order: string;
  pinnedToShortcut: boolean;
  pinnedToDock: boolean;
  icon: string | null;
  iconInBoardMenu: boolean;
  iconNearColumnTitle: boolean;
  isTrash: boolean;
}

export interface Task {
  id: string;
  rowId: string;
  colId: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
  order: string;
  trashedAt: string | null; // ISO timestamp; set while in the Trash column
  preTrashColId: string | null; // column to return to on Restore
}

// Stored outside the board blob (one KV entry per comment), so it is not part
// of PersistedBoard. Mirrors the task_comments table in src/db/schema.dbml.
export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string | null; // Clerk userId; null when stored in localStorage
  authorName: string;
  authorImageUrl: string | null;
  content: string; // Lexical JSON from ExtensiveEditorRef.getJSON()
  createdAt: string; // ISO timestamp
  updatedAt: string | null; // ISO timestamp; set once the comment is edited
}

export interface PersistedBoard {
  rows: Row[];
  columns: Column[];
  tasks: Task[];
}

export type EntityKind = "row" | "column" | "task";

// ── /api/v1 RESPONSE SHAPES (built by the server, read by the CLI) ─────────────

// A task with ids shortened, titles resolved, and the description as plain text.
export interface TaskView {
  id: string;
  shortId: string;
  title: string;
  description: string; // plain text
  rowId: string;
  rowTitle: string;
  colId: string;
  colTitle: string;
  checklist: ChecklistItem[];
  trashed: boolean;
}

export interface RowView {
  id: string;
  shortId: string;
  title: string;
  color: string; // label, e.g. "Blue"
  taskCount: number;
}

export interface ColumnView {
  id: string;
  shortId: string;
  title: string;
}

export interface Me {
  userId: string;
  email: string | null;
  name: string | null;
}

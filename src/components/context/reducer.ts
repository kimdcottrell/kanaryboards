import type { BoardAction, BoardState } from "./types.ts";
import * as board from "./reducers/board.ts";
import * as checklist from "./reducers/checklist.ts";
import * as checklistAi from "./reducers/checklistAi.ts";
import * as columns from "./reducers/columns.ts";
import * as rows from "./reducers/rows.ts";
import * as taskAi from "./reducers/taskAi.ts";
import * as tasks from "./reducers/tasks.ts";

export { createInitialState } from "./reducers/board.ts";

export function boardReducer(
  state: BoardState,
  action: BoardAction,
): BoardState {
  switch (action.type) {
    // ── COLUMNS ──────────────────────────────────────────────────────────────

    case "COLUMN/ADD":
      return columns.add(state, action.payload);

    case "COLUMN/DELETE":
      return columns.remove(state, action.payload);

    case "COLUMN/REORDER":
      return columns.reorder(state, action.payload);

    case "COLUMN/SET_INPUT":
      return columns.setInput(state, action.payload);

    case "COLUMN/SET_ICON":
      return columns.setIcon(state, action.payload);

    case "COLUMN/SET_COLUMN_ICON":
      return columns.setColumnIcon(state, action.payload);

    case "COLUMN/SET_DRAGGED_INDEX":
      return columns.setDraggedIndex(state, action.payload);

    case "COLUMN/RENAME_START":
      return columns.renameStart(state, action.payload);

    case "COLUMN/RENAME_CHANGE":
      return columns.renameChange(state, action.payload);

    case "COLUMN/RENAME_SAVE":
      return columns.renameSave(state, action.payload);

    case "COLUMN/RENAME_CANCEL":
      return columns.renameCancel(state);

    case "COLUMN/TOGGLE_PIN":
      return columns.togglePin(state, action.payload);

    case "COLUMN/TOGGLE_ICON_IN_BOARD_MENU":
      return columns.toggleIconInBoardMenu(state, action.payload);

    case "COLUMN/TOGGLE_ICON_NEAR_COLUMN_TITLE":
      return columns.toggleIconNearColumnTitle(state, action.payload);

    // ── ROWS ──────────────────────────────────────────────────────────────────

    case "ROW/ADD":
      return rows.add(state, action.payload);

    case "ROW/DELETE":
      return rows.remove(state, action.payload);

    case "ROW/MOVE":
      return rows.move(state, action.payload);

    case "ROW/UPDATE_COLOR":
      return rows.updateColor(state, action.payload);

    case "ROW/EDIT_START":
      return rows.editStart(state, action.payload);

    case "ROW/EDIT_CHANGE":
      return rows.editChange(state, action.payload);

    case "ROW/EDIT_SAVE":
      return rows.editSave(state, action.payload);

    case "ROW/EDIT_CANCEL":
      return rows.editCancel(state);

    case "ROW/RENAME":
      return rows.rename(state, action.payload);

    case "ROW/SET_NEW_NAME":
      return rows.setNewName(state, action.payload);

    case "ROW/SET_NEW_PROMPT":
      return rows.setNewPrompt(state, action.payload);

    case "ROW/RESET_FORM":
      return rows.resetForm(state);

    case "ROW/OPEN_CREATE_MODAL":
      return rows.openRowCreateModal(state);

    case "ROW/CLOSE_CREATE_MODAL":
      return rows.closeRowCreateModal(state);

    // ── TASKS ─────────────────────────────────────────────────────────────────

    case "TASK/CREATE":
      return tasks.create(state, action.payload);

    case "TASK/DELETE":
      return tasks.remove(state, action.payload);

    case "TASK/SAVE_EDIT":
      return tasks.saveEdit(state);

    case "TASK/MOVE_TO_COLUMN":
      return tasks.moveToColumn(state, action.payload);

    case "TASK/TOGGLE_CHECKLIST_ITEM":
      return tasks.toggleChecklistItem(state, action.payload);

    case "TASK/OPEN_CREATE_MODAL":
      return tasks.openCreateModal(state, action.payload);

    case "TASK/CLOSE_CREATE_MODAL":
      return tasks.closeCreateModal(state);

    case "TASK/OPEN_EDIT_MODAL":
      return tasks.openEditModal(state, action.payload);

    case "TASK/CLOSE_EDIT_MODAL":
      return tasks.closeEditModal(state);

    case "TASK/UPDATE_DRAFT":
      return tasks.updateDraft(state, action.payload);

    case "TASK/UPDATE_EDIT_DRAFT":
      return tasks.updateEditDraft(state, action.payload);

    case "TASK/REORDER_IN_CELL":
      return tasks.reorderInCell(state, action.payload);

    case "TASK/START_DRAG":
      return tasks.startDrag(state, action.payload);

    case "TASK/END_DRAG":
      return tasks.endDrag(state);

    case "TASK/DROP_ON_CELL":
      return tasks.dropOnCell(state, action.payload);

    // ── CHECKLIST ITEMS ───────────────────────────────────────────────────────

    case "CHECKLIST/ADD_ITEM":
      return checklist.addItem(state, action.payload);

    case "CHECKLIST/UPDATE_ITEM":
      return checklist.updateItem(state, action.payload);

    case "CHECKLIST/DELETE_ITEM":
      return checklist.removeItem(state, action.payload);

    case "CHECKLIST/REORDER_ITEM":
      return checklist.reorderItem(state, action.payload);

    // ── CHECKLIST AI ──────────────────────────────────────────────────────────

    case "CHECKLIST_AI/SET_PROMPT":
      return checklistAi.setPrompt(state, action.payload);

    case "CHECKLIST_AI/GENERATE_START":
      return checklistAi.generateStart(state, action.payload);

    case "CHECKLIST_AI/GENERATE_SUCCESS":
      return checklistAi.generateSuccess(state, action.payload);

    case "CHECKLIST_AI/GENERATE_FAILURE":
      return checklistAi.generateFailure(state, action.payload);

    case "CHECKLIST_AI/APPLY_TO_EDIT_DRAFT":
      return checklistAi.applyToEditDraft(state);

    case "CHECKLIST_AI/APPLY_TO_CREATE_DRAFT":
      return checklistAi.applyToCreateDraft(state);

    case "CHECKLIST_AI/RESET":
      return checklistAi.reset(state);

    // ── TASK AI ───────────────────────────────────────────────────────────────

    case "TASK_AI/GENERATE_START":
      return taskAi.generateStart(state);

    case "TASK_AI/GENERATE_SUCCESS":
      return taskAi.generateSuccess(state, action.payload);

    case "TASK_AI/GENERATE_FAILURE":
      return taskAi.generateFailure(state, action.payload);

    // ── BOARD CONFIG ──────────────────────────────────────────────────────────

    case "BOARD_CONFIG/OPEN_MODAL":
      return board.openConfigModal(state, action.payload);

    case "BOARD_CONFIG/CLOSE_MODAL":
      return board.closeConfigModal(state);

    // ── BOARD ─────────────────────────────────────────────────────────────────

    case "BOARD/LOAD":
      return board.load(state, action.payload);

    case "BOARD/RESET":
      return board.reset();

    default:
      return state;
  }
}

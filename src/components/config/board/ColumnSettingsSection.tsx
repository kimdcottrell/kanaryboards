import { useState } from "react";
import type { ReactNode } from "react";
import AsyncCreatableSelect from "react-select/async-creatable";
import BoardMenu from "../../BoardMenu.tsx";
import BoardDock from "../../BoardDock.tsx";
import DynamicIcon from "../../DynamicIcon.tsx";
import { searchHugeicons } from "@lib/icons.ts";
import {
  useBoardDataState,
  useColumnConfigActions,
  useColumnConfigState,
  useColumnEditActions,
  useColumnEditState,
} from "../../context/hooks.ts";

export default function ColumnSettingsSection() {
  const { columns, rows, tasks } = useBoardDataState();
  const { defaultColumnInput, draggedDefaultIndex } = useColumnConfigState();
  const { editingColumnId, editingColumnName } = useColumnEditState();
  const { setEditingColumnName, editColumnTitle, saveColumnTitle } =
    useColumnEditActions();
  const {
    setDefaultColumnInput,
    setColumnIcon,
    setDraggedDefaultIndex,
    handleDefaultColumnDragStart,
    handleDefaultColumnDragOver,
    handleDefaultColumnDrop,
    addColumn,
    reorderColumn,
    deleteColumn,
    togglePinShortcut,
    togglePinDock,
    toggleIconInBoardMenu,
    toggleIconNearColumnTitle,
  } = useColumnConfigActions();

  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);
  const [pinNotice, setPinNotice] = useState<
    { colId: string; type: "shortcut" | "dock" } | null
  >(null);
  const [direction, setDirection] = useState<"" | "left" | "right">("");
  const [referenceColumnId, setReferenceColumnId] = useState("");
  const [createColumnFormKey, setCreateColumnFormKey] = useState(0);

  const shortcutCount =
    columns.filter((column) => column.pinnedToShortcut).length;
  const dockCount = columns.filter((column) => column.pinnedToDock).length;
  const dockPinnedTitle = columns.find((column) => column.pinnedToDock)?.title;

  return (
    <div
      id="board-config-column-settings"
      className="mt-6 bg-base-200 p-5 space-y-3"
    >
      <div className="mb-6 sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">
          Column settings
        </h3>
      </div>

      <div
        id="create-new-column"
        className="space-y-3 bg-base-content/10 p-3 rounded"
      >
        <h4 className="text-md font-semibold">
          Create a new column
        </h4>
        <form
          key={createColumnFormKey}
          onSubmit={(e) => {
            e.preventDefault();
            if (direction === "") return;
            addColumn(direction, referenceColumnId);
            setDirection("");
            setReferenceColumnId("");
            setCreateColumnFormKey((k) => k + 1);
          }}
        >
          <section className="justify-items-center md:flex md:flex-row">
            <fieldset className="fieldset flex-1">
              <legend className="fieldset-legend">New column name</legend>
              <input
                className="input validator"
                type="text"
                value={defaultColumnInput}
                onChange={(e) => setDefaultColumnInput(e.currentTarget.value)}
                required
              />
              <p className="validator-hint">Required</p>
            </fieldset>

            <fieldset className="fieldset flex-1">
              <legend className="fieldset-legend">
                To the left or right of
              </legend>
              <select
                className="select validator"
                value={direction}
                onChange={(e) =>
                  setDirection(e.currentTarget.value as "left" | "right")}
                required
              >
                <option value="" disabled>Pick a direction</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
              <p className="validator-hint">Required</p>
            </fieldset>
            <fieldset className="fieldset flex-1">
              <legend className="fieldset-legend">Of column</legend>
              <select
                className="select validator"
                value={referenceColumnId}
                onChange={(e) => setReferenceColumnId(e.currentTarget.value)}
                required
              >
                <option value="" disabled>Pick a column</option>
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
              <p className="validator-hint">Required</p>
            </fieldset>
          </section>
          <button className="btn btn-secondary mb-3" type="submit">
            Add Column
          </button>
        </form>
      </div>
      <div className="bg-base-content/10 p-3 rounded">
        {columns.some((column) =>
          column.pinnedToShortcut || column.pinnedToDock
        ) && (
          <>
            <h4 className="text-md font-semibold">
              Manage existing columns
            </h4>
            <p className="text-sm py-3">
              Manage the columns set used across projects. Drag cards to
              reorder, pin to the board shortcut menu, or add a new default
              column.
            </p>
            <p className="text-sm">
              Icons are generated from Iconify's{" "}
              <a
                href="https://icon-sets.iconify.design/hugeicons/"
                target="_blank"
              >
                HugeIcons
              </a>{" "}
              library.
            </p>
            <div className="mt-6 p-6 space-y-6 rounded bg-base-content/5">
              <div className="text-center space-y-1">
                <h5 className="text-lg font-semibold">Live preview</h5>
                <p className="text-sm text-base-content/70">
                  Changes below in{" "}
                  <span className="font-semibold">Column configuration</span>
                  {" "}
                  update these previews
                </p>
              </div>
              <div className="flex flex-wrap items-stretch justify-center gap-10">
                {columns.some((column) => column.pinnedToShortcut) && (
                  <div className="flex flex-col items-center gap-3 min-w-0 max-w-full p-4 rounded bg-base-content/5">
                    <span className="badge badge-warning badge-sm rounded-xs p-3 text-base">
                      Shortcut Menu
                    </span>
                    <p className="max-w-xs text-center text-sm text-base-content/70">
                      Shows on devices with a wide resolution, such as a
                      desktop.
                    </p>
                    <div className="w-full overflow-x-auto">
                      <BoardMenu isPreview />
                    </div>
                  </div>
                )}
                {columns.some((column) => column.pinnedToDock) && (
                  <div className="flex flex-col items-center gap-3 p-4 rounded bg-base-content/5">
                    <span className="badge badge-warning badge-sm rounded-xs p-3 text-base">
                      Dock Menu
                    </span>
                    <p className="max-w-xs text-center text-sm text-base-content/70">
                      Shows on devices with a narrow resolution, such as a
                      phone.
                    </p>
                    <BoardDock isPreview />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        <div className="mt-6 p-6 space-y-2 rounded bg-base-content/5">
          <div className="text-center space-y-1">
            <h5 className="text-lg font-semibold">Column configuration</h5>
            <p className="text-sm text-base-content/70">
              Rename, reorder, set icons, and pin columns to the menus. Pinning
              a column to the Shortcut or Dock menu updates the Live Previews
              above.
            </p>
          </div>
          <div className="flex gap-2 overflow-x-scroll scrollbar-auto scrollbar-thumb-accent scrollbar-track-accent/30 mt-4">
            {draggedDefaultIndex !== null && draggedDefaultIndex !== 0 && (
              <div
                onDragOver={(e) => {
                  handleDefaultColumnDragOver(e);
                  setDragHoverIndex(-1);
                }}
                onDrop={(e) => {
                  handleDefaultColumnDrop(columns[0].id)(e);
                  setDragHoverIndex(null);
                }}
                className="relative w-2 shrink-0"
              >
                {dragHoverIndex === -1 && (
                  <span className="absolute inset-y-0 w-0.5 bg-accent left-0" />
                )}
              </div>
            )}
            {columns.map((column, index) => {
              const isDraggingThis = draggedDefaultIndex === index;
              const isHovered = dragHoverIndex === index &&
                draggedDefaultIndex !== null &&
                draggedDefaultIndex !== index;
              const dropFromLeft = draggedDefaultIndex !== null &&
                draggedDefaultIndex < index;
              const shortcutPinBlocked = !column.pinnedToShortcut &&
                shortcutCount >= 3;
              const dockPinBlocked = !column.pinnedToDock && dockCount >= 1;
              const fauxFlex1: ReactNode[] = [];
              const columnTasks = tasks.filter((task) =>
                task.colId === column.id
              );
              const rowsWithTasks = rows
                .map((row) => ({
                  row,
                  tasks: columnTasks.filter((task) => task.rowId === row.id),
                }))
                .filter(({ tasks }) => tasks.length > 0);
              return (
                <div
                  key={column.id}
                  draggable="true"
                  onDragStart={handleDefaultColumnDragStart(index)}
                  onDragOver={(e) => {
                    handleDefaultColumnDragOver(e);
                    setDragHoverIndex(index);
                  }}
                  onDrop={(e) => {
                    handleDefaultColumnDrop(column.id)(e);
                    setDragHoverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedDefaultIndex(null);
                    setDragHoverIndex(null);
                  }}
                  style={{ opacity: isDraggingThis ? 0.4 : 1 }}
                  className="relative"
                >
                  {isHovered && !dropFromLeft && (
                    <span
                      className="absolute inset-y-0 w-0.5 bg-accent"
                      style={{ left: "-0.30rem" }}
                    />
                  )}
                  {isHovered && dropFromLeft && (
                    <span
                      className="absolute inset-y-0 w-0.5 bg-accent"
                      style={{ right: "-0.30rem" }}
                    />
                  )}
                  <div className="w-xs h-full shrink-0 card card-md bg-base-200 border-b-2 border-r-2 border-base-content/25 cursor-grab">
                    <div className="card-body">
                      <h2 className="card-title">
                        {editingColumnId === column.id
                          ? (
                            <input
                              className="input text-lg font-semibold outline-none focus:border-base-content/40"
                              type="text"
                              value={editingColumnName}
                              onChange={(e) =>
                                setEditingColumnName(e.currentTarget.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  saveColumnTitle(column.id);
                                } else if (e.key === "Escape") {
                                  setEditingColumnName(null);
                                }
                              }}
                              onBlur={() => saveColumnTitle(column.id)}
                              autoFocus
                            />
                          )
                          : (
                            <span
                              className="group inline-flex w-fit cursor-text items-center gap-2"
                              onDoubleClick={() =>
                                editColumnTitle(column, null)}
                              title="Double-click to edit"
                            >
                              {column.iconNearColumnTitle && column.icon && (
                                <DynamicIcon
                                  name={column.icon}
                                  className="h-5 w-5"
                                />
                              )}
                              {column.title}
                              <span className="iconify hugeicons--edit-03 text-base-content text-md  shrink-0">
                              </span>
                            </span>
                          )}
                      </h2>
                      <hr className="my-3" />
                      <h3 className="font-semibold">
                        Pin to board menus
                      </h3>
                      <div className="flex gap-4">
                        <div className="flex flex-col gap-2">
                          <h4>Shortcut Menu</h4>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (shortcutPinBlocked) {
                                  setPinNotice({
                                    colId: column.id,
                                    type: "shortcut",
                                  });
                                } else {
                                  setPinNotice(null);
                                  togglePinShortcut(column.id);
                                }
                              }}
                              aria-label={column.pinnedToShortcut
                                ? "Unpin column from shortcut menu"
                                : "Pin column to shortcut menu"}
                              className={`shadow-none w-fit py-2 px-1 btn btn-sm btn-secondary dark:btn-border-secondary light:text-secondary-content hover:bg-secondary/80 dark:text-base-100 hover:text-secondary-content! ${
                                column.pinnedToShortcut
                                  ? "bg-secondary text-secondary-content!"
                                  : "bg-secondary/20 text-secondary!"
                              }`}
                            >
                              <span className="iconify hugeicons--pin text-2xl font-bold">
                              </span>
                            </button>
                            <section className="total-pinned">
                              <div className="inline-block badge badge-lg text-base-100 bg-base-content/60">
                                {shortcutCount}/3
                              </div>
                            </section>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <h4>Dock Menu</h4>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (dockPinBlocked) {
                                  setPinNotice({
                                    colId: column.id,
                                    type: "dock",
                                  });
                                } else {
                                  setPinNotice(null);
                                  togglePinDock(column.id);
                                }
                              }}
                              aria-label={column.pinnedToDock
                                ? "Unpin column from dock menu"
                                : "Pin column to dock menu"}
                              className={`shadow-none w-fit py-2 px-1 btn btn-sm btn-secondary dark:btn-border-secondary light:text-secondary-content hover:bg-secondary/80 dark:text-base-100 hover:text-secondary-content! ${
                                column.pinnedToDock
                                  ? "bg-secondary text-secondary-content!"
                                  : "bg-secondary/20 text-secondary!"
                              }`}
                            >
                              <span className="iconify hugeicons--pin text-2xl font-bold">
                              </span>
                            </button>
                            <section className="total-pinned">
                              <div className="inline-block badge badge-lg text-base-100 bg-base-content/60">
                                {dockCount}/1
                              </div>
                            </section>
                          </div>
                        </div>
                      </div>
                      {dockPinBlocked &&
                        pinNotice?.colId === column.id &&
                        pinNotice.type === "dock" && (
                        <div
                          role="alert"
                          className="alert alert-warning alert-soft block"
                        >
                          <span className="font-semibold pr-1">
                            Dock Menu notice:
                          </span>
                          You can only pin 1 column to the dock. Unpin{" "}
                          "{dockPinnedTitle}" to proceed.
                        </div>
                      )}
                      {shortcutPinBlocked &&
                        pinNotice?.colId === column.id &&
                        pinNotice.type === "shortcut" && (
                        <div
                          role="alert"
                          className="alert alert-warning alert-soft block"
                        >
                          <span className="font-semibold pr-1">
                            Shortcut Menu notice:
                          </span>
                          You can only pin 3 columns. Unpin one to proceed.
                        </div>
                      )}
                      <hr className="my-3" />
                      <h4>Column icon</h4>

                      <div className="space-y-3">
                        <AsyncCreatableSelect
                          unstyled
                          classNames={{
                            control: () =>
                              "textarea-md rounded-lg border border-base-content/20 bg-base-100 px-1",
                            menu: () =>
                              "mt-1 rounded-lg border border-base-content/20 bg-base-100 shadow-lg",
                            option: ({ isFocused, isSelected }) =>
                              `px-3 py-2 cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-primary-content"
                                  : isFocused
                                  ? "bg-base-200"
                                  : ""
                              }`,
                            input: () => "text-base-content",
                            singleValue: () => "text-base-content",
                            placeholder: () => "text-base-content/50",
                            noOptionsMessage: () =>
                              "px-3 py-2 text-base-content/50",
                          }}
                          value={column.icon ? { value: column.icon } : null}
                          onChange={(option) =>
                            setColumnIcon(column.id, option?.value ?? null)}
                          isSearchable
                          isClearable
                          cacheOptions
                          defaultOptions
                          loadOptions={(input) => searchHugeicons(input)}
                          placeholder="Start typing a hugeicon name..."
                          formatOptionLabel={(option) => (
                            <div className="flex items-center gap-2">
                              <DynamicIcon
                                name={option.value}
                                className="h-6 w-6"
                              />
                              <span>{option.value}</span>
                            </div>
                          )}
                        />
                        {column.pinnedToShortcut
                          ? (
                            <label
                              key={`${column.id}-enable-shortcut-menu`}
                              className="flex items-center gap-1 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={column.iconInBoardMenu}
                                onChange={() =>
                                  toggleIconInBoardMenu(column.id)}
                                className="checkbox checkbox-primary checkbox-sm"
                              />
                              Display on shortcut menu
                            </label>
                          )
                          : (fauxFlex1.push(
                            <div
                              key={`${column.id}-faux-flex-1`}
                              className="h-5 p-2"
                            >
                            </div>,
                          ),
                            null)}
                        <label
                          key={`${column.id}-display-in-row`}
                          className="flex items-center gap-1 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={column.iconNearColumnTitle}
                            onChange={() =>
                              toggleIconNearColumnTitle(column.id)}
                            className="checkbox checkbox-primary checkbox-sm"
                          />
                          Display icon near column title
                        </label>

                        {fauxFlex1}
                      </div>
                      <details
                        tabIndex={0}
                        className="collapse mt-6 collapse-arrow bg-error/10 border-error border-1 cursor-default"
                      >
                        <summary className="collapse-title flex items-center font-semibold text-error">
                          <span
                            className="iconify hugeicons--alert-01 text-xl mr-3 tooltip"
                            data-tip="WARNING: cannot be undone"
                          >
                          </span>{" "}
                          Delete the column
                        </summary>
                        <div className="collapse-content text-sm space-y-3 font-bold">
                          <p>This change CANNOT be undone.</p>
                          <p>
                            The following{" "}
                            <span className="badge badge-error badge-soft">
                              {columnTasks.length}
                            </span>{" "}
                            tasks will be deleted if you proceed:
                          </p>
                          {rowsWithTasks.map(({ row, tasks }) => (
                            <ul
                              key={row.id}
                              className="menu-config space-y-2 bg-base-200 rounded w-full font-normal"
                            >
                              <li className="menu-title font-bold font-varela-round text-error">
                                {row.title}
                              </li>
                              {tasks.map((task) => (
                                <li key={task.id}>
                                  <hr className="opacity-30 mb-2" />
                                  <span>
                                    {task.title}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ))}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteColumn(column.id);
                            }}
                            className="btn btn-sm btn-error ml-auto"
                          >
                            <span className="iconify hugeicons--column-delete text-xl">
                            </span>
                            Destroy column and all tasks
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              );
            })}
            {draggedDefaultIndex !== null &&
              draggedDefaultIndex !== columns.length - 1 && (
              <div
                onDragOver={(e) => {
                  handleDefaultColumnDragOver(e);
                  setDragHoverIndex(columns.length);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = columns[draggedDefaultIndex]?.id;
                  if (draggedId) reorderColumn(draggedId, null);
                  setDraggedDefaultIndex(null);
                  setDragHoverIndex(null);
                }}
                className="relative w-2 shrink-0"
              >
                {dragHoverIndex === columns.length && (
                  <span className="absolute inset-y-0 w-0.5 bg-accent right-0" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

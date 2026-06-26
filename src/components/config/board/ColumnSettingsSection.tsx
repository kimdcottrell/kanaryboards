import { useState } from "react";
import type { ReactNode } from "react";
import AsyncCreatableSelect from "react-select/async-creatable";
import BoardMenu from "../../BoardMenu.tsx";
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
    handleDefaultColumnInputKeyDown,
    handleDefaultColumnDragStart,
    handleDefaultColumnDragOver,
    handleDefaultColumnDrop,
    reorderColumn,
    deleteColumn,
    togglePinColumn,
    toggleIconInBoardMenu,
    toggleIconNearColumnTitle,
  } = useColumnConfigActions();

  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);

  const pinnedCount = columns.filter((column) => column.pinned).length;

  return (
    <div
      id="board-config-column-settings"
      className="mt-6 bg-base-200 p-5"
    >
      <div className="mb-6 sm:items-center sm:justify-between space-y-3">
        <h3 className="text-lg font-semibold">
          Column settings
        </h3>
        <p className="text-sm">
          Manage the columns set used across projects. Drag cards to reorder,
          pin to the board shortcut menu, or add a new default column.
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
      </div>
      {columns.some((column) => column.pinned) && (
        <>
          <hr className="opacity-50" />
          <div className="mt-6 h-12 flex items-center justify-center">
            <div className="indicator">
              <span className="indicator-item badge badge-warning text-xl p-3 rounded-xs badge-sm z-101">
                Preview
              </span>
              <BoardMenu isPreview />
            </div>
          </div>
        </>
      )}
      <div className="flex gap-2 overflow-x-auto my-6">
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
          const pinBlocked = !column.pinned && pinnedCount >= 3;
          const fauxFlex1: ReactNode[] = [];
          const columnTasks = tasks.filter((task) => task.colId === column.id);
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
              <div className="w-xs h-full shrink-0 card card-border card-md bg-base-300 border-base-content/50 cursor-grab">
                <div className="card-body">
                  <h2 className="card-title">
                    {editingColumnId === column.id
                      ? (
                        <input
                          className="w-full border border-base-300 px-2 py-1 text-lg font-semibold outline-none focus:border-base-content/40"
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
                          onDoubleClick={() => editColumnTitle(column, null)}
                          title="Double-click to edit"
                        >
                          {column.iconNearColumnTitle && column.icon && (
                            <DynamicIcon
                              name={column.icon}
                              className="h-5 w-5"
                            />
                          )}
                          {column.title}
                          <span className="iconify hugeicons--edit-03 text-base-content text-md opacity-0 group-hover:opacity-100 shrink-0">
                          </span>
                        </span>
                      )}
                  </h2>
                  <hr className="my-3" />
                  <h4>Pin to board shortcut menu</h4>
                  <div className="flex items-center gap-2">
                    <div
                      className={pinBlocked ? "tooltip tooltip-error" : ""}
                      data-tip={pinBlocked
                        ? "You can only pin 3 columns. Unpin one to proceed."
                        : undefined}
                    >
                      <button
                        type="button"
                        disabled={pinBlocked}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!pinBlocked) togglePinColumn(column.id);
                        }}
                        aria-label={column.pinned
                          ? "Unpin column from board menu"
                          : "Pin column to board menu"}
                        className={`shadow-none w-fit py-2 px-1 btn btn-sm btn-secondary dark:btn-border-secondary light:text-secondary-content hover:bg-secondary/80 dark:text-base-100 hover:text-secondary-content! ${
                          column.pinned
                            ? "bg-secondary text-secondary-content!"
                            : "bg-secondary/20 text-secondary!"
                        }`}
                      >
                        <span className="iconify hugeicons--pin text-2xl font-bold">
                        </span>
                      </button>
                    </div>
                    <section className="total-pinned">
                      <div className="inline-block badge badge-lg text-base-100 bg-base-content/60">
                        {pinnedCount}/3
                      </div>
                    </section>
                  </div>
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
                    {column.pinned
                      ? (
                        <label
                          key={`${column.id}-enable-shortcut-menu`}
                          className="flex items-center gap-1 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={column.iconInBoardMenu}
                            onChange={() => toggleIconInBoardMenu(column.id)}
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
                        onChange={() => toggleIconNearColumnTitle(column.id)}
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

      <section className="flex flex-row">
        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">Create a new column</legend>
          <input
            className="input input-primary"
            type="text"
            value={defaultColumnInput}
            onChange={(e) => setDefaultColumnInput(e.currentTarget.value)}
            onKeyDown={handleDefaultColumnInputKeyDown}
            placeholder="Add new column"
          />
          <p className="label">Hit enter to create</p>
        </fieldset>

        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">To the left or right of</legend>
          <select className="select">
            <option disabled selected>Pick a direction</option>
            <option>Chrome</option>
            <option>FireFox</option>
            <option>Safari</option>
          </select>
          <span className="label">Optional</span>
        </fieldset>
        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">Column name</legend>
          <select className="select">
            <option disabled selected>Pick a column</option>
            <option>Chrome</option>
            <option>FireFox</option>
            <option>Safari</option>
          </select>
          <span className="label">Optional</span>
        </fieldset>
      </section>
    </div>
  );
}

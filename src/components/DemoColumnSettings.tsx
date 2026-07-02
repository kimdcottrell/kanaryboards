import ColumnReorderList from "./config/board/ColumnReorderList.tsx";

export default function DemoColumnSettings() {
  return (
    <div className="mt-6 bg-base-200 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          Reorder your columns
        </h3>
        <p className="text-sm">
          Drag the columns to arrange your workflow however makes sense to you.
        </p>
      </div>
      <ColumnReorderList
        renderCard={(column) => (
          <div className="h-full shrink-0 card card-xs bg-secondary/75 border-b-2 border-r-2 border-base-content/25 cursor-grab">
            <div className="card-body">
              <h2 className="card-title text-base text-primary-content">
                {column.title}
              </h2>
            </div>
          </div>
        )}
      />
    </div>
  );
}

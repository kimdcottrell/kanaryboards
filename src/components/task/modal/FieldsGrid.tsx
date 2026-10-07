import type { ReactNode } from "react";

// Layout shared by every task modal. Mobile: Status/Project, AI generation,
// checklist, description. Desktop: Status/Project across the top, then the
// description beside the checklist column.
export default function FieldsGrid({
  description,
  status,
  project,
  checklist,
  checklistGeneration,
}: {
  description: ReactNode;
  status: ReactNode;
  project: ReactNode;
  checklist: ReactNode;
  checklistGeneration?: ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4 items-start">
      {description}
      <div className="grid grid-cols-2 gap-4 items-start md:col-span-2 md:order-first">
        {status}
        {project}
      </div>
      <div className="flex flex-col gap-4">
        {checklist}
        {checklistGeneration && (
          <div className="order-first md:order-0">{checklistGeneration}</div>
        )}
      </div>
    </div>
  );
}

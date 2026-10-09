import type { ReactNode } from "react";

// Layout shared by every task modal. Mobile: Status/Project, AI generation,
// checklist, description — the column wrappers are `contents`, so each field
// sits directly in the grid and `order` sets the sequence. Desktop: two
// independent columns (Status over description, Project over checklist), so
// a tall project list never pushes the description down.
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
    <div className="grid grid-cols-2 gap-4 items-start">
      <div className="contents md:flex md:flex-col md:gap-4">
        {status}
        <div className="col-span-2 order-last md:order-0">{description}</div>
      </div>
      <div className="contents md:flex md:flex-col md:gap-4">
        {project}
        <div className="col-span-2 order-2 md:order-0">{checklist}</div>
        {checklistGeneration && (
          <div className="col-span-2 order-1 md:order-last">
            {checklistGeneration}
          </div>
        )}
      </div>
    </div>
  );
}

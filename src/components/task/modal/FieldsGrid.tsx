import type { ReactNode } from "react";

// Layout shared by every task modal. Mobile: one field per row — Status,
// description, Project, AI generation, checklist — the column wrappers are
// `contents`, so each field sits directly in the grid and `order` sets the
// sequence. Desktop: two independent columns (Status over description,
// Project over checklist), so a tall project list never pushes the
// description down.
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 items-start">
      <div className="contents md:flex md:flex-col md:gap-6">
        {status}
        <div className="order-1 md:order-0">{description}</div>
      </div>
      <div className="contents md:flex md:flex-col md:gap-6">
        <div className="order-2 md:order-0">{project}</div>
        <div className="order-4 md:order-0">{checklist}</div>
        {checklistGeneration && (
          <div className="order-3 md:order-last">
            {checklistGeneration}
          </div>
        )}
      </div>
    </div>
  );
}

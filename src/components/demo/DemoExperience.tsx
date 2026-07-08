import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { BoardProvider } from "../context/BoardContext.tsx";
import DemoBoardView from "./DemoBoardView.tsx";
import RowSettingsSection from "../config/board/RowSettingsSection.tsx";
import DemoColumnSettings from "./DemoColumnSettings.tsx";

const demoRouter = createMemoryRouter(
  [
    { path: "/dashboard", Component: DemoBoardView },
    { path: "/dashboard/task/:taskId", Component: DemoBoardView },
  ],
  { initialEntries: ["/dashboard"] },
);

export default function DemoExperience() {
  return (
    <BoardProvider boardId="demo" isAuthenticated={false}>
      <section id="demo" className="bg-base-200">
        <div className="text-center max-w-11/12 mx-auto px-3 py-20 space-y-3">
          <h2 className="text-4xl font-semibold mb-8">Try it right here</h2>
          <p>
            You're looking at a single, interactive project row from a Kanby
            dashboard.
          </p>

          <p>
            The only difference between it and a true Kanby dashboard is that an
            actual dashboard can contain multiple rows, just like this.
          </p>

          <p>
            Try it out! Drag cards, edit titles, create tasks, and check off
            items. Nothing you do here is saved, so feel free to experiment.
          </p>

          <p>
            Ready to build your own?{" "}
            <a href="/dashboard" className="link link-primary">
              Visit the dashboard
            </a>{" "}
            and start organizing your projects in minutes.
          </p>
        </div>
        <div className="min-w-100 bg-base-100 rounded shadow-xl">
          <RouterProvider router={demoRouter} />
        </div>
      </section>
      <section
        id="customization"
        className="relative bg-ctp-sapphire-400/15 dark:bg-secondary/20"
      >
        <section className="z-3 relative">
          <div className="text-center mx-auto max-w-11/12 px-3 py-20 space-y-3">
            <h2 className="text-4xl font-semibold mb-8">
              A workspace that works with you,<br />not against you.
            </h2>
            <p>
              Traditional project management tools often lock you down in their
              fixed workflow - Kanby is built to free you up.
            </p>
            <p>
              Finally, a productivity tool that actually helps you get things
              done your way.
            </p>
            <p>
              Below is a demonstration of just a tiny fraction of what you can
              customize. Change a setting and watch the demo board above change
              in real time!
            </p>
          </div>
          <div className="grid gap-10 md:grid-cols-2 px-3 pb-20 max-w-6xl mx-auto">
            <div className="rounded bg-base-100 p-5 shadow-md space-y-6">
              <h3 className="text-2xl font-semibold font-roboto-slab mb-4">
                Try out some of the row and column settings below:
              </h3>
              <span className="text-sm">
                Change a setting and watch the demo board above change in real
                time!
              </span>
              <RowSettingsSection />
              <DemoColumnSettings />
            </div>
            <div
              id="features-and-customizations"
              className="rounded bg-base-100 p-5 shadow-md space-y-6 md:flex md:flex-col"
            >
              <h3 className="text-2xl font-semibold font-roboto-slab mb-4">
                Here are some of the features and customizations built into
                Kanby dashboards:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="iconify hugeicons--ai-magic text-2xl text-ctp-sky-700 dark:text-ctp-sapphire-600" />
                  <span>AI-assisted task and checklist generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="iconify hugeicons--dashboard-square-setting text-2xl text-ctp-sky-700 dark:text-ctp-sapphire-600" />
                  <span>
                    Flexible project rows and column management
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="iconify hugeicons--drag-drop text-2xl text-ctp-sky-700 dark:text-ctp-sapphire-600" />
                  <span>Drag-and-drop organization across the board</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="iconify hugeicons--paint-board text-2xl text-ctp-sky-700 dark:text-ctp-sapphire-600" />
                  <span>Per-project color theming</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="iconify hugeicons--arrow-left-right text-2xl text-ctp-sky-700 dark:text-ctp-sapphire-600" />
                  <span>Custom column ordering</span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="iconify hugeicons--pin text-2xl text-ctp-sky-700 dark:text-ctp-sapphire-600" />
                  <span>
                    Configure shortcut menus to fit your needs
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="iconify hugeicons--image-01 text-2xl text-ctp-sky-700 dark:text-ctp-sapphire-600" />
                  <span>Custom column icons for faster recognition</span>
                </li>
              </ul>

              <div className="md:self-end md:mt-auto!">
                <a href="/dashboard">
                  <button
                    type="button"
                    className="btn btn-lg btn-warning font-roboto-slab! font-normal text-xl inline-flex items-center gap-2 shadow-none"
                  >
                    <span className="iconify hugeicons--rocket-01 text-xl">
                    </span>
                    Start a project
                  </button>
                </a>
                <p className="text-right text-xs italic">
                  No account required!
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </BoardProvider>
  );
}

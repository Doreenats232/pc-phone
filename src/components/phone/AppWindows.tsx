"use client";

import { AppView } from "@/components/apps/registry";
import { useOS } from "./os-context";

/** Every open app stays mounted (state is preserved) but only the active one is visible. */
export function AppWindows() {
  const { openApps, activeId, catalog } = useOS();
  return (
    <>
      {openApps.map((id) => {
        const app = catalog.find((a) => a.id === id);
        const active = activeId === id;
        return (
          <div
            key={id}
            className={`win-area absolute inset-x-0 z-10 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 ${
              active ? "anim-app-open flex" : "hidden"
            }`}
          >
            {app && <AppView id={id} />}
          </div>
        );
      })}
    </>
  );
}

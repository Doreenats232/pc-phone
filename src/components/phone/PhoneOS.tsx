"use client";

import { useEffect } from "react";
import { WALLPAPERS } from "@/lib/catalog";
import { OSProvider, useOS } from "./os-context";
import { NavBar, StatusBar } from "./Bars";
import { HomeScreen } from "./HomeScreen";
import { Overlays } from "./Overlays";
import { BootScreen, LockScreen } from "./LockScreen";
import { AppWindows } from "./AppWindows";

export default function PhoneOS() {
  return (
    <OSProvider>
      <Phone />
    </OSProvider>
  );
}

function Phone() {
  const { settings, booted, locked, back } = useOS();
  const brightness = settings.brightness;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back]);

  const wallpaper = WALLPAPERS[settings.wallpaper]?.css ?? WALLPAPERS[0].css;
  const dim = ((100 - brightness) / 100) * 0.8;

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-950 md:p-6">
      <div
        className={`${settings.darkMode ? "dark" : ""} relative h-dvh w-full select-none overflow-hidden bg-black text-white md:h-[844px] md:w-[390px] md:rounded-[3rem] md:border-[10px] md:border-slate-800 md:shadow-2xl`}
      >
        <div className="absolute inset-0 transition-[background] duration-500" style={{ background: wallpaper }} />

        {booted && (
          <>
            <HomeScreen />
            <AppWindows />
            <Overlays />
            <StatusBar />
            {!locked && <NavBar />}
            {locked && <LockScreen />}
          </>
        )}
        {!booted && <BootScreen />}

        {/* Brightness control */}
        <div className="pointer-events-none absolute inset-0 z-[90] bg-black" style={{ opacity: dim }} />
      </div>
    </div>
  );
}

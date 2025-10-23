'use client';

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import viewsData from "@/data/views.json";
import type { BuddyRecord } from "@/lib/buddyData";
import ChatModal from "./chatmodal/ChatModal";

type ViewConfig = {
  id: string;
  name: string;
  description?: string;
  buddies?: BuddyRecord[];
};

type Buddy = BuddyRecord;

const viewConfigs: ViewConfig[] = (viewsData.views ?? []) as ViewConfig[];

const firstPopulatedViewIndex = viewConfigs.findIndex(
  (view) => (view.buddies?.length ?? 0) > 0,
);
const initialViewIndex =
  firstPopulatedViewIndex !== -1 ? firstPopulatedViewIndex : 0;

const initialBuddyId =
  viewConfigs[initialViewIndex]?.buddies?.[0]?.id ?? null;

const statusConfig: Record<string, { label: string; tone: string }> = {
  online: { label: "Online", tone: "bg-emerald-400" },
  idle: { label: "Idle", tone: "bg-amber-300" },
  offline: { label: "Offline", tone: "bg-zinc-400" },
};

export default function Home() {
  const [viewIndex, setViewIndex] = useState(initialViewIndex);
  const [activeBuddyId, setActiveBuddyId] =
    useState<string | null>(initialBuddyId);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(
    Boolean(initialBuddyId),
  );
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const currentView =
    viewConfigs[viewIndex] ?? viewConfigs[0] ?? { id: "empty", name: "No Views", buddies: [] };
  const viewBuddies = useMemo(
    () =>
      (currentView.buddies ?? []).filter(
        (entry): entry is Buddy =>
          Boolean(entry) &&
          typeof entry === "object" &&
          "id" in entry &&
          typeof entry.id === "string" &&
          entry.id.length > 0,
      ),
    [currentView.buddies],
  );

  const activeBuddy = useMemo(
    () => viewBuddies.find((buddy) => buddy.id === activeBuddyId) ?? null,
    [activeBuddyId, viewBuddies],
  );

  useEffect(() => {
    const fallbackId = viewBuddies[0]?.id ?? null;
    setActiveBuddyId(fallbackId);
    setIsChatOpen(Boolean(fallbackId));
  }, [viewIndex, viewBuddies]);

  const goToNextView = useCallback(() => {
    if (!viewConfigs.length) {
      return;
    }

    setViewIndex((previousIndex) =>
      previousIndex + 1 >= viewConfigs.length ? 0 : previousIndex + 1,
    );
  }, []);

  const goToPreviousView = useCallback(() => {
    if (!viewConfigs.length) {
      return;
    }

    setViewIndex((previousIndex) =>
      previousIndex - 1 < 0 ? viewConfigs.length - 1 : previousIndex - 1,
    );
  }, []);

  const hasMultipleViews = viewConfigs.length > 1;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden font-sans text-zinc-100">
      <div className="absolute left-6 top-6 z-50 hidden items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-[0_16px_36px_rgba(0,0,0,0.4)] backdrop-blur md:flex">
        <div className="absolute inset-0 -z-10 rounded-xl bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.2),transparent_55%)]" />
        <div className="absolute inset-0 -z-20 rounded-xl bg-[radial-gradient(circle_at_bottom_right,rgba(94,234,212,0.15),transparent_30%)]" />
        <button
          type="button"
          onClick={goToPreviousView}
          aria-label="Previous view"
          disabled={!hasMultipleViews}
          className="rounded-xl px-2 py-1 text-xs uppercase tracking-[0.35em] text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {"←"}
        </button>
        <span className="min-w-[150px] text-center text-xs font-semibold uppercase tracking-[0.35em] text-white">
          {currentView.name}
        </span>
        <button
          type="button"
          onClick={goToNextView}
          aria-label="Next view"
          disabled={!hasMultipleViews}
          className="rounded-xl px-2 py-1 text-xs uppercase tracking-[0.35em] text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {"→"}
        </button>
      </div>
      <button
        type="button"
        aria-label="Open agents menu"
        onClick={() => setIsMenuOpen(true)}
        className="absolute right-5 top-5 z-30 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-white shadow-[0_12px_28px_rgba(0,0,0,0.45)] backdrop-blur transition hover:border-white/30 hover:bg-black/70 md:hidden"
      >
        <span className="flex h-4 flex-col items-center justify-between">
          <span className="block h-0.5 w-4 rounded-full bg-white" />
          <span className="block h-0.5 w-4 rounded-full bg-white" />
          <span className="block h-0.5 w-4 rounded-full bg-white" />
        </span>
      </button>
      {isMenuOpen ? (
        <MobileBuddyMenu
          viewName={currentView.name}
          buddies={viewBuddies}
          activeBuddyId={activeBuddyId}
          onSelect={(buddyId) => {
            setActiveBuddyId(buddyId);
            setIsChatOpen(true);
          }}
          onClose={() => setIsMenuOpen(false)}
        />
      ) : null}
      <MapPlane
        buddies={viewBuddies}
        activeBuddyId={activeBuddyId}
        onSelect={(buddyId) => {
          setActiveBuddyId(buddyId);
          setIsChatOpen(true);
        }}
      />
      <aside
        className={`relative z-10 h-full w-full max-w-md transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isChatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <ChatModal
          buddy={activeBuddy}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      </aside>
    </div>
  );
}

type MapPlaneProps = {
  buddies: Buddy[];
  activeBuddyId: string | null;
  onSelect: (buddyId: string) => void;
};

function MapPlane({ buddies, activeBuddyId, onSelect }: MapPlaneProps) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
      <Image
        src="/background.png"
        alt="Antwerp satellite view"
        fill
        priority
        className="object-cover grayscale"
      />
      <div className="absolute inset-0 bg-black/75 mix-blend-multiply" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(32,40,52,0.65),rgba(6,8,10,0.95))]" />

      <div className="relative h-[88vh] w-[88vw] max-w-5xl">
        {!buddies.length ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-[32px] text-center text-sm text-zinc-300 backdrop-blur">
            No agents active in this regio.
          </div>
        ) : null}
        {buddies.map((buddy) => {
          if (
            !buddy?.location ||
            typeof buddy.location.x !== "number" ||
            typeof buddy.location.y !== "number"
          ) {
            return null;
          }
          const status =
            statusConfig[buddy.status] ?? {
              label: "Unknown",
              tone: "bg-zinc-400",
            };
          const isActive = buddy.id === activeBuddyId;
          return (
            <button
              key={buddy.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(buddy.id)}
              style={{
                left: `${buddy.location.x}%`,
                top: `${buddy.location.y}%`,
              }}
              className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col rounded-[28px] border border-white/10 bg-white/10 p-4 text-left shadow-[0_20px_45px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out backdrop-blur ${
                isActive
                  ? "z-30 scale-[1.2] border-white/40 bg-white/20 shadow-[0_32px_70px_rgba(0,0,0,0.5)]"
                  : "hover:border-white/30 hover:bg-white/15"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 text-lg font-semibold text-white shadow-inner shadow-black/40">
                  {initialsFor(buddy.name)}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">
                    {buddy.name}
                  </span>
                  <span className="text-xs uppercase tracking-[0.35em] text-zinc-400">
                    {status.label}
                  </span>
                </div>
              </div>
              <p className="mt-3 max-w-[240px] text-sm leading-6 text-zinc-200">
                {buddy.role}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${status.tone}`}
                  />
                  Signal
                </span>
                <span>• {buddy.id.replace("-", " ")}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((token) => token[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type MobileBuddyMenuProps = {
  viewName: string;
  buddies: Buddy[];
  activeBuddyId: string | null;
  onSelect: (buddyId: string) => void;
  onClose: () => void;
};

function MobileBuddyMenu({
  viewName,
  buddies,
  activeBuddyId,
  onSelect,
  onClose,
}: MobileBuddyMenuProps) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#06080d]/90 backdrop-blur-xl md:hidden">
      <div className="absolute inset-0 -z-10 rounded-xl bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.2),transparent_55%)]" />
      <div className="absolute inset-0 -z-20 rounded-xl bg-[radial-gradient(circle_at_bottom_right,rgba(94,234,212,0.15),transparent_30%)]" />
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-300">
            {viewName}
          </span>
          <span className="mt-1 text-lg font-semibold text-white">
            Select Agent
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close agents menu"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition hover:bg-white/20"
        >
          <span className="relative block h-4 w-4">
            <span className="absolute left-1/2 top-1/2 block h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-white" />
            <span className="absolute left-1/2 top-1/2 block h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-white" />
          </span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-12">
        {buddies.length ? (
          <div className="flex flex-col gap-4">
            {buddies.map((buddy) => {
              if (!buddy) {
                return null;
              }
              const status =
                statusConfig[buddy.status] ?? {
                  label: "Unknown",
                  tone: "bg-zinc-400",
                };
              const isActive = buddy.id === activeBuddyId;

              return (
                <button
                  key={buddy.id}
                  type="button"
                  onClick={() => {
                    onSelect(buddy.id);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-3xl bg-white/10 px-5 py-4 text-left shadow-[0_16px_38px_rgba(0,0,0,0.35)] transition hover:bg-white/15 ${
                    isActive ? "bg-white/20" : ""
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {buddy.name}
                    </span>
                    <span className="mt-2 text-xs leading-5 text-zinc-300">
                      {buddy.role}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${status.tone}`}
                      />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white shadow-inner shadow-black/30">
                    {initialsFor(buddy.name)}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-center text-sm text-zinc-300">
            No agents are available in this view yet.
          </div>
        )}
      </div>
    </div>
  );
}

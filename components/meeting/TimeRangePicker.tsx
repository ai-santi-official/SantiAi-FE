"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";

const ITEM_H = 48;

function ScrollDrum({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const count = max - min + 1;

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = (value - min) * ITEM_H;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, count - 1));
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      onChange(min + clamped);
    }, 120);
  };

  return (
    <div className="relative" style={{ height: ITEM_H * 3, width: 64 }}>
      <div
        className="absolute inset-x-1 bg-santi-primary/20 rounded-lg pointer-events-none z-10"
        style={{ top: ITEM_H, height: ITEM_H }}
      />
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-20"
        style={{ height: ITEM_H, background: "linear-gradient(to bottom, #f8fafc 30%, transparent)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
        style={{ height: ITEM_H, background: "linear-gradient(to top, #f8fafc 30%, transparent)" }}
      />
      <div
        ref={ref}
        className="drum-scroll absolute inset-0 overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
        onScroll={handleScroll}
      >
        <div style={{ height: ITEM_H }} />
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-2xl font-bold text-black"
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
          >
            {(min + i).toString().padStart(2, "0")}
          </div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  );
}

export type TimeRange = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

type Props = {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
  onClose: () => void;
};

export function TimeRangePicker({ value, onChange, onClose }: Props) {
  const t = useTranslations("timeRangePicker");
  const tc = useTranslations("common");
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const set = (key: keyof TimeRange) => (v: number) =>
    onChange({ ...value, [key]: v });

  const Colon = () => (
    <span className="text-3xl font-bold text-black pb-1 select-none">:</span>
  );
  const Arrow = () => (
    <span className="text-xl font-bold text-santi-muted px-1 select-none">→</span>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl shadow-2xl">
        <div className="flex justify-center py-3">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <div className="px-6 pb-2">
          <h3 className="text-xl font-bold text-black">{t("title")}</h3>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-center gap-1 bg-slate-50 py-4 rounded-2xl">
            <ScrollDrum value={value.startHour} min={0} max={23} onChange={set("startHour")} />
            <Colon />
            <ScrollDrum value={value.startMinute} min={0} max={59} onChange={set("startMinute")} />
            <Arrow />
            <ScrollDrum value={value.endHour} min={0} max={23} onChange={set("endHour")} />
            <Colon />
            <ScrollDrum value={value.endMinute} min={0} max={59} onChange={set("endMinute")} />
          </div>
        </div>

        <div className="px-6 pb-10 pt-2 flex flex-col gap-3">
          <button
            onClick={onClose}
            className="w-full bg-santi-primary py-4 rounded-santi font-bold text-lg text-black active:scale-[0.98] transition-transform"
          >
            {tc("confirm")}
          </button>
          <button
            onClick={onClose}
            className="w-full text-black font-bold py-3 text-base"
          >
            {tc("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

// ─── Constants ────────────────────────────────────────────────────────────────
const ITEM_H = 48; // px — height of one drum row

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDisplay(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}  ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// ─── Scroll drum ──────────────────────────────────────────────────────────────
// Shows a snapping vertical list; the center item is the selected value.
// Top/bottom fades blend items into the slate-50 background.
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

  // Set scroll position synchronously before first paint so the drum
  // visually starts at the correct value (e.g. 23:59) with no flash.
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
      // Snap to the nearest item
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      onChange(min + clamped);
    }, 120);
  };

  return (
    <div className="relative" style={{ height: ITEM_H * 3, width: 72 }}>
      {/* Yellow centre highlight — sits behind text, above fades */}
      <div
        className="absolute inset-x-1 bg-santi-primary/20 rounded-lg pointer-events-none z-10"
        style={{ top: ITEM_H, height: ITEM_H }}
      />
      {/* Top fade — matches bg-slate-50 (#f8fafc) */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-20"
        style={{ height: ITEM_H, background: "linear-gradient(to bottom, #f8fafc 30%, transparent)" }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
        style={{ height: ITEM_H, background: "linear-gradient(to top, #f8fafc 30%, transparent)" }}
      />

      {/* Scrollable list */}
      <div
        ref={ref}
        className="drum-scroll absolute inset-0 overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
        onScroll={handleScroll}
      >
        <div style={{ height: ITEM_H }} />{/* top spacer */}
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-2xl font-bold text-black"
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
          >
            {(min + i).toString().padStart(2, "0")}
          </div>
        ))}
        <div style={{ height: ITEM_H }} />{/* bottom spacer */}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type Props = {
  value: string; // ISO string or ""
  onChange: (value: string) => void;
  placeholder?: string;
};

export function DatePicker({ value, onChange, placeholder = "Select date & time" }: Props) {
  const now = new Date();
  const [isOpen, setIsOpen] = useState(false);

  const initial = value ? new Date(value) : null;
  const [displayYear, setDisplayYear] = useState(initial?.getFullYear() ?? now.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(initial?.getMonth() ?? now.getMonth());
  const [selectedDay, setSelectedDay] = useState<{ y: number; m: number; d: number } | null>(
    initial ? { y: initial.getFullYear(), m: initial.getMonth(), d: initial.getDate() } : null
  );
  const [hour, setHour] = useState(initial?.getHours() ?? 23);
  const [minute, setMinute] = useState(initial?.getMinutes() ?? 59);

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Build calendar grid
  const totalInMonth = daysInMonth(displayYear, displayMonth);
  const firstDay = firstDayOfMonth(displayYear, displayMonth);
  const prevMonthDays = daysInMonth(
    displayMonth === 0 ? displayYear - 1 : displayYear,
    displayMonth === 0 ? 11 : displayMonth - 1
  );
  type Cell = { day: number; current: boolean };
  const cells: Cell[] = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: prevMonthDays - i, current: false });
  for (let d = 1; d <= totalInMonth; d++)
    cells.push({ day: d, current: true });
  const tail = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= tail; d++)
    cells.push({ day: d, current: false });

  const prevMonth = () => {
    if (displayMonth === 0) { setDisplayYear(y => y - 1); setDisplayMonth(11); }
    else setDisplayMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (displayMonth === 11) { setDisplayYear(y => y + 1); setDisplayMonth(0); }
    else setDisplayMonth(m => m + 1);
  };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isCurrentMonth = displayYear === now.getFullYear() && displayMonth === now.getMonth();

  const isSelected = (d: number) =>
    selectedDay?.y === displayYear && selectedDay?.m === displayMonth && selectedDay?.d === d;
  const isToday = (d: number) =>
    now.getFullYear() === displayYear && now.getMonth() === displayMonth && now.getDate() === d;
  const isPast = (d: number) =>
    new Date(displayYear, displayMonth, d) < today;

  const open = () => {
    const ref = value ? new Date(value) : now;
    setDisplayYear(ref.getFullYear());
    setDisplayMonth(ref.getMonth());
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedDay) return;
    const date = new Date(selectedDay.y, selectedDay.m, selectedDay.d, hour, minute);
    onChange(date.toISOString());
    setIsOpen(false);
  };

  return (
    <>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={open}
        className="w-full h-14 px-4 bg-white border border-santi-muted rounded-xl flex items-center justify-between text-base transition-colors focus:outline-none focus:border-santi-primary focus:ring-2 focus:ring-santi-primary/25"
      >
        <span className={value ? "text-black" : "text-santi-muted"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <span className="text-santi-primary"><CalendarIcon className="w-5 h-5" /></span>
      </button>

      {/* ── Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Blurred backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Bottom sheet */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            <div className="px-6 pb-4">
              <h3 className="text-xl font-bold text-black">Select Deadline</h3>
            </div>

            {/* ── Calendar ── */}
            <div className="px-6 py-2">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-lg text-black">
                  {MONTH_NAMES[displayMonth]} {displayYear}
                </p>
                <div className="flex gap-3">
                  <button onClick={prevMonth} disabled={isCurrentMonth} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400"><ChevronLeftIcon className="w-[22px] h-[22px]" /></button>
                  <button onClick={nextMonth} className="text-slate-400 p-1"><ChevronRightIcon className="w-[22px] h-[22px]" /></button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center mb-2">
                {DAY_LABELS.map((l, i) => (
                  <span key={i} className="text-slate-400 text-xs font-semibold py-1">{l}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 text-center">
                {cells.map((cell, i) => {
                  const sel = cell.current && isSelected(cell.day);
                  const tod = cell.current && isToday(cell.day);
                  const past = cell.current && isPast(cell.day);
                  const disabled = !cell.current || past;
                  return (
                    <button
                      key={i}
                      disabled={disabled}
                      onClick={() =>
                        !disabled &&
                        setSelectedDay({ y: displayYear, m: displayMonth, d: cell.day })
                      }
                      className={`py-2 mx-auto w-9 text-sm rounded-full transition-colors ${
                        sel
                          ? "bg-santi-primary text-black font-bold"
                          : tod
                          ? "text-santi-primary font-semibold"
                          : disabled
                          ? "text-slate-300 cursor-default"
                          : "text-black hover:bg-santi-secondary"
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Time drums ── */}
            <div className="px-6 py-6 border-t border-slate-100 mt-4">
              <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-4">
                Deadline Time
              </p>

              <div className="flex items-center justify-center gap-2 bg-slate-50 py-4 rounded-2xl">
                <ScrollDrum value={hour} min={0} max={23} onChange={setHour} />
                <span className="text-3xl font-bold text-black pb-1 select-none">:</span>
                <ScrollDrum value={minute} min={0} max={59} onChange={setMinute} />
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="px-6 pb-10 pt-2 flex flex-col gap-3">
              <button
                onClick={handleConfirm}
                disabled={!selectedDay}
                className="w-full bg-santi-primary py-4 rounded-santi font-bold text-lg text-black active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-black font-bold py-3 text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

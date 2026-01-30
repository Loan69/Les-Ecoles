"use client";
import { useRef, useState } from "react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import { CalendarDays, X } from "lucide-react";
import { CalendarEvent } from "@/types/CalendarEvent";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";

// locale FR (inline)
const localeFr = {
  name: "fr",
  months: [
    ["Janvier", "Jan"],
    ["Février", "Fév"],
    ["Mars", "Mar"],
    ["Avril", "Avr"],
    ["Mai", "Mai"],
    ["Juin", "Juin"],
    ["Juillet", "Juil"],
    ["Août", "Aoû"],
    ["Septembre", "Sep"],
    ["Octobre", "Oct"],
    ["Novembre", "Nov"],
    ["Décembre", "Déc"],
  ],
  weekDays: [
    ["Samedi", "Sam"],
    ["Dimanche", "Dim"],
    ["Lundi", "Lun"],
    ["Mardi", "Mar"],
    ["Mercredi", "Mer"],
    ["Jeudi", "Jeu"],
    ["Vendredi", "Ven"],
  ],
  digits: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  meridiems: [
    ["AM", "AM"],
    ["PM", "PM"],
  ],
  today: "Aujourd'hui",
  clear: "Effacer",
};

interface DateSelectorProps {
  form: CalendarEvent;
  setForm: React.Dispatch<React.SetStateAction<CalendarEvent>>;
}

export default function DateSelector({ form, setForm }: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<unknown>(null);
  const dates: string[] = form.dates_event ?? [];

  const formatFr = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const removeDate = (dateToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      dates_event: prev.dates_event?.filter((d) => d !== dateToRemove),
    }));
  };

  return (
    <div className="relative">
      {/* Bouton calendrier */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          // Ouvre le picker programmatiquement
          setTimeout(() => {
            (pickerRef.current as { openCalendar: () => void } | null)?.openCalendar();
          }, 0);
                  }}
        className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-blue-500 rounded-lg text-blue-800 hover:bg-blue-50 transition"
      >
        <CalendarDays size={18} />
        {dates.length === 0 ? (
          <span className="text-sm text-blue-600">Sélectionner une ou plusieurs dates</span>
        ) : (
          <span className="text-sm text-blue-800 font-medium">
            {dates.length} date{dates.length > 1 ? "s" : ""} sélectionnée{dates.length > 1 ? "s" : ""}
          </span>
        )}
      </button>

      {/* Calendrier caché */}
      <DatePicker
        ref={pickerRef}
        multiple
        locale={localeFr}
        format="DD/MM/YYYY"
        weekStartDayIndex={1}
        value={
          dates.map((d) => new DateObject(d))
        }
        onChange={(datesPicked: DateObject | DateObject[]) => {
          const arr = Array.isArray(datesPicked) ? datesPicked : [datesPicked];
          const formatted = arr.map((d) => formatDateKeyLocal(d.toDate()));
          setForm((prev) => ({ ...prev, dates_event: formatted }));
        }}
        onClose={() => setIsOpen(false)}
        portal
        // 🔑 Cette prop rend l'input invisible
        render={(value, openCalendar) => {
          return <div style={{ display: 'none' }} />;
        }}
        className="border border-blue-500 rounded-lg text-blue-800 shadow-lg"
      />

      {/* Pastilles des dates sélectionnées */}
      {dates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dates.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-sm shadow-sm"
            >
              <span>{formatFr(d)}</span>
              <button
                type="button"
                onClick={() => removeDate(d)}
                className="w-4 h-4 flex items-center justify-center text-blue-800 hover:text-red-600"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
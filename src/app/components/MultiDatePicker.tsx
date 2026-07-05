"use client";

import { useRef } from "react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import { CalendarDays, X } from "lucide-react";
import { formatDateKeyLocal } from "@/lib/utilDate";

// Sélecteur générique de dates multiples (non contiguës), même librairie que les événements.
const localeFr = {
  name: "fr",
  months: [
    ["Janvier", "Jan"], ["Février", "Fév"], ["Mars", "Mar"], ["Avril", "Avr"],
    ["Mai", "Mai"], ["Juin", "Juin"], ["Juillet", "Juil"], ["Août", "Aoû"],
    ["Septembre", "Sep"], ["Octobre", "Oct"], ["Novembre", "Nov"], ["Décembre", "Déc"],
  ],
  weekDays: [
    ["Samedi", "Sam"], ["Dimanche", "Dim"], ["Lundi", "Lun"], ["Mardi", "Mar"],
    ["Mercredi", "Mer"], ["Jeudi", "Jeu"], ["Vendredi", "Ven"],
  ],
  digits: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  meridiems: [["AM", "AM"], ["PM", "PM"]],
  today: "Aujourd'hui",
  clear: "Effacer",
};

interface MultiDatePickerProps {
  value: string[]; // dates "YYYY-MM-DD"
  onChange: (dates: string[]) => void;
}

export default function MultiDatePicker({ value, onChange }: MultiDatePickerProps) {
  const pickerRef = useRef<unknown>(null);

  const formatFr = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const sorted = [...value].sort();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setTimeout(() => {
            (pickerRef.current as { openCalendar: () => void } | null)?.openCalendar();
          }, 0);
        }}
        className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-blue-500 rounded-lg text-blue-800 hover:bg-blue-50 transition"
      >
        <CalendarDays size={18} />
        {value.length === 0 ? (
          <span className="text-sm text-blue-600">Sélectionner une ou plusieurs dates</span>
        ) : (
          <span className="text-sm text-blue-800 font-medium">
            {value.length} date{value.length > 1 ? "s" : ""} sélectionnée{value.length > 1 ? "s" : ""}
          </span>
        )}
      </button>

      <DatePicker
        ref={pickerRef}
        multiple
        locale={localeFr}
        format="DD/MM/YYYY"
        weekStartDayIndex={1}
        value={value.map((d) => new DateObject(d))}
        onChange={(datesPicked: DateObject | DateObject[]) => {
          const arr = Array.isArray(datesPicked) ? datesPicked : [datesPicked];
          onChange(arr.map((d) => formatDateKeyLocal(d.toDate())));
        }}
        portal
        render={() => <div style={{ display: "none" }} />}
      />

      {sorted.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {sorted.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-sm shadow-sm">
              <span>{formatFr(d)}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== d))}
                className="w-4 h-4 flex items-center justify-center text-blue-800 hover:text-red-600 cursor-pointer"
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

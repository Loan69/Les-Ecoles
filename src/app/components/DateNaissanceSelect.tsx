"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DateNaissanceFieldProps {
    label?: string;
    value?: string;
    onChange: (value: string) => void;
}

export default function DateNaissanceField({
    label = "Date de naissance",
    value,
    onChange,
    }: DateNaissanceFieldProps) {
    const [day, setDay] = useState("");
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    // Si value contient une date ISO (préremplissage)
    useEffect(() => {
        if (value) {
        const [y, m, d] = value.split("-");
        setYear(y);
        setMonth(String(parseInt(m)));
        setDay(String(parseInt(d)));
        }
    }, [value]);

    const handleChange = (newDay: string, newMonth: string, newYear: string) => {
        if (newDay && newMonth && newYear) {
          // Format français
          const fr = `${String(newDay).padStart(2, "0")}/${String(newMonth).padStart(2, "0")}/${newYear}`;
          onChange(fr);
        }
      };
      

    const Select = ({
        value,
        onChange,
        children,
        placeholder,
    }: {
        value: string;
        onChange: (e: any) => void;
        children: React.ReactNode;
        placeholder: string;
    }) => (
        <div className="relative flex-1">
        <select
            value={value}
            onChange={onChange}
            className="w-full appearance-none rounded-xl border border-blue-400 bg-white px-4 py-2.5 pr-10 text-blue-800 shadow-sm transition-all hover:border-blue-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
            <option value="">{placeholder}</option>
            {children}
        </select>
        <ChevronDown className="absolute right-3 top-3 h-5 w-5 text-blue-500 pointer-events-none" />
        </div>
    );

    return (
        <div className="flex flex-col space-y-2">
        <label className="text-sm font-semibold text-blue-700">{label}</label>

        <div className="flex gap-3">
            {/* Jour */}
            <Select
            value={day}
            onChange={(e) => {
                setDay(e.target.value);
                handleChange(e.target.value, month, year);
            }}
            placeholder="Jour"
            >
            {days.map((d) => (
                <option key={d} value={d}>{d}</option>
            ))}
            </Select>

            {/* Mois */}
            <Select
            value={month}
            onChange={(e) => {
                setMonth(e.target.value);
                handleChange(day, e.target.value, year);
            }}
            placeholder="Mois"
            >
            {months.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
            ))}
            </Select>

            {/* Année */}
            <Select
            value={year}
            onChange={(e) => {
                setYear(e.target.value);
                handleChange(day, month, e.target.value);
            }}
            placeholder="Année"
            >
            {years.map((y) => (
                <option key={y} value={y}>{y}</option>
            ))}
            </Select>
        </div>
        </div>
    );
}

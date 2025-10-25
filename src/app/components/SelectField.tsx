"use client";

import React from "react";
import { Option } from "@/types/Option";

interface SelectFieldProps {
    label?: string;
    name: string;
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
}

export default function SelectField({
    label,
    name,
    value,
    options,
    onChange,
    placeholder = "Choisissez une option",
    required = false,
    }: SelectFieldProps) {

    return (
        <div className="mb-4">
        {label && (
            <label
            htmlFor={name}
            className="block mb-2 text-sm font-medium text-blue-800"
            >
            {label} {required && <span className="text-red-500">*</span>}
            </label>
        )}

        <div className="relative">
            <select
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)} // ✅ renvoie directement la valeur
            required={required}
            className="w-full appearance-none bg-white border border-blue-500 text-blue-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
            <option value="" disabled>
                {placeholder}
            </option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                    {opt.label}
                    </option>
                ))}
            </select>

            {/* Flèche bleue custom */}
            <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
        </div>
    );
}

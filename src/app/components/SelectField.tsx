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
  islabel?: boolean;
  wrapperClassName?: string; // pour override du wrapper extérieur (ex: "m-0")
  selectClassName?: string; // pour override du <select> (ex: "min-w-[150px]")
  disabled?: boolean;
}

export default function SelectField({
  label,
  name,
  value,
  options,
  onChange,
  placeholder = "Choisissez une option",
  required = false,
  islabel = true,
  wrapperClassName = "",
  selectClassName = "",
  disabled = false,
}: SelectFieldProps) {

  return (
    <div className={wrapperClassName}>
      {label && islabel && (
        <label htmlFor={name} className="block mb-2 text-sm font-medium text-blue-800">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className={selectClassName + `w-full appearance-none bg-white border border-blue-500 text-blue-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : ""
              }` 
          }
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Flèche bleue custom — wrapper centré verticalement */}
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

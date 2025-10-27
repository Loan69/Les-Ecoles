"use client";

import { useEffect, useState } from "react";
import Select from "react-select";
import { useSupabase } from "../providers";

interface Option {
  id: number;
  category: string;
  value: string;
  label: string;
  parent_value: string | null;
  label_category?: string;
}

interface Props {
  rootCategory: string;
  onChange: (selected: { [category: string]: Option[] }) => void;
  onlyParent?: boolean;
  disabled?: boolean; // ✅ nouvelle prop
}

export default function DynamicMultiSelectGroup({
  rootCategory,
  onChange,
  onlyParent = false,
  disabled = false,
}: Props) {
  const { supabase } = useSupabase();
  const [levels, setLevels] = useState<Option[][]>([]);
  const [selectedValues, setSelectedValues] = useState<{ [category: string]: Option[] }>({});

  const getTousLabel = (category: string) => {
    const feminine = ["classe", "residence", "salle", "chambre"];
    return feminine.some((w) => category.toLowerCase().includes(w)) ? "Toutes" : "Tous";
  };

  useEffect(() => {
    const fetchRoot = async () => {
      const { data, error } = await supabase
        .from(`select_options_${rootCategory}`)
        .select("*")
        .eq("category", rootCategory)
        .is("parent_value", null)
        .order("label");

      if (error) {
        console.error(error.message);
        return;
      }

      if (data && data.length > 0) {
        const labelCategory = data[0]?.label_category || rootCategory;
        const allOption: Option = {
          id: -1,
          value: "ALL",
          label: `${getTousLabel(labelCategory)}`,
          category: rootCategory,
          parent_value: null,
          label_category: labelCategory,
        };
        setLevels([[allOption, ...data]]);
      }
    };
    fetchRoot();
  }, [rootCategory, supabase]);

  const handleSelect = async (levelIndex: number, selected: Option[]) => {
    const currentLevel = levels[levelIndex];
    const category = currentLevel[0]?.category;
    if (!category) return;

    const isAllSelected = selected.some((s) => s.value === "ALL");
    const finalSelected = isAllSelected
      ? currentLevel.filter((opt) => opt.value !== "ALL")
      : selected;

    const newSelected = { ...selectedValues, [category]: finalSelected };

    Object.keys(selectedValues).forEach((cat) => {
      const catIndex = levels.findIndex((lvl) => lvl[0]?.category === cat);
      if (catIndex > levelIndex) delete newSelected[cat];
    });

    setSelectedValues(newSelected);
    onChange(newSelected);

    if (onlyParent) return;

    const allChildren: Option[] = [];
    for (const opt of finalSelected) {
      const { data, error } = await supabase
        .from(`select_options_${rootCategory}`)
        .select("*")
        .eq("parent_value", opt.value)
        .order("label");

      if (error) console.error(error.message);
      if (data && data.length > 0) allChildren.push(...data);
    }

    const newLevels = [...levels.slice(0, levelIndex + 1)];

    if (allChildren.length > 0) {
      const childCategory = allChildren[0]?.category || "Sous-catégorie";
      const labelCategory = allChildren[0]?.label_category || childCategory;
      const allOptionChild: Option = {
        id: -1,
        value: "ALL",
        label: `${getTousLabel(labelCategory)}`,
        category: childCategory,
        parent_value: null,
        label_category: labelCategory,
      };
      newLevels.push([allOptionChild, ...allChildren]);
    }

    setLevels(newLevels);
  };

  return (
    <div
      className={`space-y-4 transition-opacity duration-200 ${
        disabled ? "opacity-60 pointer-events-none cursor-not-allowed select-none" : ""
      }`} // ✅ effet visuel
    >
      {levels.map((options, i) => {
        const key = options[0]?.category || `level${i}`;
        const label = options[0]?.label_category || key;
        const selected = selectedValues[key] || [];

        const valueForSelect = selected.map((opt) => ({
          value: opt.value,
          label: opt.label,
        }));

        return (
          <div key={i}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <Select
              isMulti
              isDisabled={disabled} // ✅ désactivation logique
              options={options.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={valueForSelect}
              onChange={(selectedOptions) => {
                const selectedData = selectedOptions
                  .map((s) => options.find((o) => o.value === s.value))
                  .filter(Boolean) as Option[];
                handleSelect(i, selectedData);
              }}
              placeholder={`Choisir ${label}`}
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderRadius: "0.75rem",
                  borderColor: "#d1d5db",
                  boxShadow: "none",
                  backgroundColor: disabled ? "#f3f4f6" : "white",
                  cursor: disabled ? "not-allowed" : "default",
                  "&:hover": {
                    borderColor: disabled ? "#d1d5db" : "#2563eb",
                  },
                }),
                multiValue: (base) => ({
                  ...base,
                  opacity: disabled ? 0.7 : 1,
                }),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

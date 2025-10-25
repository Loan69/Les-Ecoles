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
  rootCategory: string; // ex: "residence", "recurrence", "evenement"
  onChange: (selected: { [category: string]: Option[] }) => void; // renvoie toutes les options sélectionnées
  onlyParent?: boolean;
}

export default function DynamicMultiSelectGroup({
  rootCategory,
  onChange,
  onlyParent = false,
}: Props) {
  const { supabase } = useSupabase();
  const [levels, setLevels] = useState<Option[][]>([]);
  const [selectedValues, setSelectedValues] = useState<{ [category: string]: Option[] }>({});

  // Utilitaire pour label “Tous / Toutes” dynamique
  const getTousLabel = (category: string) => {
    const feminine = ["classe", "residence", "salle", "chambre"];
    return feminine.some((w) => category.toLowerCase().includes(w)) ? "Toutes" : "Tous";
  };

  // Charger le premier niveau
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
      if (data) {
        const allOption: Option = {
          id: -1,
          value: "ALL",
          label: getTousLabel(rootCategory),
          category: rootCategory,
          parent_value: null,
        };
        setLevels([[allOption, ...data]]);
      }
    };
    fetchRoot();
  }, [rootCategory]);

  // Gestion de la sélection
  const handleSelect = async (levelIndex: number, selected: Option[]) => {
    const currentLevel = levels[levelIndex];
    const category = currentLevel[0]?.category;
    if (!category) return;

    // Si "Tous/Toutes" est sélectionné → prendre tous les autres
    const isAllSelected = selected.some((s) => s.value === "ALL");
    const finalSelected = isAllSelected
      ? currentLevel.filter((opt) => opt.value !== "ALL")
      : selected;

    const newSelected = { ...selectedValues, [category]: finalSelected };

    // Supprimer les enfants des niveaux suivants
    Object.keys(selectedValues).forEach((cat) => {
      const catIndex = levels.findIndex((lvl) => lvl[0]?.category === cat);
      if (catIndex > levelIndex) delete newSelected[cat];
    });

    setSelectedValues(newSelected);
    onChange(newSelected);

    if (onlyParent) return;

    // Charger les enfants
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
      const allOptionChild: Option = {
        id: -1,
        value: "ALL",
        label: getTousLabel(childCategory),
        category: childCategory,
        parent_value: null,
      };
      newLevels.push([allOptionChild, ...allChildren]);
    }

    setLevels(newLevels);
  };

  return (
    <div className="space-y-4">
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
                control: (base) => ({
                  ...base,
                  borderRadius: "0.75rem",
                  borderColor: "#d1d5db",
                  boxShadow: "none",
                  "&:hover": { borderColor: "#2563eb" },
                }),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

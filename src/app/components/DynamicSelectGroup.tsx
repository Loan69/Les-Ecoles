"use client";

import { useEffect, useState } from "react";
import SelectField from "./SelectField";

interface Option {
  id: number;
  label: string;
  parent_id: number | null;
  category: string;
}

interface Props {
  category: string; // "residence", "repas", "evenement", etc.
  onChange: (value: string) => void; // ✅ renvoie une seule valeur simple
  onlyParent?: boolean; // si true, on ne charge pas les enfants
}

export default function DynamicSelectGroup({
  category,
  onChange,
  onlyParent = false,
}: Props) {
  const [levels, setLevels] = useState<Option[][]>([]);
  const [selectedIds, setSelectedIds] = useState<{ [key: string]: string }>({});

  // Charger le premier niveau (racine)
  useEffect(() => {
    const fetchRootOptions = async () => {
      const res = await fetch(`/api/options?category=${category}`);
      const data = await res.json();
      setLevels([data]);
    };
    fetchRootOptions();
  }, [category]);

  const handleSelect = async (optionId: string, cat: string) => {
    const newSelected = { ...selectedIds, [cat]: optionId };

    // Supprimer les enfants
    const categoryIndex = levels.findIndex((level) => level[0]?.category === cat);
    const childrenCategories = levels
      .slice(categoryIndex + 1)
      .flat()
      .map((opt) => opt.category);
    childrenCategories.forEach((childCat) => delete newSelected[childCat]);

    setSelectedIds(newSelected);

    // ✅ Envoie uniquement la dernière valeur choisie
    onChange(optionId);

    // Si onlyParent → on ne charge pas les enfants
    if (onlyParent) return;

    // Charger les enfants
    const res = await fetch(`/api/options?parentId=${optionId}`);
    const children = await res.json();

    if (Array.isArray(children) && children.length > 0) {
      const newLevels = [...levels.slice(0, categoryIndex + 1), children];
      setLevels(newLevels);
    } else {
      setLevels((prev) => prev.slice(0, categoryIndex + 1));
    }
  };

  return (
    <div className="space-y-4">
      {levels.map((options, i) => {
        const label = options[0]?.category || `Niveau ${i + 1}`;
        return (
          <SelectField
            key={i}
            label={label}
            name={`level${i}`}
            value={selectedIds[label] || ""}
            onChange={(val) => handleSelect(val, label)}
            options={options.map((opt) => ({
              value: opt.id.toString(),
              label: opt.label,
            }))}
            placeholder={`Choisir votre ${label}`}
          />
        );
      })}
    </div>
  );
}

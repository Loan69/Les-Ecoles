'use client';

import { useEffect, useState } from "react";
import SelectField from "./SelectField";
import { Option } from "@/types/Option";
import { useSupabase } from "../providers";

interface Props {
  rootCategory: string; // catégorie racine : "residence", "repas", "evenement", etc.
  subRootCategory?: string;
  onChange: (selected: { [category: string]: Option }) => void; // renvoie toutes les options sélectionnées
  onlyParent?: boolean; // si true, on ne charge pas les enfants
  islabel?: boolean; // si false, on n'affiche pas le label au dessus du select
  initialValue?: string | null;
  disabled?: boolean; // pour désactiver le composant
}

export default function DynamicSelectGroup({
  rootCategory, 
  subRootCategory = rootCategory,
  onChange, onlyParent = false,
  islabel = true,
  initialValue,
  disabled = false,
}: Props) {
  const { supabase } = useSupabase();
  const [levels, setLevels] = useState<Option[][]>([]);
  const [selected, setSelected] = useState<{ [category: string]: Option }>({});

  // Charger le premier niveau (racine)
  useEffect(() => {
    const fetchRoot = async () => {
      const { data, error } = await supabase
        .from(`select_options_${rootCategory}`)
        .select("*")
        .eq("category", subRootCategory)
        .is("parent_value", null)
        .order("label");

      if (error) console.error(error.message);
      if (data) setLevels([data]);
    };
    fetchRoot();
  }, [rootCategory, subRootCategory]);

  // Charger une valeur initiale s'il y en a une
  useEffect(() => {
    if (initialValue && levels.length > 0) {
      const option = levels[0].find(o => o.value === initialValue);
      if (option) setSelected({ [subRootCategory]: option });
    }
  }, [initialValue, levels]);

  // Gérer la sélection d’une option
  const handleSelect = async (levelIndex: number, option: Option) => {
    const newSelected = { ...selected, [option.category]: option };
    setSelected(newSelected);
    onChange(newSelected); // renvoie toutes les options sélectionnées

    if (onlyParent) return;

    // Charger les enfants
    const { data: children, error } = await supabase
      .from(`select_options_${rootCategory}`)
      .select("*")
      .eq("parent_value", option.value)
      .order("label");

    if (error) console.error(error.message);

    if (children && children.length > 0) {
      const newLevels = [...levels.slice(0, levelIndex + 1), children];
      setLevels(newLevels);
    } else {
      // supprimer les niveaux suivants si aucun enfant
      setLevels(levels.slice(0, levelIndex + 1));
    }
  };

  return (
    <div className="space-y-1">
      {levels.map((options, i) => {
        const key = options[0]?.category || `level${i}`;
        const label = options[0]?.label_category || key;
        return (
          <SelectField
            key={i}
            name={`level${i}`}
            label={islabel ? label : undefined}
            value={selected[key]?.value || ""}
            onChange={(val) => {
              const option = options.find((o) => o.value === val);
              if (option) handleSelect(i, option);
            }}
            options={options}
            placeholder={`Choisissez votre ${label}`}
            wrapperClassName="m-0"
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}

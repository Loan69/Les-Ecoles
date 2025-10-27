'use client';

import { useEffect, useState } from "react";
import SelectField from "./SelectField";
import { Option } from "@/types/Option";
import { useSupabase } from "../providers";

interface Props {
  rootCategory: string; // catégorie racine : "residence", "repas", "evenement", etc.
  subRootCategory?: string;
  onChange: (selected: { [category: string]: Option }) => void;
  onlyParent?: boolean;
  islabel?: boolean;
  initialValue?: string | null;
  disabled?: boolean;
  selectClassName?: string;
  isAdmin?: boolean;
}

export default function DynamicSelectGroup({
  rootCategory,
  subRootCategory = rootCategory,
  onChange,
  onlyParent = false,
  islabel = true,
  initialValue,
  disabled = false,
  selectClassName = "",
  isAdmin = false,
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

      if (error) {
        console.error(error.message);
        return;
      }

      if (data) {
        // ✅ Filtrage selon admin_only
        const filtered = isAdmin ? data : data.filter((o) => !o.admin_only);
        setLevels([filtered]);
      }
    };
    fetchRoot();
  }, [rootCategory, subRootCategory, isAdmin, supabase]);

  // Charger une valeur initiale si fournie
  useEffect(() => {
    if (initialValue && levels.length > 0) {
      const option = levels[0].find((o) => o.value === initialValue);
      if (option) setSelected({ [subRootCategory]: option });
    }
  }, [initialValue, levels, subRootCategory]);

  // Gérer la sélection d’une option
  const handleSelect = async (levelIndex: number, option: Option) => {
    const newSelected = { ...selected, [option.category]: option };
    setSelected(newSelected);
    onChange(newSelected);

    if (onlyParent) return;

    const { data: children, error } = await supabase
      .from(`select_options_${rootCategory}`)
      .select("*")
      .eq("parent_value", option.value)
      .order("label");

    if (error) {
      console.error(error.message);
      return;
    }

    if (children && children.length > 0) {
      // ✅ même filtrage pour les enfants
      const filtered = isAdmin ? children : children.filter((o) => !o.admin_only);
      const newLevels = [...levels.slice(0, levelIndex + 1), filtered];
      setLevels(newLevels);
    } else {
      setLevels(levels.slice(0, levelIndex + 1));
    }
  };

  return (
    <div className="space-y-1">
      {levels.map((options, i) => {
        const key = options[0]?.category || `level${i}`;
        const label = options[0]?.label_category || key;

        if (!options.length) return null;

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
            selectClassName={selectClassName}
          />
        );
      })}
    </div>
  );
}

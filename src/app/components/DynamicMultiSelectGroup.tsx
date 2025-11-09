'use client';

import { useEffect, useState, useRef } from "react";
import Select from "react-select";
import { useSupabase } from "../providers";
import { Option } from "@/types/Option";

interface Props {
  rootCategory: string;
  onChange: (selected: { [category: string]: Option[] }) => void;
  onlyParent?: boolean;
  islabel?: boolean;
  disabled?: boolean;
  initialValues?: { [category: string]: Option[] | string[] };
}

export default function DynamicMultiSelectGroup({
  rootCategory,
  onChange,
  onlyParent = false,
  islabel = true,
  disabled = false,
  initialValues,
}: Props) {
  const { supabase } = useSupabase();
  const [levels, setLevels] = useState<Option[][]>([]);
  const [selectedValues, setSelectedValues] = useState<{ [category: string]: Option[] }>({});
  const hasInitialized = useRef(false);

  const getTousLabel = (category: string) => {
    const feminine = ["classe", "residence", "salle", "chambre"];
    return feminine.some((w) => category.toLowerCase().includes(w)) ? "Toutes" : "Tous";
  };

  // --- Charger TOUS les niveaux nécessaires en fonction de initialValues ---
  useEffect(() => {
    const fetchAllLevels = async () => {
      // ✅ Vérifier si les tableaux contiennent réellement des valeurs
      const hasResidenceValues = initialValues?.residence && initialValues.residence.length > 0;
      const hasEtageValues = initialValues?.etage && initialValues.etage.length > 0;
      const hasChambreValues = initialValues?.chambre && initialValues.chambre.length > 0;
      const hasAnyValues = hasResidenceValues || hasEtageValues || hasChambreValues;

      if (!hasAnyValues) {
        // Pas de valeurs réelles, charger juste le premier niveau
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
        return;
      }

      // ✅ Avec initialValues qui ont des valeurs, charger TOUS les niveaux en parallèle
      const allLevels: Option[][] = [];

      // 1. Charger le niveau racine (residence)
      const { data: rootData, error: rootError } = await supabase
        .from(`select_options_${rootCategory}`)
        .select("*")
        .eq("category", rootCategory)
        .is("parent_value", null)
        .order("label");

      if (rootError || !rootData) {
        console.error(rootError?.message);
        return;
      }

      const labelCategory = rootData[0]?.label_category || rootCategory;
      const allOption: Option = {
        id: -1,
        value: "ALL",
        label: `${getTousLabel(labelCategory)}`,
        category: rootCategory,
        parent_value: null,
        label_category: labelCategory,
      };
      allLevels.push([allOption, ...rootData]);

      // 2. Préparer les valeurs
      const residenceValues = initialValues.residence || [];
      const residenceValuesStr = Array.isArray(residenceValues) && residenceValues.length > 0
        ? (typeof residenceValues[0] === 'string' ? residenceValues as string[] : (residenceValues as Option[]).map(o => o.value))
        : [];

      const etageValues = initialValues.etage || [];
      const etageValuesStr = Array.isArray(etageValues) && etageValues.length > 0
        ? (typeof etageValues[0] === 'string' ? etageValues as string[] : (etageValues as Option[]).map(o => o.value))
        : [];

      // 3. Charger étages ET chambres en parallèle (pas séquentiellement)
      if (!onlyParent) {
        const promises = [];

        // Charger les étages si on a des résidences
        if (residenceValuesStr.length > 0) {
          promises.push(
            supabase
              .from(`select_options_${rootCategory}`)
              .select("*")
              .in("parent_value", residenceValuesStr)
              .order("label")
          );
        }

        // Charger les chambres si on a des étages
        if (etageValuesStr.length > 0) {
          promises.push(
            supabase
              .from(`select_options_${rootCategory}`)
              .select("*")
              .in("parent_value", etageValuesStr)
              .order("label")
          );
        }

        // ✅ Attendre tous les résultats en parallèle
        const results = await Promise.all(promises);

        // Traiter les étages (premier résultat)
        if (residenceValuesStr.length > 0 && results[0]?.data && results[0].data.length > 0) {
          const etagesData = results[0].data;
          const etageCategory = etagesData[0]?.category || "etage"; // ✅ Singulier
          const etageLabelCategory = etagesData[0]?.label_category || etageCategory;
          const allOptionEtage: Option = {
            id: -1,
            value: "ALL",
            label: `${getTousLabel(etageLabelCategory)}`,
            category: etageCategory,
            parent_value: null,
            label_category: etageLabelCategory,
          };
          allLevels.push([allOptionEtage, ...etagesData]);
        }

        // Traiter les chambres (deuxième résultat si on a des étages)
        const chambreResultIndex = residenceValuesStr.length > 0 && etageValuesStr.length > 0 ? 1 : 0;
        if (etageValuesStr.length > 0 && results[chambreResultIndex]?.data && results[chambreResultIndex].data.length > 0) {
          const chambresData = results[chambreResultIndex].data;
          const chambreCategory = chambresData[0]?.category || "chambre"; // ✅ Singulier
          const chambreLabelCategory = chambresData[0]?.label_category || chambreCategory;
          const allOptionChambre: Option = {
            id: -1,
            value: "ALL",
            label: `${getTousLabel(chambreLabelCategory)}`,
            category: chambreCategory,
            parent_value: null,
            label_category: chambreLabelCategory,
          };
          allLevels.push([allOptionChambre, ...chambresData]);
        }
      }

      // ✅ Mettre à jour levels une seule fois avec TOUS les niveaux
      setLevels(allLevels);
    };

    fetchAllLevels();
    hasInitialized.current = false;
  }, [rootCategory, supabase, onlyParent]);

  // --- Appliquer les valeurs initiales APRÈS le chargement des levels ---
  useEffect(() => {
    if (!initialValues || levels.length < 1 || hasInitialized.current) {
      return;
    }

    const newSelected: { [category: string]: Option[] } = {};

    const allOptions = levels.flat();
    Object.entries(initialValues).forEach(([category, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        if (typeof values[0] === 'string') {
          // ✅ Convertir string[] en Option[]
          const stringValues = values as string[];
          const matchingOptions = stringValues
            .map(val => allOptions.find(opt => opt.value === val && opt.category === category))
            .filter(Boolean) as Option[];
          
          if (matchingOptions.length > 0) {
            newSelected[category] = matchingOptions;
          }
        } else {
          // ✅ Déjà des Option[]
          const optionValues = values as Option[];
          const allOptions = levels.flat();
          const matchingOptions = optionValues
            .map(opt => allOptions.find(o => o.value === opt.value && o.category === category))
            .filter(Boolean) as Option[];
          
          if (matchingOptions.length > 0) {
            newSelected[category] = matchingOptions;
          }
        }
      }
    });
    
    if (Object.keys(newSelected).length > 0) {
      setSelectedValues(newSelected);
      onChange(newSelected);
      hasInitialized.current = true; // ✅ Marquer comme initialisé
    }
  }, [levels, initialValues]); // ✅ Se déclenche quand levels change

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
      }`}
    >
      {levels.map((options, i) => {
        if (!options.length) return null;
        const key = options[0]?.category || `level${i}`;
        const label = options[0]?.label_category || key;
        const valueForSelect = selectedValues[key]?.map(opt => ({ value: opt.value, label: opt.label })) || [];

        return (
          <div key={i}>
            {islabel && (
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            )}
            <Select
              isMulti
              isDisabled={disabled}
              options={options.map(opt => ({ value: opt.value, label: opt.label }))}
              value={valueForSelect}
              onChange={(selectedOptions) => {
                const selectedData = selectedOptions
                  .map(s => options.find(o => o.value === s.value))
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
                  backgroundColor: disabled ? "#f3f4f6" : "white",
                  cursor: disabled ? "not-allowed" : "default",
                  "&:hover": { borderColor: disabled ? "#d1d5db" : "#2563eb" },
                }),
                multiValue: (base) => ({ ...base, opacity: disabled ? 0.7 : 1 }),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
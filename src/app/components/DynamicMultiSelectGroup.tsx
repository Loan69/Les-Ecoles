"use client";

import { useEffect, useState } from "react";
import Select from "react-select";

interface Option {
    id: number;
    label: string;
    parent_id: number | null;
    category: string;
}

interface Props {
    type: string; // catégorie racine
    onChange: (values: Record<string, string[]>) => void;
}

export default function DynamicMultiSelectGroup({ type, onChange }: Props) {
    const [levels, setLevels] = useState<Option[][]>([]);
    const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>({});

    // 🪄 Utilitaire pour label “Tous / Toutes” dynamique
    const getTousLabel = (category: string) => {
        const feminine = ["chambre", "classe", "salle", "résidence"];
        return feminine.some((w) => category.toLowerCase().includes(w)) ? "Toutes" : "Tous";
    };

    // Charger le premier niveau
    useEffect(() => {
        const fetchRoot = async () => {
            const res = await fetch(`/api/options?category=${type}`);
            const data: Option[] = await res.json();

            // Ajouter une option "Tous/Toutes" en tête
            const allOption: Option = { id: -1, label: getTousLabel(type), parent_id: null, category: type };

            setLevels([[allOption, ...data]]);
        };
        fetchRoot();
    }, [type]);

    const handleSelect = async (values: string[], levelIndex: number) => {
        const currentLevel = levels[levelIndex];
        const category = currentLevel[0].category;

        // Si "Tous/Toutes" sélectionné, prendre tous les IDs sauf -1
        const allSelectedIds = values.includes("-1")
            ? currentLevel.filter(opt => opt.id !== -1).map(opt => opt.id.toString())
            : values;

        const newSelected = { ...selectedValues, [category]: allSelectedIds };

        // Supprimer les enfants des niveaux suivants
        const nextLevels = levels.slice(levelIndex + 1);
        nextLevels.forEach(lvl => delete newSelected[lvl[0].category]);

        setSelectedValues(newSelected);

        // Charger les enfants
        let children: Option[] = [];
        for (const id of allSelectedIds) {
            const res = await fetch(`/api/options?parentId=${id}`);
            const data: Option[] = await res.json();
            children = [...children, ...data];
        }

        const newLevels = [...levels.slice(0, levelIndex + 1)];
        if (children.length > 0) {
            const allOptionChild: Option = {
                id: -1,
                label: getTousLabel(children[0].category),
                parent_id: null,
                category: children[0].category,
            };
            newLevels.push([allOptionChild, ...children]);
        }

        setLevels(newLevels);
        onChange(newSelected);
    };

    return (
        <div className="space-y-4">
            {levels.map((options, i) => {
                const category = options[0].category;
                const value = selectedValues[category] || [];
                const valueForSelect = options
                    .filter(opt => value.includes(opt.id.toString()))
                    .map(opt => ({ value: opt.id.toString(), label: opt.label }));

                return (
                    <div key={i}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{category}</label>
                        <Select
                            isMulti
                            options={options.map(opt => ({ value: opt.id.toString(), label: opt.label }))}
                            value={valueForSelect}
                            onChange={(selected) => handleSelect(selected.map(s => s.value), i)}
                            placeholder={`Choisir votre ${category}`}
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

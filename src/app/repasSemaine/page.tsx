"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useSupabase } from "../providers";
import { User } from "@supabase/supabase-js";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import { Rule } from "@/types/Rule";
import { getLatestRulesByService } from "@/lib/rulesUtils";

// ============================================================
// TYPES
// ============================================================

interface MealOption {
    id: number;
    value: string;
    label: string;
    isSpecial: boolean;
}

interface DaySelection {
    dejeuner: { id: number; value: string; label: string } | null;
    diner: { id: number; value: string; label: string } | null;
    dejeunerDbId: number | null;
    dinerDbId: number | null;
}

interface DayMealOptions {
    dejeuner: MealOption[];
    diner: MealOption[];
}

type WeekSelections = Record<string, DaySelection>;
type WeekMealOptions = Record<string, DayMealOptions>;

// ============================================================
// UTILITAIRES
// ============================================================

function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekDays(monday: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function formatDayLabel(date: Date): string {
    const label = date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatWeekRange(monday: Date): string {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const from = monday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const to = sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return `${from} – ${to}`;
}

function getDayLockState(
    date: Date,
    settings: Record<string, string>
    ): { locked: boolean; lockedValues: string[] } {
    const now = new Date();
    const parisNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const [lockHour, lockMinute] = (settings.verrouillage_repas || "21:00").split(":").map(Number);

    const afterLock =
        parisNow.getHours() > lockHour ||
        (parisNow.getHours() === lockHour && parisNow.getMinutes() >= lockMinute);

    const dateStr = formatDateKeyLocal(date);
    const todayStr = formatDateKeyLocal(parisNow);
    const tomorrowDate = new Date(parisNow);
    tomorrowDate.setDate(parisNow.getDate() + 1);
    const tomorrowStr = formatDateKeyLocal(tomorrowDate);

    if (dateStr < todayStr) return { locked: true, lockedValues: [] };
    if (dateStr === todayStr && afterLock) return { locked: true, lockedValues: [] };

    const weekendLockEnabled = settings.verrouillage_weekend === "true";
    const currentDay = parisNow.getDay();
    const selectedDay = date.getDay();
    const isWeekend = selectedDay === 0 || selectedDay === 6;

    if (weekendLockEnabled && isWeekend) {
        const isWeekendLockActive =
        (currentDay === 5 && afterLock) || currentDay === 6 || currentDay === 0;
        if (isWeekendLockActive) return { locked: true, lockedValues: [] };
    }

    if (dateStr === tomorrowStr && afterLock) {
        return { locked: false, lockedValues: ["pn_chaud", "pn_froid"] };
    }

    return { locked: false, lockedValues: [] };
}

// ============================================================
// COMPOSANT SELECT REPAS
// ============================================================

function MealSelect({
    options,
    value,
    onChange,
    disabled,
    placeholder,
    colorClass,
    }: {
    options: MealOption[];
    value: string;
    onChange: (opt: MealOption | null) => void;
    disabled: boolean;
    placeholder: string;
    colorClass: string;
    }) {
    return (
        <div className="relative">
        <select
            value={value}
            onChange={(e) => {
            const opt = options.find((o) => String(o.id) === e.target.value) || null;
            onChange(opt);
            }}
            disabled={disabled}
            className={`w-full appearance-none rounded-xl border-2 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 transition-all
            ${disabled
                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                : `bg-white ${colorClass} cursor-pointer`
            }`}
        >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
            <option key={opt.id} value={String(opt.id)}>
                {opt.label}
            </option>
            ))}
        </select>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        </div>
    );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function SemaineRepas() {
    const { supabase } = useSupabase();
    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isAdmin, setIsAdmin] = useState(false);

    // ✅ Initialisation depuis localStorage (currentDate partagée avec la homepage)
    const [currentMonday, setCurrentMonday] = useState<Date>(() => {
        if (typeof window !== "undefined") {
        const stored = localStorage.getItem("dateSelectionnee");
        if (stored) return getMondayOfWeek(parseDateKeyLocal(stored));
        }
        return getMondayOfWeek(new Date());
    });

    const [weekDays, setWeekDays] = useState<Date[]>([]);
    const [defaultDejeunerOptions, setDefaultDejeunerOptions] = useState<MealOption[]>([]);
    const [defaultDinerOptions, setDefaultDinerOptions] = useState<MealOption[]>([]);
    const [weekMealOptions, setWeekMealOptions] = useState<WeekMealOptions>({});
    const [pendingSelections, setPendingSelections] = useState<WeekSelections>({});
    const [savedSelections, setSavedSelections] = useState<WeekSelections>({});
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<"success" | "error" | null>(null);
    const [loading, setLoading] = useState(false);

    // ============================================================
    // INIT USER + SETTINGS
    // ============================================================

    useEffect(() => {
        const fetchUser = async () => {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        if (data.user) {
            const { data: profil } = await supabase
            .from("residentes")
            .select("is_admin")
            .eq("user_id", data.user.id)
            .maybeSingle();
            setIsAdmin(profil?.is_admin || false);
        }
        };
        fetchUser();
    }, [supabase]);

    useEffect(() => {
        const fetchSettings = async () => {
        const { data } = await supabase.from("app_settings").select("key, value");
        if (data) {
            const map: Record<string, string> = {};
            data.forEach((s) => (map[s.key] = s.value));
            setSettings(map);
        }
        };
        fetchSettings();
    }, [supabase]);

    useEffect(() => {
        setWeekDays(getWeekDays(currentMonday));
    }, [currentMonday]);

    // ============================================================
    // CHARGEMENT DES OPTIONS PAR DÉFAUT
    // ============================================================

    useEffect(() => {
        const loadDefaultOptions = async () => {
        const fetchOptions = async (type: "dejeuner" | "diner"): Promise<MealOption[]> => {
            const { data } = await supabase
            .from("select_options_repas")
            .select("*")
            .eq("category", type)
            .eq("is_active", true)
            .is("parent_value", null)
            .order("label");
            return (data || [])
            .filter((item) => isAdmin || !item.admin_only)
            .map((item) => ({
                id: item.id,
                value: item.value,
                label: item.label,
                isSpecial: false,
            }));
        };

        const [dej, din] = await Promise.all([
            fetchOptions("dejeuner"),
            fetchOptions("diner"),
        ]);
        setDefaultDejeunerOptions(dej);
        setDefaultDinerOptions(din);
        };
        loadDefaultOptions();
    }, [supabase, isAdmin]);

    // ============================================================
    // ✅ CHARGEMENT DES OPTIONS PAR JOUR (avec règles spéciales)
    // ============================================================

    useEffect(() => {
        const loadWeekMealOptions = async () => {
        if (weekDays.length === 0 || defaultDejeunerOptions.length === 0) return;

        const startDate = formatDateKeyLocal(weekDays[0]);
        const endDate = formatDateKeyLocal(weekDays[6]);

        const { data: rulesData } = await supabase
            .from("special_meal_options")
            .select("*")
            .or(`start_date.lte.${endDate},indefinite.eq.true`)
            .filter("end_date", "gte", startDate);

        const allRules = (rulesData as Rule[]) || [];

        const optionsByDay: WeekMealOptions = {};

        weekDays.forEach((day) => {
            const dateStr = formatDateKeyLocal(day);

            // Règles actives pour CE jour précis
            const rulesForDay = allRules.filter((r) => {
                if (r.indefinite) { 
                    return true; 
                } else if (r.end_date) {
                    return r.start_date <= dateStr && r.end_date >= dateStr;
                }
            });

            const buildOptions = (
            mealType: "dejeuner" | "diner",
            defaultOpts: MealOption[]
            ): MealOption[] => {
            const specialRule = getLatestRulesByService(rulesForDay, mealType) as Rule | null;

            if (specialRule && specialRule.options) {
                return specialRule.options
                .filter((o) => {
                    if (!(o.is_active ?? true)) return false;
                    if (o.admin_only && !isAdmin) return false;
                    return true;
                })
                .map((o) => ({
                    id: o.id,
                    value: o.value,
                    label: o.label || o.value,
                    isSpecial: true,
                }));
            }

            return defaultOpts;
            };

            optionsByDay[dateStr] = {
            dejeuner: buildOptions("dejeuner", defaultDejeunerOptions),
            diner: buildOptions("diner", defaultDinerOptions),
            };
        });

        setWeekMealOptions(optionsByDay);
        };

        loadWeekMealOptions();
    }, [weekDays, defaultDejeunerOptions, defaultDinerOptions, supabase, isAdmin]);

    // ============================================================
    // CHARGEMENT DES PRÉSENCES DE LA SEMAINE
    // ============================================================

    useEffect(() => {
        const loadWeekSelections = async () => {
        if (!user || weekDays.length === 0 || Object.keys(weekMealOptions).length === 0) return;
        setLoading(true);

        const startDate = formatDateKeyLocal(weekDays[0]);
        const endDate = formatDateKeyLocal(weekDays[6]);

        const { data: presences } = await supabase
            .from("presences")
            .select("id_repas, type_repas, date_repas, choix_repas, option_id")
            .eq("user_id", user.id)
            .gte("date_repas", startDate)
            .lte("date_repas", endDate);

        const selections: WeekSelections = {};

        weekDays.forEach((day) => {
            const dateStr = formatDateKeyLocal(day);
            const dayOpts = weekMealOptions[dateStr];
            if (!dayOpts) return;

            const dejData = presences?.find((p) => p.date_repas === dateStr && p.type_repas === "dejeuner");
            const dinData = presences?.find((p) => p.date_repas === dateStr && p.type_repas === "diner");

            const findOption = (opts: MealOption[], data: typeof dejData) => {
            if (!data) return null;
            const opt = data.option_id
                ? opts.find((o) => o.id === data.option_id)
                : opts.find((o) => o.value === data.choix_repas);
            return opt ? { id: opt.id, value: opt.value, label: opt.label } : null;
            };

            selections[dateStr] = {
            dejeuner: findOption(dayOpts.dejeuner, dejData),
            diner: findOption(dayOpts.diner, dinData),
            dejeunerDbId: dejData?.id_repas || null,
            dinerDbId: dinData?.id_repas || null,
            };
        });

        setSavedSelections(selections);
        setPendingSelections(JSON.parse(JSON.stringify(selections)));
        setLoading(false);
        };

        loadWeekSelections();
    }, [user, weekDays, weekMealOptions, supabase]);

    // ============================================================
    // NAVIGATION SEMAINE
    // ============================================================

    const goToPreviousWeek = () => {
        setCurrentMonday((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
        });
    };

    const goToNextWeek = () => {
        setCurrentMonday((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
        });
    };

    // ✅ Revenir à la semaine de la date sélectionnée dans l'appli
    const goToRefWeek = () => {
        const stored = localStorage.getItem("dateSelectionnee");
        const ref = stored ? parseDateKeyLocal(stored) : new Date();
        setCurrentMonday(getMondayOfWeek(ref));
    };

    // ============================================================
    // MODIFICATION LOCALE
    // ============================================================

    const handleChange = (
        dateStr: string,
        mealType: "dejeuner" | "diner",
        opt: MealOption | null
    ) => {
        setPendingSelections((prev) => ({
        ...prev,
        [dateStr]: {
            ...prev[dateStr],
            [mealType]: opt ? { id: opt.id, value: opt.value, label: opt.label } : null,
        },
        }));
    };

    // ============================================================
    // ENREGISTREMENT
    // ============================================================

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setSaveResult(null);

        try {
        for (const day of weekDays) {
            const dateStr = formatDateKeyLocal(day);
            const { locked } = getDayLockState(day, settings);
            if (locked) continue;

            const pending = pendingSelections[dateStr];
            const saved = savedSelections[dateStr];
            if (!pending) continue;

            for (const mealType of ["dejeuner", "diner"] as const) {
            const pendingOpt = pending[mealType];
            const savedOpt = saved?.[mealType];

            if (pendingOpt?.id === savedOpt?.id) continue;

            const dayOpts = weekMealOptions[dateStr];
            const fullOpt = dayOpts?.[mealType]?.find((o) => o.id === pendingOpt?.id);

            const response = await fetch("/api/presence-repas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                repas: mealType,
                choix: pendingOpt?.value || "non",
                date: dateStr,
                option_id: fullOpt?.isSpecial ? fullOpt.id : null,
                }),
            });

            if (!response.ok) throw new Error(`Erreur pour ${dateStr} ${mealType}`);
            }
        }

        setSavedSelections(JSON.parse(JSON.stringify(pendingSelections)));
        setSaveResult("success");
        setTimeout(() => setSaveResult(null), 3000);
        } catch (e) {
        console.error(e);
        setSaveResult("error");
        setTimeout(() => setSaveResult(null), 4000);
        } finally {
        setSaving(false);
        }
    };

    // ============================================================
    // CALCUL MODIFICATIONS EN ATTENTE
    // ============================================================

    const pendingCount = weekDays.filter((day) => {
        const dateStr = formatDateKeyLocal(day);
        const { locked } = getDayLockState(day, settings);
        if (locked) return false;
        const p = pendingSelections[dateStr];
        const s = savedSelections[dateStr];
        return p?.dejeuner?.id !== s?.dejeuner?.id || p?.diner?.id !== s?.diner?.id;
    }).length;

    // ✅ Semaine de référence = semaine de la date stockée dans l'appli
    const storedDate = typeof window !== "undefined" ? localStorage.getItem("dateSelectionnee") : null;
    const refMonday = getMondayOfWeek(storedDate ? parseDateKeyLocal(storedDate) : new Date());
    const isRefWeek = formatDateKeyLocal(currentMonday) === formatDateKeyLocal(refMonday);

    // ============================================================
    // RENDU
    // ============================================================

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">

            <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-blue-900 tracking-tight">
                Repas de la semaine
            </h1>
            <p className="text-blue-500 text-sm mt-1">Planifiez vos repas et enregistrez en une fois</p>
            </div>

            {/* Navigation semaine */}
            <div className="flex items-center justify-between mb-6 bg-white rounded-2xl shadow-sm px-4 py-3">
            <button
                onClick={goToPreviousWeek}
                className="p-2 rounded-xl hover:bg-blue-50 text-blue-700 transition cursor-pointer"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
                <p className="text-sm font-bold text-blue-900">{formatWeekRange(currentMonday)}</p>
                {!isRefWeek && (
                <button
                    onClick={goToRefWeek}
                    className="text-xs text-blue-400 hover:text-blue-600 underline mt-0.5 cursor-pointer"
                >
                    Revenir à la semaine sélectionnée
                </button>
                )}
            </div>

            <button
                onClick={goToNextWeek}
                className="p-2 rounded-xl hover:bg-blue-50 text-blue-700 transition cursor-pointer"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
            </div>

            {/* Grille des jours */}
            {loading ? (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            ) : (
            <div className="space-y-3">
                {weekDays.map((day, idx) => {
                const dateStr = formatDateKeyLocal(day);
                const { locked, lockedValues } = getDayLockState(day, settings);
                const dayOpts = weekMealOptions[dateStr];
                const pending = pendingSelections[dateStr];
                const saved = savedSelections[dateStr];
                const hasChange =
                    !locked &&
                    (pending?.dejeuner?.id !== saved?.dejeuner?.id ||
                    pending?.diner?.id !== saved?.diner?.id);

                const isToday = dateStr === formatDateKeyLocal(new Date());
                const isPast = day < new Date() && !isToday;

                const dejOptions = (dayOpts?.dejeuner || []).filter((o) => !lockedValues.includes(o.value));
                const dinOptions = (dayOpts?.diner || []).filter((o) => !lockedValues.includes(o.value));
                const hasSpecial = dayOpts?.dejeuner[0]?.isSpecial || dayOpts?.diner[0]?.isSpecial;

                return (
                    <motion.div
                    key={dateStr}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all
                        ${isToday ? "border-blue-400 shadow-blue-100 shadow-md" : "border-transparent"}
                        ${isPast ? "opacity-60" : ""}
                        ${hasChange ? "ring-2 ring-orange-300" : ""}
                    `}
                    >
                    {/* Header */}
                    <div className={`px-4 py-2 flex items-center justify-between
                        ${isToday ? "bg-blue-600" : locked && !isPast ? "bg-gray-100" : "bg-blue-50"}`}
                    >
                        <span className={`text-sm font-bold ${isToday ? "text-white" : "text-blue-900"}`}>
                        {formatDayLabel(day)}
                        {isToday && <span className="ml-2 text-xs font-normal opacity-80">Aujourd&apos;hui</span>}
                        </span>
                        <div className="flex items-center gap-2">
                        {hasSpecial && !locked && (
                            <span className="text-[10px] text-purple-500 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">
                            ✨ Menu spécial
                            </span>
                        )}
                        {locked && !isPast && (
                            <span className="text-xs text-gray-400 font-medium">🔒 Verrouillé</span>
                        )}
                        {hasChange && (
                            <span className="text-xs text-orange-500 font-semibold">● Modifié</span>
                        )}
                        </div>
                    </div>

                    {/* Sélects */}
                    <div className="px-4 py-3 grid grid-cols-2 gap-3">
                        <div>
                        <p className="text-[10px] font-bold uppercase text-orange-500 mb-1 tracking-wide">Déjeuner</p>
                        <MealSelect
                            options={dejOptions}
                            value={pending?.dejeuner ? String(pending.dejeuner.id) : ""}
                            onChange={(opt) => handleChange(dateStr, "dejeuner", opt)}
                            disabled={locked}
                            placeholder="Non"
                            colorClass="border-orange-200 text-orange-900 focus:ring-orange-200 focus:border-orange-400"
                        />
                        </div>

                        <div>
                        <p className="text-[10px] font-bold uppercase text-blue-500 mb-1 tracking-wide">Dîner</p>
                        <MealSelect
                            options={dinOptions}
                            value={pending?.diner ? String(pending.diner.id) : ""}
                            onChange={(opt) => handleChange(dateStr, "diner", opt)}
                            disabled={locked}
                            placeholder="Non"
                            colorClass="border-blue-200 text-blue-900 focus:ring-blue-200 focus:border-blue-400"
                        />
                        </div>
                    </div>
                    </motion.div>
                );
                })}
            </div>
            )}

            {/* Bouton enregistrer */}
            <div className="mt-8 flex flex-col items-center gap-3">

            {saveResult === "success" && (
                <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                <CheckCircle className="w-4 h-4" />
                Repas enregistrés avec succès !
                </motion.div>
            )}

            {saveResult === "error" && (
                <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                <AlertCircle className="w-4 h-4" />
                Une erreur est survenue. Veuillez réessayer.
                </motion.div>
            )}

            <button
                onClick={handleSave}
                disabled={saving || pendingCount === 0}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-base font-bold shadow-md transition-all
                ${saving || pendingCount === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-700 text-white hover:bg-blue-800 hover:shadow-lg cursor-pointer active:scale-95"
                }`}
            >
                {saving ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement...</>
                ) : (
                <>
                    <Save className="w-5 h-5" />
                    Enregistrer
                    {pendingCount > 0 && (
                    <span className="bg-orange-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">
                        {pendingCount}
                    </span>
                    )}
                </>
                )}
            </button>

            {pendingCount === 0 && !saving && (
                <p className="text-xs text-gray-400">Aucune modification en attente</p>
            )}
            </div>

        </div>
        </main>
    );
}
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Copy, Clock } from "lucide-react";
import { MealOptionCatalog, ServiceOption, Service } from "@/types/MealOption";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import MultiDatePicker from "@/app/components/MultiDatePicker";
import EventVisibilitySelector from "@/app/components/EventVisibilitySelector";
import { Switch } from "@/components/ui/switch";

const SERVICES: { value: Service; label: string }[] = [
  { value: "dejeuner", label: "Déjeuner" },
  { value: "diner", label: "Dîner" },
];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}
function weekDays(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDateKeyLocal(d);
  });
}
function dayLabel(key: string): string {
  return parseDateKeyLocal(key)
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^./, (c) => c.toUpperCase());
}
function weekLabel(monday: Date): string {
  const end = new Date(monday);
  end.setDate(monday.getDate() + 6);
  const from = monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const to = end.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return `${from} – ${to}`;
}

function ResBadge({ r }: { r: string }) {
  if (r === "personne") {
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Sa résidence</span>;
  }
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r === "12" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
      Rés. {r}
    </span>
  );
}

export default function RepasOptionsManager() {
  const [catalog, setCatalog] = useState<MealOptionCatalog[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [monday, setMonday] = useState(() => getMonday(new Date()));

  // Modale option (ajout / édition)
  const [optForm, setOptForm] = useState<{
    open: boolean;
    editing: MealOptionCatalog | null;
    label: string;
    residence: string;
    delai: string;
    adminOnly: boolean;
    visibilite: { residence: string[]; etage: string[]; exclusions: string[] };
  }>({ open: false, editing: null, label: "", residence: "12", delai: "0", adminOnly: false, visibilite: { residence: [], etage: [], exclusions: [] } });

  // Modale picker (ouverture d'un service)
  const [picker, setPicker] = useState<{ date: string; service: Service; selected: Set<string> } | null>(null);

  // Modale duplication
  const [dup, setDup] = useState<{ open: boolean; sourceDate: string; dej: boolean; din: boolean; dates: string[] }>({
    open: false,
    sourceDate: "",
    dej: true,
    din: true,
    dates: [],
  });

  const days = useMemo(() => weekDays(monday), [monday]);

  const fetchCatalog = useCallback(async () => {
    const res = await fetch("/api/admin/meal-options");
    const j = await res.json();
    if (res.ok) setCatalog(j.options ?? []);
    else toast.error(j.error || "Erreur chargement catalogue.");
  }, []);

  const fetchServiceOptions = useCallback(async () => {
    const res = await fetch(`/api/admin/meal-service-options?start=${days[0]}&end=${days[6]}`);
    const j = await res.json();
    if (res.ok) setServiceOptions(j.serviceOptions ?? []);
    else toast.error(j.error || "Erreur chargement des options du jour.");
  }, [days]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchCatalog(), fetchServiceOptions()]);
      setLoading(false);
    })();
  }, [fetchCatalog, fetchServiceOptions]);

  // ---------- Catalogue ----------
  const emptyVis = { residence: [], etage: [], exclusions: [] };
  const openAddOption = () =>
    setOptForm({ open: true, editing: null, label: "", residence: "12", delai: "0", adminOnly: false, visibilite: emptyVis });
  const openEditOption = (o: MealOptionCatalog) =>
    setOptForm({
      open: true,
      editing: o,
      label: o.label,
      residence: o.residence,
      delai: String(o.delai_commande),
      adminOnly: o.admin_only,
      visibilite: {
        residence: o.visibilite?.residence ?? [],
        etage: o.visibilite?.etage ?? [],
        exclusions: o.visibilite?.exclusions ?? [],
      },
    });

  const saveOption = async () => {
    if (!optForm.label.trim()) {
      toast.error("Le libellé est requis.");
      return;
    }
    const vis = optForm.visibilite;
    const payload = {
      label: optForm.label.trim(),
      residence: optForm.residence,
      delai_commande: Number(optForm.delai) || 0,
      admin_only: optForm.adminOnly,
      is_active: optForm.editing?.is_active ?? true,
      // vide = visible par toutes → on stocke null pour rester lisible
      visibilite: vis.residence.length || vis.etage.length ? vis : null,
    };
    const res = await fetch("/api/admin/meal-options", {
      method: optForm.editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(optForm.editing ? { id: optForm.editing.id, ...payload } : payload),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error || "Erreur.");
      return;
    }
    toast.success(optForm.editing ? "Option modifiée." : "Option ajoutée.");
    setOptForm((f) => ({ ...f, open: false }));
    await fetchCatalog();
  };

  const toggleActive = async (o: MealOptionCatalog) => {
    const res = await fetch("/api/admin/meal-options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: o.id, label: o.label, residence: o.residence, delai_commande: o.delai_commande, admin_only: o.admin_only, is_active: !o.is_active, visibilite: o.visibilite ?? null }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || "Erreur.");
    await fetchCatalog();
  };

  const deleteOption = (o: MealOptionCatalog) => {
    toast(`Supprimer « ${o.label} » ?`, {
      action: {
        label: "Supprimer",
        onClick: async () => {
          const res = await fetch("/api/admin/meal-options", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: o.id }),
          });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Option supprimée.");
          await fetchCatalog();
        },
      },
    });
  };

  // ---------- Ouverture des services ----------
  const optionsFor = (date: string, service: Service) =>
    serviceOptions.filter((s) => s.date === date && s.service === service);

  const openPicker = (date: string, service: Service) => {
    const current = optionsFor(date, service).map((s) => s.option_id);
    setPicker({ date, service, selected: new Set(current) });
  };

  const savePicker = async () => {
    if (!picker) return;
    const res = await fetch("/api/admin/meal-service-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: [{ date: picker.date, service: picker.service, option_ids: [...picker.selected] }] }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success("Service mis à jour.");
    setPicker(null);
    await fetchServiceOptions();
  };

  const activeCatalog = catalog.filter((o) => o.is_active);

  // ---------- Duplication ----------
  const openDup = () => setDup({ open: true, sourceDate: days[0], dej: true, din: true, dates: [] });

  const applyDup = async () => {
    if (dup.dates.length === 0) {
      toast.error("Sélectionnez au moins une date cible.");
      return;
    }
    if (!dup.dej && !dup.din) {
      toast.error("Choisissez au moins un service.");
      return;
    }
    const services: Service[] = [];
    if (dup.dej) services.push("dejeuner");
    if (dup.din) services.push("diner");

    const assignments: { date: string; service: Service; option_ids: string[] }[] = [];
    for (const target of dup.dates) {
      for (const service of services) {
        const srcIds = optionsFor(dup.sourceDate, service).map((s) => s.option_id);
        assignments.push({ date: target, service, option_ids: srcIds });
      }
    }

    const res = await fetch("/api/admin/meal-service-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success("Options dupliquées sur la plage.");
    setDup((d) => ({ ...d, open: false }));
    await fetchServiceOptions();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* ============ CATALOGUE ============ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Catalogue d&apos;options</h2>
          <button
            onClick={openAddOption}
            className="flex items-center gap-1 bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-900 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Ajouter une option
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Créez ici les options réutilisables (ex. « Oui au 12 », « Apéro dînatoire »). L&apos;interrupteur <strong>Active/Inactive</strong> : une option <strong>inactive</strong> n&apos;est plus proposée à la sélection mais reste conservée (historique &amp; comptabilité) — pratique pour retirer une option déjà utilisée sans la supprimer.
        </p>

        {catalog.length === 0 ? (
          <p className="text-gray-500 italic text-sm">Aucune option. Créez-en une pour commencer.</p>
        ) : (
          <ul className="space-y-2">
            {catalog.map((o) => (
              <li
                key={o.id}
                className={`flex items-center justify-between border rounded-xl px-4 py-3 shadow-sm ${o.is_active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-70"}`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{o.label}</span>
                  <ResBadge r={o.residence} />
                  {o.delai_commande > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {o.delai_commande} j avant
                    </span>
                  )}
                  {o.admin_only && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">admin</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="flex items-center gap-1.5 cursor-pointer" title="Proposer cette option à la sélection">
                    <Switch checked={o.is_active} onCheckedChange={() => toggleActive(o)} className="data-[state=checked]:bg-green-600" />
                    <span className="text-xs text-gray-500 w-12">{o.is_active ? "Active" : "Inactive"}</span>
                  </label>
                  <button onClick={() => openEditOption(o)} className="text-blue-600 hover:bg-blue-50 rounded-full p-2 cursor-pointer" title="Modifier">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteOption(o)} className="text-red-600 hover:bg-red-50 rounded-full p-2 cursor-pointer" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ============ OUVERTURE DES SERVICES ============ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Ouverture des services</h2>
          <button
            onClick={openDup}
            className="flex items-center gap-1 border border-blue-700 text-blue-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-50 cursor-pointer"
          >
            <Copy className="w-4 h-4" /> Dupliquer sur une plage
          </button>
        </div>

        {/* Navigation semaine */}
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 mb-4">
          <button onClick={() => setMonday((m) => { const d = new Date(m); d.setDate(d.getDate() - 7); return d; })} className="p-2 rounded-xl hover:bg-blue-50 text-blue-700 cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-bold text-blue-900">{weekLabel(monday)}</p>
          <button onClick={() => setMonday((m) => { const d = new Date(m); d.setDate(d.getDate() + 7); return d; })} className="p-2 rounded-xl hover:bg-blue-50 text-blue-700 cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {days.map((date) => (
            <div key={date} className="rounded-2xl border-2 border-gray-100 bg-white shadow-sm p-4">
              <p className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-3">{dayLabel(date)}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SERVICES.map((s) => {
                  const opts = optionsFor(date, s.value);
                  return (
                    <div key={s.value} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-700 text-sm">{s.label}</p>
                        <button onClick={() => openPicker(date, s.value)} className="text-xs text-blue-700 hover:underline cursor-pointer">
                          Modifier
                        </button>
                      </div>
                      {opts.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Service fermé (aucune option)</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {opts.map((so) => (
                            <span key={so.id} className="text-xs bg-blue-50 text-blue-800 rounded-full px-2 py-1 flex items-center gap-1">
                              {so.option?.label ?? "?"}
                              {so.option && <ResBadge r={so.option.residence} />}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ MODALE OPTION ============ */}
      <AnimatePresence>
        {optForm.open && (
          <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h3 className="text-lg font-semibold text-blue-800 mb-4">{optForm.editing ? "Modifier l'option" : "Nouvelle option"}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
                  <input value={optForm.label} onChange={(e) => setOptForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ex : Oui au 12, Apéro dînatoire…" className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Résidence (compta)</label>
                    <select value={optForm.residence} onChange={(e) => setOptForm((f) => ({ ...f, residence: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none">
                      <option value="12">Résidence 12</option>
                      <option value="36">Résidence 36</option>
                      <option value="personne">Résidence de la personne</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Délai (jours avant)</label>
                    <input type="number" min={0} value={optForm.delai} onChange={(e) => setOptForm((f) => ({ ...f, delai: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                    <p className="text-xs text-gray-400 mt-1">0 = clôture le jour même à l&apos;heure de verrouillage. +1 par jour d&apos;avance (ex. 1 = clôture la veille).</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={optForm.adminOnly} onChange={(e) => setOptForm((f) => ({ ...f, adminOnly: e.target.checked }))} />
                  Réservée aux admins
                </label>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Visibilité</p>
                  <p className="text-xs text-gray-400 mb-3">Laissez vide pour proposer l&apos;option à toutes. Sinon, ciblez des résidences / étages (et décochez nommément si besoin).</p>
                  <EventVisibilitySelector
                    value={optForm.visibilite}
                    onChange={(v) => setOptForm((f) => ({ ...f, visibilite: v }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setOptForm((f) => ({ ...f, open: false }))} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
                <button onClick={saveOption} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer">Enregistrer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ MODALE PICKER (ouverture d'un service) ============ */}
      <AnimatePresence>
        {picker && (
          <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h3 className="text-lg font-semibold text-blue-800 mb-1">Options proposées</h3>
              <p className="text-xs text-gray-500 mb-4">
                {SERVICES.find((s) => s.value === picker.service)?.label} · {dayLabel(picker.date)}
              </p>
              {activeCatalog.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune option active dans le catalogue.</p>
              ) : (
                <ul className="space-y-1.5">
                  {activeCatalog.map((o) => {
                    const checked = picker.selected.has(o.id);
                    return (
                      <li key={o.id}>
                        <label className="flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setPicker((p) => {
                                if (!p) return p;
                                const sel = new Set(p.selected);
                                if (e.target.checked) sel.add(o.id);
                                else sel.delete(o.id);
                                return { ...p, selected: sel };
                              });
                            }}
                          />
                          <span className="text-sm text-gray-800">{o.label}</span>
                          <ResBadge r={o.residence} />
                          {o.admin_only && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">admin</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setPicker(null)} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
                <button onClick={savePicker} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer">Enregistrer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ MODALE DUPLICATION ============ */}
      <AnimatePresence>
        {dup.open && (
          <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Dupliquer les options d&apos;un jour</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jour source (semaine affichée)</label>
                  <select value={dup.sourceDate} onChange={(e) => setDup((d) => ({ ...d, sourceDate: e.target.value }))} className="w-full border border-gray-300 rounded-lg p-2 text-gray-700">
                    {days.map((d) => (
                      <option key={d} value={d}>{dayLabel(d)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4 text-sm text-gray-700">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={dup.dej} onChange={(e) => setDup((d) => ({ ...d, dej: e.target.checked }))} /> Déjeuner</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={dup.din} onChange={(e) => setDup((d) => ({ ...d, din: e.target.checked }))} /> Dîner</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dates cibles</label>
                  <MultiDatePicker value={dup.dates} onChange={(dates) => setDup((d) => ({ ...d, dates }))} />
                </div>
                <p className="text-xs text-gray-500">Les options du jour source <strong>remplaceront</strong> celles des dates sélectionnées (services cochés).</p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setDup((d) => ({ ...d, open: false }))} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
                <button onClick={applyDup} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer">Appliquer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

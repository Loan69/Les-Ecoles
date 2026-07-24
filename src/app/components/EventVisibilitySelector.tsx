"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSupabase } from "../providers";
import { sortAdminPeople, formatEtage, PersonneDetail } from "@/lib/adminPeople";

interface VisibiliteValue {
  residence: string[];
  etage: string[];
  exclusions?: string[];
}

interface Props {
  value: VisibiliteValue;
  onChange: (v: { residence: string[]; etage: string[]; exclusions: string[] }) => void;
  disabled?: boolean;
}

type Opt = { value: string; label: string; parent_value?: string | null };
type Resid = { user_id: string; nom: string; prenom: string; residence: string; etage: string | null };

export default function EventVisibilitySelector({ value, onChange, disabled = false }: Props) {
  const { supabase } = useSupabase();

  const [residences, setResidences] = useState<Opt[]>([]);
  const [etages, setEtages] = useState<Opt[]>([]);
  const [residentes, setResidentes] = useState<Resid[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [checkedResidences, setCheckedResidences] = useState<Set<string>>(new Set());
  const [checkedEtages, setCheckedEtages] = useState<Set<string>>(new Set());
  const [exclusions, setExclusions] = useState<Set<string>>(new Set());

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const inited = useRef(false);

  // --- Chargement des options + résidentes ---
  useEffect(() => {
    (async () => {
      const [{ data: resData }, { data: etData }, { data: rData }] = await Promise.all([
        supabase.from("select_options_residence").select("value, label, parent_value").eq("category", "residence").is("parent_value", null).order("label"),
        supabase.from("select_options_residence").select("value, label, parent_value").eq("category", "etage").order("label"),
        supabase.from("residentes").select("user_id, nom, prenom, residence, etage").eq("statut", "active").eq("is_technique", false),
      ]);
      setResidences(resData || []);
      setEtages(etData || []);
      setResidentes((rData || []).map((r) => ({ ...r, residence: String(r.residence) })));
      setLoaded(true);
    })();
  }, [supabase]);

  const etagesByResidence = useMemo(() => {
    const map: Record<string, Opt[]> = {};
    etages.forEach((e) => {
      const parent = e.parent_value != null ? String(e.parent_value) : "";
      if (!map[parent]) map[parent] = [];
      map[parent].push(e);
    });
    return map;
  }, [etages]);

  // --- Initialisation depuis value (une seule fois, après chargement) ---
  useEffect(() => {
    if (!loaded || inited.current) return;
    const cr = new Set(value.residence ?? []);
    const ce = new Set(value.etage ?? []);
    (value.etage ?? []).forEach((ev) => {
      const et = etages.find((e) => e.value === ev);
      if (et?.parent_value != null) cr.add(String(et.parent_value));
    });
    setCheckedResidences(cr);
    setCheckedEtages(ce);
    setExclusions(new Set(value.exclusions ?? []));
    inited.current = true;
  }, [loaded, value, etages]);

  const inScope = (r: Resid): boolean => {
    if (!checkedResidences.has(r.residence)) return false;
    const ets = (etagesByResidence[r.residence] ?? []).map((e) => e.value);
    const anyEtageChecked = ets.some((e) => checkedEtages.has(e));
    if (anyEtageChecked) return r.etage != null && checkedEtages.has(r.etage);
    return true;
  };

  const scopeResidentes = useMemo(() => {
    const list = residentes.filter(inScope).map<PersonneDetail>((r) => ({
      id: r.user_id,
      nom: r.nom,
      prenom: r.prenom,
      residence: r.residence,
      etage: r.etage,
      chambre: null,
      isInvite: false,
    }));
    return sortAdminPeople(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentes, checkedResidences, checkedEtages, etagesByResidence]);

  // --- Remonter la valeur au parent à chaque changement ---
  useEffect(() => {
    if (!loaded || !inited.current) return;
    const wholeResidences = [...checkedResidences].filter((res) => {
      const ets = (etagesByResidence[res] ?? []).map((e) => e.value);
      return !ets.some((e) => checkedEtages.has(e));
    });
    const scopeIds = new Set(scopeResidentes.map((r) => r.id));
    const excl = [...exclusions].filter((id) => scopeIds.has(id));
    onChangeRef.current({ residence: wholeResidences, etage: [...checkedEtages], exclusions: excl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedResidences, checkedEtages, exclusions, scopeResidentes, loaded]);

  // --- Handlers ---
  const toggleResidence = (res: string) => {
    setCheckedResidences((prev) => {
      const next = new Set(prev);
      if (next.has(res)) {
        next.delete(res);
        // retirer aussi ses étages
        setCheckedEtages((pe) => {
          const ne = new Set(pe);
          (etagesByResidence[res] ?? []).forEach((e) => ne.delete(e.value));
          return ne;
        });
      } else {
        next.add(res);
      }
      return next;
    });
  };

  const toggleEtage = (et: string) => {
    setCheckedEtages((prev) => {
      const next = new Set(prev);
      if (next.has(et)) next.delete(et);
      else next.add(et);
      return next;
    });
  };

  const toggleResidente = (uid: string) => {
    setExclusions((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  if (!loaded) return <p className="text-sm text-gray-400">Chargement…</p>;

  return (
    <div className={`space-y-4 ${disabled ? "opacity-60 pointer-events-none select-none" : ""}`}>
      {/* Résidences + étages */}
      <div className="space-y-3">
        {residences.map((res) => {
          const checked = checkedResidences.has(res.value);
          const ets = etagesByResidence[res.value] ?? [];
          return (
            <div key={res.value} className="border border-gray-200 rounded-xl p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggleResidence(res.value)} className="w-4 h-4 accent-blue-600" />
                <span className="font-medium text-gray-800">{res.label}</span>
              </label>
              {checked && ets.length > 0 && (
                <div className="mt-2 ml-6 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="w-full text-xs text-gray-400">Étages (aucun coché = toute la résidence) :</span>
                  {ets.map((e) => (
                    <label key={e.value} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={checkedEtages.has(e.value)} onChange={() => toggleEtage(e.value)} className="w-4 h-4 accent-blue-600" />
                      {e.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Résidentes concernées */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Résidentes concernées <span className="text-gray-400">({scopeResidentes.filter((r) => !exclusions.has(r.id)).length}/{scopeResidentes.length})</span>
        </p>
        {scopeResidentes.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sélectionnez une résidence (et éventuellement un étage) pour voir les résidentes.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
            {scopeResidentes.map((r) => {
              const included = !exclusions.has(r.id);
              return (
                <label key={r.id} className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={included} onChange={() => toggleResidente(r.id)} className="w-4 h-4 accent-blue-600" />
                    <span className={`text-sm ${included ? "text-gray-800" : "text-gray-400 line-through"}`}>{r.nom} {r.prenom}</span>
                  </span>
                  <span className="text-[10px] text-gray-400">{formatEtage(r.etage) ?? ""}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

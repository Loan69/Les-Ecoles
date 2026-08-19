"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSupabase } from "../providers";
import { sortAdminPeople, PersonneDetail } from "@/lib/adminPeople";
import { useResidences } from "@/lib/useResidences";
import type { Cible } from "@/lib/visibilite";

interface Props {
  value: Cible;
  onChange: (v: { residence: string[]; etage: string[]; groupes: string[]; exclusions: string[] }) => void;
  disabled?: boolean;
}

type Groupe = { id: string; nom: string; membres: string[] };

type Opt = { value: string; label: string; parent_value?: string | null };
type Resid = { user_id: string; nom: string; prenom: string; residence: string; etage: string | null };

export default function EventVisibilitySelector({ value, onChange, disabled = false }: Props) {
  const { supabase } = useSupabase();
  // Blocs du foyer : leur ordre et leur nom d'affichage viennent de l'Administration.
  const { residences: blocs, etages: etagesDeclares, label: labelBloc, labelEtage } = useResidences();

  // Valeurs de bloc réellement représentées dans les places (source de vérité de la structure).
  const [residenceValues, setResidenceValues] = useState<string[]>([]);
  const [etages, setEtages] = useState<Opt[]>([]);
  const [residentes, setResidentes] = useState<Resid[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [groupes, setGroupes] = useState<Groupe[]>([]);

  const [checkedResidences, setCheckedResidences] = useState<Set<string>>(new Set());
  const [checkedEtages, setCheckedEtages] = useState<Set<string>>(new Set());
  const [checkedGroupes, setCheckedGroupes] = useState<Set<string>>(new Set());
  const [exclusions, setExclusions] = useState<Set<string>>(new Set());

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const inited = useRef(false);

  // --- Chargement de la structure (résidences/étages dérivés de `places`,
  // la source de vérité : toute chambre/étage ajouté remonte automatiquement)
  // + comptes activés. Les postes Corail forment une section sans étages. ---
  useEffect(() => {
    (async () => {
      const [{ data: placesData }, { data: rData }] = await Promise.all([
        supabase.from("places").select("residence, etage").eq("is_active", true),
        // Comptes activés uniquement : actifs, rattachés à une chambre ou un poste (R-ADM-02).
        // L'étage vient de la PLACE, pas de la copie héritée `residentes.etage` qui a
        // pu dériver : sinon une personne échappe au ciblage de son propre étage.
        supabase.from("residentes").select("user_id, nom, prenom, residence, etage, place:places(residence, etage)").eq("statut", "active").eq("is_technique", false).not("place_id", "is", null),
      ]);

      const resSet = new Set<string>();
      const etageSeen = new Set<string>();
      const etageOpts: Opt[] = [];
      (placesData || []).forEach((p) => {
        const residence = String(p.residence);
        resSet.add(residence);
        if (p.etage) {
          const key = `${residence}::${p.etage}`;
          if (!etageSeen.has(key)) {
            etageSeen.add(key);
            etageOpts.push({ value: p.etage, label: p.etage, parent_value: residence });
          }
        }
      });
      // Groupes : la composition ne se lit pas en direct (RLS), elle passe par l'API.
      // Tolérant : tant que supabase/groupes.sql n'est pas passé, on affiche simplement
      // le ciblage sans la partie groupes.
      try {
        const res = await fetch("/api/admin/groupes");
        if (res.ok) {
          const j = await res.json();
          setGroupes((j.groupes ?? []) as Groupe[]);
        }
      } catch {
        // silencieux : le ciblage résidence/étage reste utilisable
      }

      setResidenceValues([...resSet]);
      setEtages(etageOpts);
      setResidentes(
        (rData || []).map((r) => {
          const place = r.place as unknown as { residence?: string; etage?: string | null } | null;
          return { ...r, residence: String(place?.residence ?? r.residence), etage: place?.etage ?? r.etage };
        })
      );
      setLoaded(true);
    })();
  }, [supabase]);

  // Blocs proposés au ciblage : ceux du foyer qui ont au moins une place, dans l'ordre
  // de l'Administration, puis les valeurs orphelines rencontrées dans `places`.
  const residencesAffichees = useMemo(() => {
    const presentes = new Set(residenceValues);
    const ordonnees = blocs.map((b) => b.value).filter((v) => presentes.has(v));
    const restantes = residenceValues.filter((v) => !ordonnees.includes(v)).sort();
    return [...ordonnees, ...restantes];
  }, [blocs, residenceValues]);

  // Étages groupés par bloc, dans l'ordre réglé en Administration (à défaut, alphabétique
  // sur le nom affiché).
  const etagesByResidence = useMemo(() => {
    const rang = new Map(etagesDeclares.map((e, i) => [`${e.residence}::${e.value}`, e.ordre * 1000 + i]));
    const map: Record<string, Opt[]> = {};
    etages.forEach((e) => {
      const parent = e.parent_value != null ? String(e.parent_value) : "";
      if (!map[parent]) map[parent] = [];
      map[parent].push(e);
    });
    Object.entries(map).forEach(([parent, list]) =>
      list.sort(
        (a, b) =>
          (rang.get(`${parent}::${a.value}`) ?? 1e9) - (rang.get(`${parent}::${b.value}`) ?? 1e9) ||
          (labelEtage(a.value) ?? a.value).localeCompare(labelEtage(b.value) ?? b.value, "fr", { numeric: true })
      )
    );
    return map;
  }, [etages, etagesDeclares, labelEtage]);

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
    setCheckedGroupes(new Set(value.groupes ?? []));
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

  // Membres des groupes cochés (union avec le ciblage résidence/étage — R-VIS-02).
  const idsDesGroupesCoches = useMemo(() => {
    const ids = new Set<string>();
    groupes.forEach((g) => { if (checkedGroupes.has(g.id)) g.membres.forEach((m) => ids.add(m)); });
    return ids;
  }, [groupes, checkedGroupes]);

  const scopeResidentes = useMemo(() => {
    const list = residentes
      .filter((r) => inScope(r) || idsDesGroupesCoches.has(r.user_id))
      .map<PersonneDetail>((r) => ({
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
  }, [residentes, checkedResidences, checkedEtages, etagesByResidence, idsDesGroupesCoches]);

  // --- Remonter la valeur au parent à chaque changement ---
  useEffect(() => {
    if (!loaded || !inited.current) return;
    const wholeResidences = [...checkedResidences].filter((res) => {
      const ets = (etagesByResidence[res] ?? []).map((e) => e.value);
      return !ets.some((e) => checkedEtages.has(e));
    });
    const scopeIds = new Set(scopeResidentes.map((r) => r.id));
    const excl = [...exclusions].filter((id) => scopeIds.has(id));
    onChangeRef.current({ residence: wholeResidences, etage: [...checkedEtages], groupes: [...checkedGroupes], exclusions: excl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedResidences, checkedEtages, checkedGroupes, exclusions, scopeResidentes, loaded]);

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

  const toggleGroupe = (id: string) => {
    setCheckedGroupes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        {residencesAffichees.map((res) => {
          const checked = checkedResidences.has(res);
          const ets = etagesByResidence[res] ?? [];
          return (
            <div key={res} className="border border-gray-200 rounded-xl p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggleResidence(res)} className="w-4 h-4 accent-blue-600" />
                <span className="font-medium text-gray-800">{labelBloc(res)}</span>
              </label>
              {checked && ets.length > 0 && (
                <div className="mt-2 ml-6 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="w-full text-xs text-gray-400">Étages (aucun coché = toute la résidence) :</span>
                  {ets.map((e) => (
                    <label key={e.value} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={checkedEtages.has(e.value)} onChange={() => toggleEtage(e.value)} className="w-4 h-4 accent-blue-600" />
                      {labelEtage(e.value) ?? e.value}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Groupes — s'ajoutent au ciblage résidence/étage (union) */}
      {groupes.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-3">
          <p className="text-sm font-medium text-gray-800 mb-1">Groupes</p>
          <p className="text-xs text-gray-400 mb-2">
            S&apos;ajoutent aux résidences cochées : une personne concernée par l&apos;un <em>ou</em> l&apos;autre est incluse.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {groupes.map((g) => (
              <label key={g.id} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={checkedGroupes.has(g.id)} onChange={() => toggleGroupe(g.id)} className="w-4 h-4 accent-blue-600" />
                {g.nom}
                <span className="text-[10px] text-gray-400">({g.membres.length})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Résidentes concernées */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Résidentes concernées <span className="text-gray-400">({scopeResidentes.filter((r) => !exclusions.has(r.id)).length}/{scopeResidentes.length})</span>
        </p>
        {scopeResidentes.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sélectionnez une résidence, un étage ou un groupe pour voir les résidentes.</p>
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
                  <span className="text-[10px] text-gray-400">{labelEtage(r.etage) ?? ""}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

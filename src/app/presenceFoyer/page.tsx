"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Eye, MapPin } from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Residente } from "@/types/Residente";
import { Absence, AbsencePayload } from "@/types/Absence";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import { useSupabase } from "../providers";
import LogoutButton from "../components/logoutButton";
import ProfileButton from "../components/profileButton";
import AdministrationButton from "../components/administrationButton";
import LoadingSpinner from "../components/LoadingSpinner";
import AbsenceModal from "../components/AbsenceModal";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Toutes les clés de jour ("YYYY-MM-DD") couvertes par une absence (bornes incluses).
function getAbsentDayKeys(absences: Absence[]): Set<string> {
  const keys = new Set<string>();
  for (const a of absences) {
    const cursor = parseDateKeyLocal(a.date_debut);
    const end = parseDateKeyLocal(a.date_fin);
    while (cursor <= end) {
      keys.add(formatDateKeyLocal(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return keys;
}

function formatJour(dateKey: string): string {
  return parseDateKeyLocal(dateKey).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PresenceFoyerPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [user, setUser] = useState<User | null>(null);
  const [profil, setProfil] = useState<Residente | null>(null);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Mois affiché dans le calendrier (toujours le 1er du mois)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Modale d'ajout / édition
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Absence | null>(null);

  // ============================================================
  // AUTH + PROFIL
  // ============================================================

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          router.replace("/signin");
          return;
        }
        setUser(data.user);
      } catch (err) {
        console.error("Erreur récupération user :", err);
        router.replace("/signin");
      }
    };
    fetchUser();
  }, [router, supabase]);

  useEffect(() => {
    const fetchProfil = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("residentes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) console.error("Erreur profil :", error);
      if (data) setProfil(data);
    };
    fetchProfil();
  }, [user, supabase]);

  // ============================================================
  // ABSENCES
  // ============================================================

  const fetchAbsences = useCallback(async () => {
    if (!user) return;
    const res = await fetch("/api/absences");
    const result = await res.json();
    if (res.ok) {
      setAbsences(result.absences ?? []);
    } else {
      console.error(result.error);
      toast.error("Impossible de charger vos absences.");
    }
    setIsReady(true);
  }, [user]);

  useEffect(() => {
    fetchAbsences();
  }, [fetchAbsences]);

  const handleSave = async (payload: AbsencePayload) => {
    const isEdit = !!editing;
    const res = await fetch("/api/absences", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { id: editing!.id, ...payload } : payload),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Erreur lors de l'enregistrement.");
      return;
    }
    toast.success(isEdit ? "Absence modifiée." : "Absence ajoutée.");
    setEditing(null);
    await fetchAbsences();
  };

  const handleDelete = (absence: Absence) => {
    toast("Supprimer cette absence ?", {
      action: {
        label: "Supprimer",
        onClick: async () => {
          const res = await fetch("/api/absences", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: absence.id }),
          });
          const result = await res.json();
          if (!res.ok) {
            toast.error(result.error || "Erreur lors de la suppression.");
            return;
          }
          toast.success("Absence supprimée.");
          await fetchAbsences();
        },
      },
    });
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (absence: Absence) => {
    setEditing(absence);
    setModalOpen(true);
  };

  // ============================================================
  // CALENDRIER
  // ============================================================

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // lundi = 0
  const calendarDays = [
    ...Array(firstDayOffset).fill(null),
    ...Array(daysInMonth).fill(0).map((_, i) => i + 1),
  ];
  const todayKey = formatDateKeyLocal(new Date());
  const absentDayKeys = getAbsentDayKeys(absences);

  const prevMonth = () => setCurrentMonth(new Date(year, monthIndex - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, monthIndex + 1, 1));

  // ============================================================
  // RENDU
  // ============================================================

  if (!isReady) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-white px-4 pt-6">
      <div className="w-full max-w-md flex justify-end items-center gap-2 mb-4">
        <AdministrationButton />
        <ProfileButton />
        <LogoutButton />
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        <Image src="/logo.png" alt="Logo" width={350} height={350} className="mb-3" />
        <h1 className="text-xl font-semibold text-center text-blue-800 mb-4">
          Mes présences au foyer
        </h1>
        <hr className="w-full border-gray-200 mb-4" />

        {/* En-tête mois */}
        <div className="flex items-center justify-between w-full mb-2">
          <button className="p-2 rounded-full hover:bg-gray-100 cursor-pointer" onClick={prevMonth}>
            <ChevronLeft className="text-blue-700" />
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-800">{MONTH_NAMES[monthIndex]}</p>
            <p className="text-xs text-slate-500">{year}</p>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-100 cursor-pointer" onClick={nextMonth}>
            <ChevronRight className="text-blue-700" />
          </button>
        </div>

        {/* Grille */}
        <div className="grid grid-cols-7 gap-2 text-center w-full mb-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="text-xs font-semibold text-gray-500">{d}</div>
          ))}

          {calendarDays.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} />;
            const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isAbsent = absentDayKeys.has(key);
            const isToday = key === todayKey;
            return (
              <div
                key={day}
                className={`relative flex flex-col items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all
                  ${isAbsent
                    ? "bg-pink-500 text-white"
                    : isToday
                    ? "bg-yellow-100 text-yellow-700 font-semibold border border-yellow-300"
                    : "text-slate-700"}`}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <span className="inline-block w-3 h-3 rounded-full bg-pink-500" />
          Jours d&apos;absence
        </div>

        {/* Mes absences */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800">Mes absences</h2>
            <button
              onClick={openAdd}
              className="flex items-center gap-1 bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-900 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>

          {absences.length === 0 ? (
            <p className="text-gray-500 italic text-sm">Aucune absence enregistrée.</p>
          ) : (
            <ul className="space-y-2">
              {absences.map((a) => (
                <li
                  key={a.id}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      Du {formatJour(a.date_debut)} au {formatJour(a.date_fin)}
                    </p>
                    {a.contact && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {a.contact}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(a)}
                      className="text-blue-600 hover:bg-blue-50 rounded-full p-2 transition cursor-pointer"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      className="text-red-600 hover:bg-red-50 rounded-full p-2 transition cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Vue staff (admin) */}
        {profil?.is_admin && (
          <button
            onClick={() => router.push("/admin/foyer")}
            className="flex items-center gap-2 border border-blue-700 text-blue-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-50 cursor-pointer mb-10"
          >
            <Eye className="w-4 h-4" /> Voir les présences
          </button>
        )}
      </div>

      <AbsenceModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        initial={
          editing
            ? { date_debut: editing.date_debut, date_fin: editing.date_fin, contact: editing.contact }
            : null
        }
      />
    </main>
  );
}

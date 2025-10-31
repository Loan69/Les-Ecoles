"use client";

import { useState, useEffect } from "react";
import CalendrierView from "../components/calendrierView";
import { EventFormData } from "@/types/EventFormData";
import { CalendarEvent } from "@/types/CalendarEvent";
import { User } from "@supabase/supabase-js";
import { useSupabase } from "../providers";
import LogoutButton from "../components/logoutButton";


export default function CalendrierPage() {
  const { supabase } = useSupabase();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [is_admin, setIsAdmin] = useState<boolean | null>(false);
  const [user, setUser] = useState<User | null>(null);

  // Récupération de l'utilisateur
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(data.user);
      } catch (err) {
        console.error("Erreur récupération user :", err);
      }
    };
    fetchUser();
  }, []);

  // Charger les données de l'utilisatrice pour voir si elle est admin
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return; // ⚠️ stop si user non défini

      const { data, error } = await supabase
        .from("residentes")
        .select("is_admin")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) console.error(error);
      
      else setIsAdmin(data?.is_admin);
    }

    fetchProfile();
  }, [user]);

  // 🟢 Charger les évènements depuis Supabase
  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("evenements")
      .select("*")
      .order("date_event", { ascending: true });
    if (error) console.error(error);
    else setEvents(data || []);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Détermination de la couleur suivant l'évènement
  function getCategoryColor(category: string | null) {
    switch (category) {
      case "anniversaire":
        return "bg-pink-100 text-pink-800 border-pink-300";
      case "formation":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "intendance":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "autre":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  }


  // 🟢 Ajout d’un évènement
  const handleAddEvent = async (data: EventFormData) => {
    const {
      titre,
      category,
      date_event,
      description,
      recurrence,
      heures,
      lieu,
      visibilite,
      visible_invites,
      demander_confirmation,
      reserve_admin,
      rappel_event,
    } = data;

    // Détermination automatique de la couleur selon le type
    const couleur = getCategoryColor(category);

    // Préparation des données à insérer
    const newEvent = {
      titre,
      category,
      couleur,
      date_event,
      description,
      recurrence,
      heures,
      lieu,
      visibilite, // objet { residences: [], etages: [], chambres: [] }
      visible_invites,
      demander_confirmation,
      user_id: user?.id,
      reserve_admin,
      rappel_event,
    };

    // Insertion dans la table Supabase
    const { data: inserted, error } = await supabase
      .from("evenements")
      .insert([newEvent])
      .select();

    if (error) {
      console.error("❌ Erreur d’ajout :", error);
      return;
    }

    if (inserted && inserted.length > 0) {
      console.log("✅ Évènement ajouté :", inserted[0]);
      setEvents((prev) => [...prev, ...inserted]);
    }
  };


  // 🟢 Suppression d’un évènement
  const handleDeleteEvent = async (id: number) => {
    const { error } = await supabase.from("evenements").delete().eq("id", id);
    if (error) console.error("Erreur suppression :", error);
    else setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  // 🟢 Edition d’un évènement (optionnel pour plus tard)
  const handleEditEvent = async (id: number, updates: Partial<CalendarEvent>) => {
    const { data, error } = await supabase
      .from("evenements")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) console.error("Erreur de modification :", error);
    else if (data) {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data[0] } : e)));
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center bg-white px-4 pt-6">
    {/* --- Bouton de déconnexion --- */}
    <div className="w-full max-w-md flex justify-end mb-4">
      <LogoutButton />
    </div>

    {/* --- Contenu principal du calendrier --- */}
    <div className="w-full max-w-md">
      <CalendrierView
        events={events}
        onAddEvent={handleAddEvent}
        onDeleteEvent={handleDeleteEvent}
        onEditEvent={handleEditEvent}
        is_admin={is_admin ?? false}
      />
    </div>
  </main>
  );
}

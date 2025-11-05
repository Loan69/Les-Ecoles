"use client";

import { useState, useEffect } from "react";
import CalendrierView from "../components/calendrierView";
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

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("residentes")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) console.error(error);
      else setIsAdmin(data?.is_admin);
    };
    fetchProfile();
  }, [user]);

  // Charger les événements depuis Supabase
  const fetchEvents = async () => {
    const { data, error } = await supabase.from("evenements").select("*");
    if (error) console.error("Erreur chargement des événements :", error);
    else setEvents(data || []);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Déterminer la couleur selon la catégorie
  const getCategoryColor = (category: string | undefined) => {
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
  };

  // Ajouter un événement
  const handleAddEvent = async (data: Partial<CalendarEvent>) => {
    const couleur = getCategoryColor(data.category);

    const newEvent = {
      ...data,
      couleur,
      user_id: user?.id,
    };

    const { data: inserted, error } = await supabase
      .from("evenements")
      .insert([newEvent])
      .select();

    if (error) {
      console.error("❌ Erreur d’ajout :", error);
      return;
    }

    if (inserted && inserted.length > 0) {
      setEvents((prev) => [...prev, ...inserted]);
    }
  };

  // Supprimer un événement
  const handleDeleteEvent = async (
    eventId: number,
    deleteType: "occurrence" | "all" = "all",
    selectedDate?: string
  ) => {
    const { data: event, error: fetchError } = await supabase
      .from("evenements")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchError) {
      console.error("Erreur récupération de l'événement :", fetchError);
      return;
    }

    if (deleteType === "occurrence" && selectedDate) {
      const newDates = (event.dates_event || []).filter((d: string) => d !== selectedDate);
      const { error: updateError } = await supabase
        .from("evenements")
        .update({ dates_event: newDates })
        .eq("id", eventId);

      if (updateError) console.error("Erreur mise à jour dates :", updateError);
      else setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, dates_event: newDates } : e))
      );
    } else {
      const { error: deleteError } = await supabase.from("evenements").delete().eq("id", eventId);
      if (deleteError) console.error("Erreur suppression :", deleteError);
      else setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  // Modifier un événement
  const handleEditEvent = async (id: number, updates: Partial<CalendarEvent>) => {
    const { data, error } = await supabase
      .from("evenements")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) console.error("Erreur de modification :", error);
    else if (data) setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data[0] } : e)));
  };

  return (
    <main className="min-h-screen flex flex-col items-center bg-white px-4 pt-6">
      <div className="w-full max-w-md flex justify-end mb-4">
        <LogoutButton />
      </div>

      <div className="w-full max-w-md">
        <CalendrierView
          events={events}
          onAddEvent={handleAddEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          is_admin={is_admin ?? false}
        />
      </div>
    </main>
  );
}

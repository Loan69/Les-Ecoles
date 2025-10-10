"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient, User } from "@supabase/auth-helpers-nextjs";
import CalendrierView from "../components/calendrierView";
import { EventFormData } from "@/types/EventFormData";
import { CalendarEvent } from "@/types/CalendarEvent";
import { useUser } from "@supabase/auth-helpers-react";
import LogoutButton from "../components/logoutButton";


export default function CalendrierPage() {
  const supabase = createClientComponentClient();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const user = useUser();
    
  console.log("Utilisateur actuel :", user);

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

  // 🟢 Ajout d’un évènement
  const handleAddEvent = async (data: EventFormData) => {

    const { titre, type, date_event, recurrence, heures, lieu, visibilite } = data;

    // On choisit la couleur automatiquement selon le type
    const couleur =
      type === "anniversaire"
        ? "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300"
        : type === "linge"
        ? "bg-blue-100 text-blue-700 border-blue-300"
        : "bg-yellow-100 text-yellow-700 border-yellow-300";
    
    console.log("📦 Données envoyées :", data);
    console.log(user?.id)

    const { data: inserted, error } = await supabase
      .from("evenements")
      .insert([{ titre, type, couleur, date_event, user_id: user?.id, recurrence, heures, lieu, visibilite }])
      .select();

    if (error) {
      console.error("Erreur d’ajout :", error);
      return;
    }

    if (inserted) setEvents((prev) => [...prev, ...inserted]);
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
      />
    </div>
  </main>
  );
}

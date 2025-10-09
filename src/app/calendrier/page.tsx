"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient, User } from "@supabase/auth-helpers-nextjs";
import CalendrierView from "../components/calendrierView";
import { EventFormData } from "@/types/EventFormData";
import { CalendarEvent } from "@/types/CalendarEvent";
import { useUser } from "@supabase/auth-helpers-react";


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
    const res = await fetch("/api/evenements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  
    const result = await res.json();
  
    if (result.error) return console.error("Erreur API:", result.error);
  
    setEvents((prev) => [...prev, ...result.data]);
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
    <CalendrierView
      events={events}
      onAddEvent={handleAddEvent}
      onDeleteEvent={handleDeleteEvent}
      onEditEvent={handleEditEvent}
    />
  );
}

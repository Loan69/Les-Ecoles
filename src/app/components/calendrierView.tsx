"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import ModalAjoutEvenement from "./AjoutEventModal";
import { EventFormData } from "@/types/EventFormData";
import { CalendarEvent } from "@/types/CalendarEvent";
import Image from "next/image";
import ConfirmationToggle from "./ConfirmationToggle";
import VisionConfirmation from "./VisionConfirmation";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";

type CalendrierViewProps = {
    events: {
      id: number;
      titre: string;
      couleur: string;
      date_event: string;
    }[];
    onAddEvent: (data: EventFormData) => Promise<void>;
    onEditEvent: (id: number, updates: Partial<CalendarEvent>) => Promise<void>;
    onDeleteEvent: (id: number) => Promise<void>;
    is_admin: boolean;
  };
  

  export default function CalendrierView({
    events,
    onAddEvent,
    onEditEvent,
    onDeleteEvent,
    is_admin,
  }: CalendrierViewProps) {
    const [openModal, setOpenModal] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const today = new Date();
    const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

    // Ouvrir le calendrier sur la bonne date
    useEffect(() => {
        const stored = localStorage.getItem("dateSelectionnee");
        if (stored) {
            const parsed = parseDateKeyLocal(stored);
            // affiche le mois correct
            setCurrentDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
            setSelectedDay(parsed.getDate());
        }
        }, []);


    useEffect(() => {
        if (openModal) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "auto";
        }
      
        // Nettoyage au unmount
        return () => {
          document.body.style.overflow = "auto";
        };
      }, [openModal]);
      
    const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    const currentMonth = monthNames[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();

    // --- calcul du nombre de jours dans le mois ---
    const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();

    // --- jour de la semaine du 1er jour du mois ---
    const firstDayOffset = (new Date(currentYear, currentDate.getMonth(), 1).getDay() + 6) % 7; 
    // (+6) % 7 car getDay() retourne 0 pour dimanche → on veut que lundi = 0

    // --- génération du tableau des jours (avec offset) ---
    const calendarDays = [
    ...Array(firstDayOffset).fill(null),
    ...Array(daysInMonth).fill(0).map((_, i) => i + 1)
    ];

    // --- date du jour ---
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;


    // --- navigation ---
    const prevMonth = () => {
        const prev = new Date(currentYear, currentDate.getMonth() - 1, 1);
        setCurrentDate(prev);
        setSelectedDay(null);
    };

    const nextMonth = () => {
        const next = new Date(currentYear, currentDate.getMonth() + 1, 1);
        setCurrentDate(next);
        setSelectedDay(null);
    };

    const handleSaveEvent = async (data: EventFormData): Promise<void> => {
        await onAddEvent(data);
        setOpenModal(false);
      };      
      

    // --- Liste d'évènements ---
    const eventsMap = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
        if (!acc[event.date_event]) acc[event.date_event] = [];
        acc[event.date_event].push(event);
        return acc;
      }, {});


    // date sélectionnée
    const selectedDateKey =
    selectedDay !== null
        ? `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(
            selectedDay
        ).padStart(2, "0")}`
        : null;

    const eventsDuJour = selectedDateKey ? eventsMap[selectedDateKey] || [] : [];

    return (
        <div className="relative">
            <div className="flex flex-col items-center w-full min-h-screen bg-white text-slate-700 font-sans p-4">
                {/* Logo */}
                <Image
                    src="/logo.png"
                    alt="Logo"
                    width={400}
                    height={400}
                    className="mb-3"
                />

                <hr className="w-full border-gray-300 mb-4" />

                {/* ENTÊTE CALENDRIER */}
                <div className="flex items-center justify-between w-full max-w-md mb-2">
                    <button className="p-2 rounded-full hover:bg-gray-100" onClick={prevMonth}>
                        <ChevronLeft className="text-blue-700" />
                    </button>
                <div className="text-center">
                    <p className="text-lg font-semibold text-slate-800">{currentMonth}</p>
                    <p className="text-xs text-slate-500">{currentYear}</p>
                </div>
                <button className="p-2 rounded-full hover:bg-gray-100" onClick={nextMonth}>
                    <ChevronRight className="text-blue-700" />
                </button>
                </div>

                {/* CALENDRIER */}
                <div className="grid grid-cols-7 gap-2 text-center w-full max-w-md mb-6">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                    <div key={day} className="text-xs font-semibold text-gray-500">
                    {day}
                    </div>
                ))}

                {calendarDays.map((day, index) => {
                    if (!day) return <div key={`empty-${index}`} />;

                    const key = `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const hasEvent = !!eventsMap[key];
                    const isSelected = day === selectedDay;
                    const isToday = key === todayKey;

                    return (
                            <div
                                key={day}
                                onClick={() => {
                                            setSelectedDay(day);
                                            // construit la date sélectionnée en local
                                            const selectedFullDate = new Date(currentYear, currentDate.getMonth(), day);
                                            localStorage.setItem("dateSelectionnee", formatDateKeyLocal(selectedFullDate));
                                        }}


                                className={`relative flex flex-col items-center justify-center w-10 h-10 rounded-full cursor-pointer text-sm font-medium transition-all
                                        ${
                                            isSelected
                                            ? "bg-blue-700 text-white"
                                            : isToday
                                            ? "bg-yellow-100 text-yellow-700 font-semibold border border-yellow-300"
                                            : "text-slate-700 hover:bg-blue-50"
                                        }`}
                            >
                                {day}
                                {hasEvent && (
                                <div className="flex space-x-1 mt-0.5">
                                    {eventsMap[key].map((_, i) => (
                                    <span
                                        key={i}
                                        className={`w-1.5 h-1.5 rounded-full ${
                                        i === 0
                                            ? "bg-fuchsia-500"
                                            : i === 1
                                            ? "bg-blue-500"
                                            : "bg-yellow-400"
                                        }`}
                                    ></span>
                                    ))}
                                </div>
                                )}
                            </div>
                            );
                })}
                </div>

                {/* ÉVÈNEMENTS DU JOUR */}
                {selectedDay && (
                    <div className="w-full max-w-md bg-white">
                        <h2 className="text-lg font-semibold text-slate-800 mb-3">
                        Évènements du jour : {selectedDay} {currentMonth} {currentYear}
                        </h2>
                        {eventsDuJour.map((e) => (
                            <div
                                key={e.id}
                                className={`border rounded-lg px-4 py-3 mb-3 ${e.couleur}`}
                            >
                                {/* Ligne titre + boutons */}
                                <div className="flex items-center justify-between">
                                    {/* --- Titre --- */}
                                    <span className="text-sm font-medium text-gray-800">{e.titre}</span>

                                    {/* --- Boutons à droite --- */}
                                    <div className="flex items-center space-x-2">
                                        {/* 👁 Vision (admin seulement) */}
                                        {e.demander_confirmation && is_admin && <VisionConfirmation eventId={e.id} />}

                                        {/* ✅ Toggle participation (pour tout le monde si demander_confirmation) */}
                                        {e.demander_confirmation && <ConfirmationToggle eventId={e.id} />}

                                        {/* ❌ Supprimer (admin seulement) */}
                                        {is_admin && (
                                        <button
                                            onClick={() => {
                                            if (
                                                confirm(
                                                `⚠️ Voulez vous vraiment supprimer l'évènement "${e.titre}" ?`
                                                )
                                            ) {
                                                onDeleteEvent(e.id);
                                            }
                                            }}
                                            className="text-red-600 hover:bg-red-100 rounded-full p-1 transition cursor-pointer"
                                            title="Supprimer l'évènement"
                                        >
                                            ✕
                                        </button>
                                        )}
                                    </div>
                                </div>

                                {/* Heure et description dessous */}
                                {e.heures && (
                                <p className="text-xs text-gray-600 mt-1 italic">
                                    À partir de {e.heures}
                                </p>
                                )}

                                {e.description && (
                                <p className="text-xs text-gray-500 mt-1">{e.description}</p>
                                )}
                            </div>
                            ))}

                    </div>
                    )}
            </div>

            {/* Bouton d’ajout d’évènement */}
            {is_admin && (
                <button
                    onClick={() => setOpenModal(true)}
                    className="
                        fixed bottom-20 md:bottom-24 
                        right-6 md:right-[calc(50%-24rem/2-1rem)] 
                        bg-blue-700 text-white rounded-full 
                        w-12 h-12 flex items-center justify-center text-2xl 
                        shadow-lg z-50 hover:scale-105 transition-transform cursor-pointer
                    "
                    >
                    +
                </button>
            )}

            <ModalAjoutEvenement
                open={openModal}
                onClose={() => setOpenModal(false)}
                onSave={handleSaveEvent}
                isAdmin={is_admin}
            />
        </div>
    );
}

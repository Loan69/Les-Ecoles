"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ModalAjoutEvenement from "./AjoutEventModal";
import { EventFormData } from "./AjoutEventModal";

/** Typage des évènements du calendrier */
type CalendarEvent = {
    id: number;
    titre: string;
    couleur: string; // classes tailwind pour fond/texte/bord
    type?: string;
  };

type Event = {
    id: number;
    titre: string;

};

export default function CalendrierView() {
    const [openModal, setOpenModal] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

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
        console.log("Nouvel évènement :", data);
        setOpenModal(false);
      };
      

    // --- exemples d’évènements ---
    const eventsMap: Record<string, CalendarEvent[]> = {
        "2025-08-02": [
          { id: 1, titre: "Anniversaire d’Agathe ! (n°36 à 18h)", couleur: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300" },
          { id: 2, titre: "Lingerie : Descendre Draps avant 8h", couleur: "bg-blue-100 text-blue-700 border-blue-300" },
        ],
        "2025-08-09": [
          { id: 3, titre: "Soirée Jeux", couleur: "bg-yellow-100 text-yellow-700 border-yellow-300" },
        ],
      };

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
                {/* HEADER */}
                <header className="flex items-center justify-center w-full max-w-md mt-2 mb-6">
                <img
                    src="/logo.png"
                    alt="Les Écoles"
                    className="h-10 object-contain"
                />
                </header>

                {/* FILTRES */}
                <div className="flex justify-center space-x-3 mb-4">
                    {["Vue", "Évènements", "12"].map((label) => (
                        <button
                        key={label}
                        className="border border-blue-700 text-blue-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50"
                        >
                        {label}
                        </button>
                    ))}
                </div>

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

                    return (
                            <div
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`relative flex flex-col items-center justify-center w-10 h-10 rounded-full cursor-pointer text-sm font-medium transition-all
                                ${
                                isSelected
                                    ? "bg-blue-700 text-white"
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

                        {eventsDuJour.length > 0 ? (
                        <div className="flex flex-col space-y-2">
                            {eventsDuJour.map((e) => (
                            <div
                                key={e.id}
                                className={`flex items-center justify-between ${e.couleur} border rounded-lg px-4 py-2`}
                            >
                                <span className="text-sm font-medium">{e.titre}</span>
                                <div className="w-5 h-5 bg-white border-2 border-green-500 rounded-md flex items-center justify-center">
                                <span className="text-green-500 text-sm">✓</span>
                                </div>
                            </div>
                            ))}
                        </div>
                        ) : (
                        <p className="text-sm text-gray-500 italic">Aucun évènement ce jour.</p>
                        )}
                    </div>
                )}
            </div>
            {/* Bouton d’ajout d’évènement */}
            <button
                onClick={() => setOpenModal(true)}
                className="
                    fixed bottom-20 md:bottom-24 
                    right-6 md:right-[calc(50%-24rem/2-1rem)] 
                    bg-blue-700 text-white rounded-full 
                    w-12 h-12 flex items-center justify-center text-2xl 
                    shadow-lg z-50 hover:scale-105 transition-transform
                "
                >
                +
            </button>


            <ModalAjoutEvenement
                open={openModal}
                onClose={() => setOpenModal(false)}
                onSave={handleSaveEvent}
            />
        </div>
    );
}

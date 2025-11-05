"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Edit } from "lucide-react";
import ModalAjoutEvenement from "./AjoutEventModal";
import { CalendarEvent } from "@/types/CalendarEvent";
import Image from "next/image";
import ConfirmationToggle from "./ConfirmationToggle";
import VisionConfirmation from "./VisionConfirmation";
import { formatDateKeyLocal, parseDateKeyLocal } from "@/lib/utilDate";
import { DeleteEventModal } from "./DeleteEventModal";

type CalendrierViewProps = {
    events: CalendarEvent[];
    onAddEvent: (data: Partial<CalendarEvent>) => Promise<void>;
    onEditEvent: (id: number, updates: Partial<CalendarEvent>) => Promise<void>;
    onDeleteEvent: (id: number, deleteType: "occurrence" | "all", selectedDate?: string) => Promise<void>;
    is_admin: boolean;
};

export default function CalendrierView({
    events,
    onAddEvent,
    onEditEvent,
    onDeleteEvent,
    is_admin,
    }: CalendrierViewProps) {

    const [currentDate, setCurrentDate] = useState(new Date());
    const today = new Date();
    const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
    const [modalOpenAdd, setModalOpenAdd] = useState(false);
    const [modalOpenDel, setModalOpenDel] = useState(false);
    const [modalEvent, setModalEvent] = useState<{ id: number; title: string; isMultiDate: boolean } | null>(null);
    const [eventToEdit, setEventToEdit] = useState<Partial<CalendarEvent> | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Ouvrir le calendrier sur la bonne date
    useEffect(() => {
        const stored = localStorage.getItem("dateSelectionnee");
        if (stored) {
        const parsed = parseDateKeyLocal(stored);
        setCurrentDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
        setSelectedDay(parsed.getDate());
        }
    }, []);

    useEffect(() => {
        document.body.style.overflow = modalOpenAdd ? "hidden" : "auto";
        return () => {
        document.body.style.overflow = "auto";
        };
    }, [modalOpenAdd]);

    const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    const currentMonth = monthNames[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();
    const firstDayOffset = (new Date(currentYear, currentDate.getMonth(), 1).getDay() + 6) % 7;

    const calendarDays = [
        ...Array(firstDayOffset).fill(null),
        ...Array(daysInMonth).fill(0).map((_, i) => i + 1)
    ];

    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const prevMonth = () => {
        setCurrentDate(new Date(currentYear, currentDate.getMonth() - 1, 1));
        setSelectedDay(null);
    };
    const nextMonth = () => {
        setCurrentDate(new Date(currentYear, currentDate.getMonth() + 1, 1));
        setSelectedDay(null);
    };

    // Mapping des events par date
    const eventsMap = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
        event.dates_event?.forEach((dateStr) => {
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(event);
        });
        return acc;
    }, {});

    const selectedDateKey =
        selectedDay !== null
        ? `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
        : undefined;

    const eventsDuJour = selectedDateKey ? eventsMap[selectedDateKey] || [] : [];

    return (
        <div className="relative">
        <div className="flex flex-col items-center w-full min-h-screen bg-white text-slate-700 font-sans p-4">
            <Image src="/logo.png" alt="Logo" width={400} height={400} className="mb-3" />
            <hr className="w-full border-gray-300 mb-4" />

            {/* Entête calendrier */}
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

            {/* Calendrier */}
            <div className="grid grid-cols-7 gap-2 text-center w-full max-w-md mb-6">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
                <div key={day} className="text-xs font-semibold text-gray-500">{day}</div>
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
                    const selectedFullDate = new Date(currentYear, currentDate.getMonth(), day);
                    localStorage.setItem("dateSelectionnee", formatDateKeyLocal(selectedFullDate));
                    }}
                    className={`relative flex flex-col items-center justify-center w-10 h-10 rounded-full cursor-pointer text-sm font-medium transition-all
                    ${isSelected ? "bg-blue-700 text-white" : isToday ? "bg-yellow-100 text-yellow-700 font-semibold border border-yellow-300" : "text-slate-700 hover:bg-blue-50"}`}
                >
                    {day}
                    {hasEvent && (
                    <div className="flex space-x-1 mt-0.5">
                        {eventsMap[key].map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-fuchsia-500" : i === 1 ? "bg-blue-500" : "bg-yellow-400"}`}></span>
                        ))}
                    </div>
                    )}
                </div>
                );
            })}
            </div>

            {/* Évènements du jour */}
            {selectedDay && (
            <div className="w-full max-w-md bg-white">
                <h2 className="text-lg font-semibold text-slate-800 mb-3">
                Évènements du jour : {selectedDay} {currentMonth} {currentYear}
                </h2>
                {eventsDuJour.map(e => (
                <div key={e.id} className={`border-l-4 ${e.couleur || "border-blue-500"} bg-blue-50 rounded-md px-4 py-3 mb-3 shadow-sm`}>
                    <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{e.titre}</span>

                    <div className="flex items-center space-x-2">
                        {e.demander_confirmation && is_admin && <VisionConfirmation eventId={e.id!} />}
                        {e.demander_confirmation && <ConfirmationToggle eventId={e.id!} />}
                    </div>

                    <div className="flex items-center space-x-2">
                        {is_admin && (
                        <button
                            onClick={() => {
                            setEventToEdit(e);
                            setIsEditing(true);
                            setModalOpenAdd(true);
                            }}
                            className="text-blue-600 hover:bg-blue-100 rounded-full p-1 transition cursor-pointer"
                            title="Modifier l'évènement"
                        >
                            <Edit size={20} />
                        </button>
                        )}

                        {is_admin && (
                        <button
                            onClick={() => {
                            setModalEvent({
                                id: e.id!,
                                title: e.titre,
                                isMultiDate: (e.dates_event || []).length > 1,
                            });
                            setModalOpenDel(true);
                            }}
                            className="text-red-600 hover:bg-red-100 rounded-full p-1 transition cursor-pointer"
                            title="Supprimer l'évènement"
                        >
                            ✕
                        </button>
                        )}
                    </div>
                    </div>

                    {e.heures && <p className="text-xs text-gray-600 mt-1 italic">À partir de {e.heures}</p>}
                    {e.description && <p className="text-xs text-gray-500 mt-1">{e.description}</p>}
                </div>
                ))}
            </div>
            )}
        </div>

        {/* Bouton d’ajout */}
        {is_admin && (
            <button
            onClick={() => {
                setEventToEdit(null);
                setIsEditing(false);
                setModalOpenAdd(true);
            }}
            className="fixed bottom-20 md:bottom-24 right-6 md:right-[calc(50%-24rem/2-1rem)] bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg z-50 hover:scale-105 transition-transform cursor-pointer"
            >
            +
            </button>
        )}

        {/* Modale création/édition */}
        <ModalAjoutEvenement
            open={modalOpenAdd}
            isAdmin={is_admin}
            eventToEdit={eventToEdit ?? undefined}
            isEditing={isEditing}
            onClose={() => {
            setModalOpenAdd(false);
            setEventToEdit(null);
            setIsEditing(false);
            }}
            onSave={async (formData) => {
            if (isEditing && eventToEdit?.id) {
                await onEditEvent(eventToEdit.id, formData);
            } else {
                await onAddEvent(formData);
            }
            setModalOpenAdd(false);
            setEventToEdit(null);
            setIsEditing(false);
            }}
        />

        {/* Modale suppression */}
        {modalEvent && (
            <DeleteEventModal
            isOpen={modalOpenDel}
            onClose={() => setModalOpenDel(false)}
            eventTitle={modalEvent.title}
            selectedDate={selectedDateKey}
            isMultiDate={modalEvent.isMultiDate}
            onDeleteOccurrence={async () => {
                await onDeleteEvent(modalEvent.id, "occurrence", selectedDateKey);
                setModalOpenDel(false);
            }}
            onDeleteAll={async () => {
                await onDeleteEvent(modalEvent.id, "all", selectedDateKey);
                setModalOpenDel(false);
            }}
            />
        )}
        </div>
    );
}

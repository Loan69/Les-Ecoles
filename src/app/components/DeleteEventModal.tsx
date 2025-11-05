import { formatDateFR } from "@/lib/utilDate";
import React from "react";

interface DeleteEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteOccurrence: () => void;
  onDeleteAll: () => void;
  eventTitle: string;
  selectedDate?: string;
  isMultiDate?: boolean;
}

export const DeleteEventModal: React.FC<DeleteEventModalProps> = ({
  isOpen,
  onClose,
  onDeleteOccurrence,
  onDeleteAll,
  eventTitle,
  selectedDate,
  isMultiDate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-[360px] max-w-[90%] text-center transform transition-all duration-200 scale-100">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Supprimer l&apos;événement</h2>
        <p className="mb-6 text-gray-700 text-base leading-relaxed pl-3 pr-3">
          {isMultiDate && selectedDate
            ? `Voulez-vous supprimer uniquement la date du ${formatDateFR(selectedDate)} ou tout l'événement ${eventTitle} ?`
            : `Voulez-vous supprimer l'événement ${eventTitle} ?`}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          {isMultiDate && selectedDate && (
            <button
              onClick={onDeleteOccurrence}
              className="mb-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md"
            >
              Supprimer cette date
            </button>
          )}
          <button
            onClick={onDeleteAll}
            className="mb-2 cursor-pointer bg-red-400 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md"
          >
            Supprimer tout
          </button>
          <button
            onClick={onClose}
            className="mb-2 cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

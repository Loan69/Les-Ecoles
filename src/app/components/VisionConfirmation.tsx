"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, Users, Home, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSupabase } from "@/app/providers";
import { Residente } from "@/types/Residente";
import { CalendarEvent } from "@/types/CalendarEvent";
import LoadingSpinner from "@/app/components/LoadingSpinner"; // Utilise ton spinner existant
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VisionConfirmationsProps {
  eventId: number | undefined;
}

export default function VisionConfirmation({ eventId }: VisionConfirmationsProps) {
  const [participants, setParticipants] = useState<Residente[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { supabase } = useSupabase();

  const fetchParticipants = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("evenements")
        .select("confirmations")
        .eq("id", eventId)
        .single();

      if (error) throw error;

      const confirmations = (data?.confirmations as CalendarEvent["confirmations"]) || [];
      if (confirmations.length === 0) {
        setParticipants([]);
        return;
      }

      const { data: residents, error: resErr } = await supabase
        .from("residentes")
        .select("id, user_id, nom, prenom, residence, etage, chambre")
        .in("user_id", confirmations);

      if (resErr) throw resErr;
      setParticipants((residents as Residente[]) || []);
    } catch (err) {
      console.error("Erreur de récupération des participants:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId, supabase]);

  useEffect(() => {
    if (open) fetchParticipants();
  }, [open, fetchParticipants]);

  // Génère une couleur de fond basée sur le nom pour l'avatar
  const getInitials = (p: string, n: string) => `${p[0]}${n[0]}`.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group flex items-center gap-2 px-3 py-2 bg-white border border-orange-200 rounded-xl shadow-sm hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 cursor-pointer">
          <Eye className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-orange-900">Voir les inscrits</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-orange-100">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-orange-50">
          <div className="p-2 bg-orange-100 rounded-full">
            <Users className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-orange-900">Confirmations</DialogTitle>
            <p className="text-xs text-orange-600 font-medium">
              {participants.length} personne{participants.length > 1 ? 's' : ''} inscrite{participants.length > 1 ? 's' : ''}
            </p>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="py-10 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : participants.length > 0 ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {participants
                  .sort((a, b) => a.nom.localeCompare(b.nom))
                  .map((r) => (
                  <div 
                    key={r.user_id} 
                    className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/30 border border-orange-100/50 hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {getInitials(r.prenom, r.nom)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {r.prenom} {r.nom}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Home className="w-3 h-3" />
                          <span>Ch. {r.chambre || "?"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant="outline" className={`
                      text-[10px] font-bold px-2 py-0.5 rounded-lg border-orange-200
                      ${r.residence === "12" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-purple-700 border-purple-100"}
                    `}>
                      Rès. {r.residence}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-12 text-center">
              <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
                <UserCheck className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Aucune confirmation pour le moment.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
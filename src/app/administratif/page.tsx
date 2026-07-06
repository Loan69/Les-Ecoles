"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, Plus, Trash2, ChevronUp, ChevronDown, Phone, Mail, Save, Lock } from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import { useSupabase } from "../providers";
import { AdminSection, Contact } from "@/types/AdminSection";
import { RichTextEditor, RichTextView } from "../components/RichText";
import LogoutButton from "../components/logoutButton";
import ProfileButton from "../components/profileButton";
import AdministrationButton from "../components/administrationButton";
import LoadingSpinner from "../components/LoadingSpinner";

function getContacts(section: AdminSection): Contact[] {
  const c = section.content as { contacts?: Contact[] } | null;
  return c?.contacts ?? [];
}

// ============================================================
// VUE LECTURE D'UNE SECTION
// ============================================================
function SectionView({ section }: { section: AdminSection }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold text-blue-800">{section.title}</h2>
        {section.admin_only && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <Lock className="w-3 h-3" /> Admins
          </span>
        )}
      </div>
      {section.type === "contacts" ? (
        <ContactsView contacts={getContacts(section)} />
      ) : (
        <RichTextView key={section.updated_at} value={section.content as JSONContent} />
      )}
    </section>
  );
}

function ContactsView({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) return <p className="text-sm text-gray-400 italic">Aucun contact.</p>;
  return (
    <ul className="space-y-2">
      {contacts.map((c, i) => (
        <li key={i} className="border border-gray-100 rounded-xl px-4 py-3">
          <p className="font-medium text-gray-800">
            {c.nom} {c.role && <span className="text-sm font-normal text-gray-500">· {c.role}</span>}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
            {c.telephone && (
              <a href={`tel:${c.telephone}`} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                <Phone className="w-3.5 h-3.5" /> {c.telephone}
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                <Mail className="w-3.5 h-3.5" /> {c.email}
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// CARTE D'ÉDITION D'UNE SECTION (admin)
// ============================================================
function SectionEditCard({
  section,
  onChanged,
  onMove,
  isFirst,
  isLast,
}: {
  section: AdminSection;
  onChanged: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [title, setTitle] = useState(section.title);
  const [richContent, setRichContent] = useState<JSONContent | null>(
    section.type === "richtext" ? (section.content as JSONContent) : null
  );
  const [contacts, setContacts] = useState<Contact[]>(section.type === "contacts" ? getContacts(section) : []);
  const [adminOnly, setAdminOnly] = useState(section.admin_only);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Le titre est requis.");
      return;
    }
    setSaving(true);
    const content = section.type === "contacts" ? { contacts } : richContent ?? { type: "doc", content: [] };
    const res = await fetch("/api/admin-sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: section.id, title, content, admin_only: adminOnly }),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success("Section enregistrée.");
    onChanged();
  };

  const remove = () => {
    toast(`Supprimer « ${section.title} » ?`, {
      action: {
        label: "Supprimer",
        onClick: async () => {
          const res = await fetch("/api/admin-sections", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: section.id }),
          });
          const j = await res.json();
          if (!res.ok) return toast.error(j.error || "Erreur.");
          toast.success("Section supprimée.");
          onChanged();
        },
      },
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-bold text-blue-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          placeholder="Titre de la section"
        />
        <button onClick={() => onMove(-1)} disabled={isFirst} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer" title="Monter">
          <ChevronUp className="w-4 h-4" />
        </button>
        <button onClick={() => onMove(1)} disabled={isLast} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer" title="Descendre">
          <ChevronDown className="w-4 h-4" />
        </button>
        <button onClick={remove} className="p-2 rounded-full text-red-600 hover:bg-red-50 cursor-pointer" title="Supprimer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {section.type === "contacts" ? (
        <ContactsEditor contacts={contacts} setContacts={setContacts} />
      ) : (
        <RichTextEditor value={richContent} onChange={setRichContent} />
      )}

      <div className="flex items-center justify-between mt-3 gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={adminOnly}
            onChange={(e) => setAdminOnly(e.target.checked)}
            className="w-4 h-4 accent-amber-600 cursor-pointer"
          />
          <span className="inline-flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-amber-600" /> Réservé aux administratrices
          </span>
        </label>
        <button onClick={save} disabled={saving} className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer">
          <Save className="w-4 h-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function ContactsEditor({ contacts, setContacts }: { contacts: Contact[]; setContacts: (c: Contact[]) => void }) {
  const update = (i: number, field: keyof Contact, val: string) => {
    setContacts(contacts.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)));
  };
  return (
    <div className="space-y-3">
      {contacts.map((c, i) => (
        <div key={i} className="border border-gray-100 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={c.nom} onChange={(e) => update(i, "nom", e.target.value)} placeholder="Nom" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <input value={c.role ?? ""} onChange={(e) => update(i, "role", e.target.value)} placeholder="Rôle" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <input value={c.telephone ?? ""} onChange={(e) => update(i, "telephone", e.target.value)} placeholder="Téléphone" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <div className="flex gap-2">
            <input value={c.email ?? ""} onChange={(e) => update(i, "email", e.target.value)} placeholder="Email" className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={() => setContacts(contacts.filter((_, idx) => idx !== i))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer" title="Retirer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <button onClick={() => setContacts([...contacts, { nom: "" }])} className="flex items-center gap-1 text-sm text-blue-700 hover:underline cursor-pointer">
        <Plus className="w-4 h-4" /> Ajouter un contact
      </button>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function AdministratifPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"richtext" | "contacts">("richtext");
  const [newAdminOnly, setNewAdminOnly] = useState(false);

  const fetchSections = useCallback(async () => {
    const res = await fetch("/api/admin-sections");
    const j = await res.json();
    if (res.ok) setSections(j.sections ?? []);
    else toast.error(j.error || "Erreur de chargement.");
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/signin");
        return;
      }
      const { data: profil } = await supabase.from("residentes").select("is_admin").eq("user_id", data.user.id).maybeSingle();
      setIsAdmin(profil?.is_admin ?? false);
      await fetchSections();
      setLoading(false);
    })();
  }, [supabase, router, fetchSections]);

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    await fetch("/api/admin-sections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((s) => s.id) }),
    });
  };

  const addSection = async () => {
    if (!newTitle.trim()) {
      toast.error("Titre requis.");
      return;
    }
    const res = await fetch("/api/admin-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), type: newType, admin_only: newAdminOnly }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || "Erreur.");
    toast.success("Section ajoutée.");
    setAddOpen(false);
    setNewTitle("");
    setNewType("richtext");
    setNewAdminOnly(false);
    await fetchSections();
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-800">Administratif</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setEditMode((e) => !e)}
                className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition ${
                  editMode ? "bg-green-600 text-white hover:bg-green-700" : "border border-blue-700 text-blue-700 hover:bg-blue-50"
                }`}
              >
                {editMode ? <><Check className="w-4 h-4" /> Terminer</> : <><Pencil className="w-4 h-4" /> Modifier</>}
              </button>
            )}
            <AdministrationButton />
            <ProfileButton />
            <LogoutButton />
          </div>
        </div>

        {sections.length === 0 && !editMode && (
          <p className="text-gray-500 italic">Aucune information pour le moment.</p>
        )}

        <div className="space-y-5">
          {sections.map((section, i) =>
            editMode ? (
              <SectionEditCard
                key={section.id}
                section={section}
                onChanged={fetchSections}
                onMove={(dir) => move(i, dir)}
                isFirst={i === 0}
                isLast={i === sections.length - 1}
              />
            ) : (
              <SectionView key={section.id} section={section} />
            )
          )}
        </div>

        {editMode && (
          <button
            onClick={() => setAddOpen(true)}
            className="mt-5 flex items-center gap-1 bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-900 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Ajouter une section
          </button>
        )}
      </div>

      {/* Modale ajout de section */}
      <AnimatePresence>
        {addOpen && (
          <motion.div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Nouvelle section</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex : Règlement, Horaires…" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value as "richtext" | "contacts")} className="w-full border border-gray-300 rounded-lg p-2">
                    <option value="richtext">Texte (mise en forme)</option>
                    <option value="contacts">Contacts</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={newAdminOnly} onChange={(e) => setNewAdminOnly(e.target.checked)} className="w-4 h-4 accent-amber-600 cursor-pointer" />
                  <span className="inline-flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" /> Réservé aux administratrices
                  </span>
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">Annuler</button>
                <button onClick={addSection} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-800 cursor-pointer">Créer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

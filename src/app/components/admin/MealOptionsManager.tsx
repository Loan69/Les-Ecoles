'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useSupabase } from '@/app/providers'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Plus, Trash2, Lock, Eye, Save, Pencil, Soup, Sandwich, Power } from 'lucide-react'
import { Rule } from '@/types/Rule'
import { Option } from '@/types/Option'

export default function MealOptionsManager() {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [service, setService] = useState<'dejeuner' | 'diner'>('dejeuner')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [indefinite, setIndefinite] = useState(false)
  const [options, setOptions] = useState<Option[]>([])
  const [existingRules, setExistingRules] = useState<Rule[]>([])
  const [editingRule, setEditingRule] = useState<Rule | null>(null)

  // ✅ Charger l’utilisateur
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) router.replace('/signin')
      else setUser(data.user)
    }
    fetchUser()
  }, [router, supabase])

  // ✅ Marquage des conflits
  const markConflicts = (rules: Rule[]) => {
    const marked = rules.map(r => ({ ...r, conflict: false, active: false }));

    const grouped: Record<'dejeuner' | 'diner', Rule[]> = { dejeuner: [], diner: [] };
    marked.forEach(r => grouped[r.service].push(r));

    for (const key of ['dejeuner', 'diner'] as ('dejeuner' | 'diner')[]) {
        const rulesForService = grouped[key];

        for (let i = 0; i < rulesForService.length; i++) {
        for (let j = i + 1; j < rulesForService.length; j++) {
            const a = rulesForService[i];
            const b = rulesForService[j];

            const overlap =
            (!a.end_date || !b.start_date || a.end_date >= b.start_date) &&
            (!b.end_date || !a.start_date || b.end_date >= a.start_date);

            if (overlap) {
            // comparer updated_at puis created_at
            const dateA = new Date(a.updated_at ?? a.created_at);
            const dateB = new Date(b.updated_at ?? b.created_at);

            const newer = dateA > dateB ? a : b;
            const older = newer === a ? b : a;

            newer.active = true;
            older.conflict = true;
            }
        }
        }
    }

    return marked;
    };


  // ✅ Charger les règles
  const loadRules = async () => {
    const { data, error } = await supabase
        .from('special_meal_options')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error && data) {
        const rules = data as Rule[];
        setExistingRules(markConflicts(rules));
    }
    };



  // ✅ Charger les options par défaut
  const loadDefaultOptions = async (selectedService: 'dejeuner' | 'diner') => {
    const { data, error } = await supabase
      .from('select_options_repas')
      .select('id, label, value, admin_only, is_active, category')
      .eq('is_active', true)
      .eq('category', selectedService)
      .order('id', { ascending: true })

    if (!error && data) {
      const withFlag = data.map(o => ({ ...o, is_default: true }))
      setOptions(withFlag)
    }
  }

  useEffect(() => {
    loadRules()
    loadDefaultOptions('dejeuner')
  }, [])

  useEffect(() => {
    if (!editingRule) loadDefaultOptions(service)
  }, [service])

  // ✅ Sauvegarde
  const save = async () => {
    if (!startDate) return alert('Veuillez sélectionner une date de début')
    if (!options.length) return alert('Ajoutez au moins une option')

    // chaque option doit avoir une "résidence" (value) sélectionnée
    const missingResidence = options.some(
        (opt) => !opt.is_default && (!opt.value || opt.value.trim() === '')
    )

    if (missingResidence) {
        return alert('Veuillez sélectionner une résidence pour chaque nouvelle option')
    }

    // Calcul de la valeur end_date
    const endDateValue = indefinite ? null : endDate === "" ? startDate : endDate;

    // payload commun
    const payloadCommon = {
        start_date: startDate,
        end_date: endDateValue,
        indefinite,
        service,
        options,
    };

    let error;

    if (editingRule) {
        // Mode édition : on ajoute updated_by / updated_at
        const payloadUpdate = {
        ...payloadCommon,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
        };

        const { error: e } = await supabase
        .from('special_meal_options')
        .update(payloadUpdate)
        .eq('id', editingRule.id);

        error = e;
    } else {
        // on met created_by (déjà présent auparavant)
        const payloadInsert = {
        ...payloadCommon,
        created_by: user?.id ?? null,
        };

        const { error: e } = await supabase
        .from('special_meal_options')
        .insert(payloadInsert);

        error = e;
    }

    if (error) {
        console.error('Erreur sauvegarde special_meal_options:', error);
        alert('Erreur lors de la sauvegarde');
    } else {
        // ✅ Reset complet du formulaire
        setStartDate('');
        setEndDate('');
        setIndefinite(false);
        setEditingRule(null);

        // ✅ Recharger les options par défaut du service actuel
        loadDefaultOptions(service);

        // ✅ Recharger les règles
        loadRules();
    }
  }

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Supprimer cette règle ?')) return
    const { error } = await supabase.from('special_meal_options').delete().eq('id', id)
    if (!error) loadRules()
  }

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule)
    setStartDate(rule.start_date)
    setEndDate(rule.end_date || '')
    setIndefinite(rule.indefinite)
    setService(rule.service)
    setOptions(rule.options)
  }

  // ✅ Toggle is_active
  const toggleActive = (i: number) => {
    const updated = [...options]
    updated[i].is_active = !updated[i].is_active
    setOptions(updated)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-600">Gestion des repas spéciaux</h1>
        <p className="text-gray-500 text-sm">Créez, modifiez et gérez les options de repas disponibles pour chaque service.</p>
      </motion.div>

      {/* --- FORM --- */}
      <Card className="shadow-lg border border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">
            {editingRule ? '✏️ Modifier une règle' : '➕ Nouvelle règle'}
          </h2>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Date de début</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Date de fin</Label>
              <Input type="date" disabled={indefinite} value={endDate} onChange={e => setEndDate(e.target.value)} />
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" checked={indefinite} onChange={e => setIndefinite(e.target.checked)} />
                <span className="text-sm text-gray-600">Indéfini</span>
              </div>
            </div>
            <div>
              <Label>Service</Label>
              <Select value={service} onValueChange={v => setService(v as 'dejeuner' | 'diner')}>
                <SelectTrigger><SelectValue placeholder="Choisir un service" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dejeuner"><Sandwich /> Déjeuner</SelectItem>
                  <SelectItem value="diner"><Soup /> Dîner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* --- Options --- */}
          <div className="space-y-3">
            <Label>Options disponibles</Label>
            {options.map((opt, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex flex-col md:flex-row items-center gap-3 p-3 border rounded-lg ${
                  opt.is_default ? 'bg-blue-50 border-blue-200' : 'bg-white'
                }`}
              >
                <Input
                  className="flex-1 "
                  value={opt.label}
                  disabled={opt.is_default} // 🔒 option par défaut non éditable
                  placeholder="Label"
                  onChange={e => {
                    const newOpts = [...options]
                    newOpts[i].label = e.target.value
                    setOptions(newOpts)
                  }}
                />

                {/* Sélecteur de valeur */}
                <Select
                  value={opt.value}
                  disabled={opt.is_default} // 🔒 valeur non modifiable pour les options par défaut
                  onValueChange={v => {
                    const newOpts = [...options]
                    newOpts[i].value = v
                    setOptions(newOpts)
                  }}
                >
                  <SelectTrigger className="w-36"><SelectValue placeholder="Résidence" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">Résidence 12</SelectItem>
                    <SelectItem value="36">Résidence 36</SelectItem>
                  </SelectContent>
                </Select>

                {/* Bouton admin/public */}
                <Button
                  variant="outline"
                  className={`cursor-pointer flex items-center gap-1 ${
                    opt.admin_only ? 'border-orange-400 text-orange-600' : ''
                  }`}
                  onClick={() => {
                    const newOpts = [...options]
                    newOpts[i].admin_only = !opt.admin_only
                    setOptions(newOpts)
                  }}
                >
                  {opt.admin_only ? <Lock size={16} /> : <Eye size={16} />}
                  {opt.admin_only ? 'Admin' : 'Public'}
                </Button>

                {/* ✅ Toggle actif/inactif */}
                <Button
                  variant={opt.is_active ? 'default' : 'outline'}
                  className={`cursor-pointer flex items-center gap-1 ${
                    opt.is_active ? 'bg-green-500 text-white hover:bg-green-600' : 'text-gray-600'
                  }`}
                  onClick={() => toggleActive(i)}
                >
                  <Power size={16} />
                  {opt.is_active ? 'Active' : 'Inactive'}
                </Button>

                {/* Suppression uniquement si pas par défaut */}
                {!opt.is_default && (
                  <Button
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </motion.div>
            ))}

            <Button
              variant="secondary"
              className="mt-3 cursor-pointer"
              onClick={() => setOptions([...options, { id: Date.now(), category: service, label: '', value: '', admin_only: false, is_active: true }])}
            >
              <Plus size={16} className="mr-1" /> Ajouter une option
            </Button>
          </div>

          <Button
            onClick={save}
            className={`cursor-pointer w-full text-white font-semibold py-2 ${
              editingRule
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90'
            }`}
          >
            <Save size={18} className="mr-2" />
            {editingRule ? 'Mettre à jour la règle' : 'Enregistrer la règle'}
          </Button>
        </CardContent>
      </Card>

      {/* Liste des règles */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Règles existantes</h2>
        {existingRules.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune règle enregistrée.</p>
        ) : (
          existingRules.map(r => (
            <motion.div
              key={r.id}
              layout
              className={`p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center transition-all
                ${r.active ? 'bg-green-50 border-green-300' : r.conflict ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}
              `}
            >
              <div className="space-y-1">
                <h3 className={`font-semibold ${r.service === 'dejeuner' ? 'text-blue-600' : 'text-violet-600'}`}>
                  {r.service === 'dejeuner' ? 'Déjeuner' : 'Dîner'}
                </h3>
                <p className="text-sm text-gray-600">
                  {r.indefinite ? 'Durée : indéfinie' : `Du ${r.start_date} au ${r.end_date || '-'}`}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {r.options.map((o, j) => (
                   <Badge
                        key={j}
                        variant="secondary"
                        className={`text-sm py-1 px-3 ${
                            o.admin_only ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'
                        } ${!o.is_active ? 'opacity-50' : ''}`}
                        >
                        {o.label}
                    </Badge>

                  ))}
                  {r.active && <Badge className="bg-green-500 text-white ml-2">Active</Badge>}
                  {r.conflict && <Badge className="bg-red-500 text-white ml-2">Inactive</Badge>}
                </div>
              </div>
              <div className="flex gap-2 mt-3 md:mt-0">
                <Button variant="outline" className="text-blue-500 hover:bg-blue-50 cursor-pointer" onClick={() => handleEditRule(r)}>
                  <Pencil size={18} />
                </Button>
                <Button variant="outline" className="text-red-500 hover:bg-red-100 cursor-pointer" onClick={() => handleDeleteRule(r.id)}>
                  <Trash2 size={18} />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

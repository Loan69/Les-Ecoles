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
import { Plus, Trash2, Lock, Eye, Save } from 'lucide-react'

type Option = {
  label: string
  value: 12 | 36
  admin_only: boolean
}

type Rule = {
  id: number
  start_date: string
  end_date: string | null
  indefinite: boolean
  service: 'dejeuner' | 'diner'
  options: Option[]
  created_at: string
}

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

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) router.replace('/signin')
      else setUser(data.user)
    }
    fetchUser()
  }, [router, supabase])

  const loadRules = async () => {
    const { data, error } = await supabase.from('special_meal_options').select('*').order('created_at', { ascending: false })
    if (!error && data) setExistingRules(data)
  }

  useEffect(() => { loadRules() }, [])

  const save = async () => {
    if (!startDate) return alert('Veuillez sélectionner une date de début')
    if (!options.length) return alert('Ajoutez au moins une option')

    const optionsWithNon = [{ label: 'Non', value: 'non', admin_only: false }, ...options]
    const payload = {
      start_date: startDate,
      end_date: indefinite ? null : endDate,
      indefinite,
      service,
      options: optionsWithNon,
      created_by: user?.id,
    }

    const { error } = await supabase.from('special_meal_options').insert(payload)
    if (error) alert('Erreur lors de la sauvegarde')
    else {
      setStartDate('')
      setEndDate('')
      setOptions([])
      loadRules()
    }
  }

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Supprimer cette règle ?')) return
    const { error } = await supabase.from('special_meal_options').delete().eq('id', id)
    if (!error) loadRules()
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-3xl font-bold text-gray-900">🍽️ Gestion des repas spéciaux</h1>
        <p className="text-gray-500 text-sm">Créez, modifiez et gérez les options de repas disponibles pour chaque service.</p>
      </motion.div>

      {/* --- FORMULAIRE DE CRÉATION --- */}
      <Card className="shadow-lg border border-gray-200">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">➕ Nouvelle règle</h2>
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
                  <SelectItem value="dejeuner">🍞 Déjeuner</SelectItem>
                  <SelectItem value="diner">🍝 Dîner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options disponibles</Label>
            {options.map((opt, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col md:flex-row items-center gap-3 p-3 border rounded-lg bg-gray-50"
              >
                <Input
                  className="flex-1"
                  value={opt.label}
                  placeholder="Label de l’option"
                  onChange={e => {
                    const newOpts = [...options]
                    newOpts[i].label = e.target.value
                    setOptions(newOpts)
                  }}
                />
                <Select
                  value={String(opt.value)}
                  onValueChange={v => {
                    const newOpts = [...options]
                    newOpts[i].value = Number(v) as 12 | 36
                    setOptions(newOpts)
                  }}
                >
                  <SelectTrigger className="w-36"><SelectValue placeholder="Résidence" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">Résidence 12</SelectItem>
                    <SelectItem value="36">Résidence 36</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className={`flex items-center gap-1 ${opt.admin_only ? 'border-orange-400 text-orange-600' : ''}`}
                  onClick={() => {
                    const newOpts = [...options]
                    newOpts[i].admin_only = !opt.admin_only
                    setOptions(newOpts)
                  }}
                >
                  {opt.admin_only ? <Lock size={16} /> : <Eye size={16} />}
                  {opt.admin_only ? 'Admin' : 'Public'}
                </Button>
                <Button variant="destructive" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                  <Trash2 size={16} />
                </Button>
              </motion.div>
            ))}

            <Button variant="secondary" className="mt-3" onClick={() => setOptions([...options, { label: '', value: 12, admin_only: false }])}>
              <Plus size={16} className="mr-1" /> Ajouter une option
            </Button>
          </div>

          <Button
            onClick={save}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white font-semibold py-2"
          >
            <Save size={18} className="mr-2" /> Enregistrer la règle
          </Button>
        </CardContent>
      </Card>

      {/* --- LISTE DES RÈGLES EXISTANTES --- */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">📋 Règles existantes</h2>
        {existingRules.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune règle enregistrée.</p>
        ) : (
          existingRules.map(r => (
            <motion.div
              key={r.id}
              layout
              className="p-5 rounded-xl border bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-md transition-all"
            >
              <div className="space-y-1">
                <h3 className={`font-semibold ${r.service === 'dejeuner' ? 'text-blue-600' : 'text-violet-600'}`}>
                  {r.service === 'dejeuner' ? '🍞 Déjeuner' : '🍝 Dîner'}
                </h3>
                <p className="text-sm text-gray-600">
                  {r.indefinite ? 'Durée : indéfinie' : `Du ${r.start_date} au ${r.end_date || '-'}`}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {r.options.map((o, j) => (
                    <Badge
                      key={j}
                      variant={o.admin_only ? 'destructive' : 'secondary'}
                      className="text-sm py-1 px-3"
                    >
                      {o.label} • Rés. {o.value}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                className="text-red-500 hover:bg-red-50 mt-3 md:mt-0"
                onClick={() => handleDeleteRule(r.id)}
              >
                <Trash2 size={18} />
              </Button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

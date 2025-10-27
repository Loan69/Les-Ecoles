'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input' 
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useSupabase } from '@/app/providers'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Trash2, Lock, Eye } from 'lucide-react'

type Option = { label: string; value: 12 | 36; admin_only: boolean }
type Rule = { id: number; start_date: string; end_date: string | null; indefinite: boolean; service: 'dejeuner' | 'diner'; options: Option[]; created_at: string }

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
      if (error || !data?.user) router.replace("/signin")
      else setUser(data.user)
    }
    fetchUser()
  }, [router, supabase])

  const loadRules = async () => {
    const { data, error } = await supabase.from('special_meal_options').select('*')
    if (!error) setExistingRules(data || [])
  }

  useEffect(() => { loadRules() }, [])

  const save = async () => {
    if (!startDate || !service || options.length === 0 || (!indefinite && !endDate)) {
      alert("Veuillez remplir tous les champs correctement")
      return
    }

    const optionsWithNon = [{ label: 'Non', value: 'non', admin_only: false }, ...options]

    const payload = { start_date: startDate, end_date: indefinite ? null : endDate, indefinite, service, options: optionsWithNon, created_by: user?.id }
    const { error } = await supabase.from('special_meal_options').insert(payload)
    if (error) alert("Erreur lors de la sauvegarde")
    else { setStartDate(''); setEndDate(''); setIndefinite(false); setOptions([]); loadRules() }
  }

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette règle ?")) return
    const { error } = await supabase.from('special_meal_options').delete().eq('id', id)
    if (error) alert("Erreur lors de la suppression")
    else loadRules()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">🍽️ Gestion des repas spéciaux</h1>
          <p className="text-gray-600">Créez et gérez les règles de repas spéciaux pour vos résidentes</p>
        </div>

        {/* Formulaire création règle */}
        <Card className="p-6 shadow-lg border border-gray-200 rounded-xl space-y-6 bg-white">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Créer une nouvelle règle</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label>Date de début</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Date de fin</Label>
              <Input type="date" value={endDate} disabled={indefinite} onChange={e => setEndDate(e.target.value)} className="mt-1" />
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <input type="checkbox" checked={indefinite} onChange={e => setIndefinite(e.target.checked)} />
                <span>Valable indéfiniment</span>
              </div>
            </div>

            <div>
              <Label className='mb-1'>Service</Label>
              <Select value={service} onValueChange={v => setService(v as 'dejeuner' | 'diner')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dejeuner">Déjeuner</SelectItem>
                  <SelectItem value="diner">Dîner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Options du repas</Label>
            {options.map((opt, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                <Input value={opt.label} placeholder="Label" onChange={e => { const newOpts = [...options]; newOpts[i].label = e.target.value; setOptions(newOpts) }} />
                <Select value={String(opt.value)} onValueChange={v => { const newOpts = [...options]; newOpts[i].value = Number(v) as 12 | 36; setOptions(newOpts) }}>
                  <SelectTrigger><SelectValue placeholder="Résidence" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">Résidence 12</SelectItem>
                    <SelectItem value="36">Résidence 36</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant={opt.admin_only ? 'secondary' : 'outline'} onClick={() => { const newOpts = [...options]; newOpts[i].admin_only = !opt.admin_only; setOptions(newOpts) }} className="flex items-center gap-2">
                  {opt.admin_only ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {opt.admin_only ? 'Admin only' : 'Public'}
                </Button>
                <Button variant="destructive" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="ml-auto md:ml-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setOptions([...options, { label: '', value: 12, admin_only: false }])} className="w-full mt-2">➕ Ajouter une option</Button>
          </div>

          <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 transition font-semibold py-3 rounded-lg" onClick={save}>💾 Enregistrer la règle</Button>
        </Card>

        {/* Règles existantes */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700">📋 Règles existantes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {existingRules.length === 0 && <p className="text-gray-500 italic col-span-2">Aucune règle enregistrée.</p>}
            {existingRules.map(r => (
              <Card key={r.id} className="p-4 flex flex-col justify-between shadow-md border border-gray-200 rounded-xl bg-white">
                <div className="space-y-2">
                  <p className="font-semibold text-blue-700">{r.service.toUpperCase()} — {r.indefinite ? 'Indéfini' : `${r.start_date} → ${r.end_date || '-'}`}</p>
                  <ul className="space-y-1">
                    {r.options.map((o, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <span className="font-medium">{o.label}</span>
                        <span className="text-gray-500 text-sm">(Résidence {o.value})</span>
                        {o.admin_only && <Lock className="w-4 h-4 text-yellow-600" />}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="destructive" onClick={() => handleDeleteRule(r.id)} className="mt-4 self-end">❌ Supprimer</Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

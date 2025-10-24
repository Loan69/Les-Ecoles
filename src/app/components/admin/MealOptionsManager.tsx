'use client'
import { useEffect, useState } from 'react'
import { Button} from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input' 
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SelectContent } from '@/components/ui/select'
import { SelectItem } from '@/components/ui/select'
import { SelectTrigger } from '@/components/ui/select'
import { SelectValue } from '@/components/ui/select'

export default function MealOptionsManager() {
    const [service, setService] = useState<'midi' | 'soir'>('midi')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [indefinite, setIndefinite] = useState(false)
    const [options, setOptions] = useState<string[]>([])
    const [adminOnly, setAdminOnly] = useState<string[]>([])
    const [existingRules, setExistingRules] = useState<any[]>([])

    // Chargement des règles définies
    const loadRules = async () => {
        const res = await fetch('/api/admin/meals')
        const data = await res.json()
        setExistingRules(data.data || [])
    }

    useEffect(() => { loadRules() }, [])

    // Ajouter une règle définie
    const save = async () => {
        // Vérification des champs requis
        if (!startDate) {
            alert("Veuillez sélectionner une date de début");
            return;
        }
        if (!service) {
            alert("Veuillez sélectionner un service (déjeuner ou dîner)");
            return;
        }
        if (!options || options.length === 0) {
            alert("Veuillez sélectionner au moins une option de repas");
            return;
        }
        // Vérifie qu'on a soit une date de fin, soit indéfini coché
        if (!indefinite && !endDate) {
            alert("Veuillez sélectionner une date de fin ou cocher 'indéfini'");
            return;
        }

        const payload = {
        start_date: startDate,
        end_date: indefinite ? null : endDate,
        indefinite,
        service,
        options,
        admin_only: adminOnly,
        }
        const res = await fetch('/api/admin/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        })
        const result = await res.json()
        if (res.ok) {
        loadRules()
        } else {
        console.error(result.error || 'Erreur lors de la sauvegarde')
        }
    }

    // Supprimer une règle définie
    const handleDeleteRule = async (id: number) => {
        if (!confirm("Voulez-vous vraiment supprimer cette règle ?")) return;
      
        const res = await fetch(`/api/admin/meals/${id}`, {
          method: "DELETE",
        });
      
        const result = await res.json();
        if (res.ok) {
          loadRules(); // recharge la liste
        } else {
          alert(result.error || "Erreur lors de la suppression");
        }
      }
      

    return (
        <Card className="max-w-3xl mx-auto p-6 space-y-6">
            <h2 className="text-xl font-semibold">🍽️ Gestion des repas</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label>Date de début</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <Label>Date de fin</Label>
                    <Input type="date" value={endDate} disabled={indefinite} onChange={e => setEndDate(e.target.value)} />
                    <div className="flex items-center gap-2 mt-1">
                        <input type="checkbox" checked={indefinite} onChange={e => setIndefinite(e.target.checked)} />
                        <span>Valable indéfiniment</span>
                    </div>
                </div>
                <div>
                    <Label>Service</Label>
                    <Select value={service} onValueChange={v => setService(v as 'midi' | 'soir')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="midi">Midi</SelectItem>
                    <SelectItem value="soir">Soir</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
            </div>
                
            <div className="space-y-3">
                <Label>Options disponibles</Label>
                {options.map((opt, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <Input value={opt} onChange={e => {
                        const newOpts = [...options]; newOpts[i] = e.target.value; setOptions(newOpts);
                        }} />
                        <div className="flex gap-2">
                            <Button 
                                variant={adminOnly.includes(opt) ? 'secondary' : 'outline'}
                                onClick={() => setAdminOnly(adminOnly.includes(opt)
                                ? adminOnly.filter(o => o !== opt)
                                : [...adminOnly, opt])}>
                                {adminOnly.includes(opt) ? '🔒 Admin only' : '👁️ Public'}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => setOptions(options.filter((_, j) => j !== i))}>🗑
                            </Button>
                        </div>
                    </div>
                ))}
                <Button variant="outline" onClick={() => setOptions([...options, 'Nouvelle option'])}>➕ Ajouter</Button>
            </div>
            
            <Button className="w-full bg-blue-100 cursor-pointer px-2 py-2" onClick={save}>💾 Enregistrer la règle</Button>
            
            <div className="mt-8">
                <h3 className="font-semibold mb-2">📋 Règles existantes</h3>
                <div className="space-y-2">
                    {existingRules.length === 0 && <p className="text-gray-500">Aucune règle enregistrée.</p>}
                    {existingRules.map(r => (
                        <div key={r.id} className="flex justify-between items-center p-2 border rounded-lg bg-white shadow-sm">
                            <div>
                                <p><b>{r.service.toUpperCase()}</b> — {r.indefinite ? 'Indéfini' : `${r.start_date} → ${r.end_date || '-'}`}</p>
                                <p className="text-sm">Options : {r.options.join(', ')}</p>
                                {r.admin_only.length > 0 && <p className="text-sm text-amber-700">Admin only : {r.admin_only.join(', ')}</p>}
                            </div>
                            <button
                                onClick={() => handleDeleteRule(r.id)}
                                className="text-red-600 hover:text-red-800 font-bold text-xl cursor-pointer bg-red-100 px-2 py-2"
                                title="Supprimer cette règle"
                            >
                                ❌
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    )
}
'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/app/providers'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Setting = {
  key: string
  value: string
  label: string
}

export default function AdminSettingsManager() {
    const { supabase } = useSupabase();
    const [settings, setSettings] = useState<Setting[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    // Charger les paramètres
    useEffect(() => {
        const loadSettings = async () => {
        const { data, error } = await supabase
            .from('app_settings')
            .select('key, value, label')
        if (error) console.error(error)
        else setSettings(data || [])
        setLoading(false)
        }
        loadSettings()
    }, [supabase])

    const updateSettingValue = (key: string, newValue: string) => {
        setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value: newValue } : s))
        )
    }

    const saveSettings = async () => {
        setSaving(true)
        setMessage(null)
        try {
          const { error } = await supabase
            .from('app_settings')
            .upsert(settings, { onConflict: 'key' }) // settings est un tableau d'objets
          if (error) throw error
          setMessage('✅ Paramètres sauvegardés avec succès')
        } catch (e: unknown) {
          if (e instanceof Error) {
            setMessage('❌ Erreur : ' + e.message)
          } else {
            setMessage('❌ Erreur inconnue')
          }
        } finally {
          setSaving(false)
        }
      }      

    if (loading) return <p>Chargement des paramètres...</p>

    return (
        <div className="space-y-6">
        <h2 className="text-xl font-semibold">⚙️ Paramètres généraux</h2>

        <div className="grid gap-4 sm:grid-cols-2">
            {settings.map((s) => (
            <div key={s.key} className="p-4 border rounded-lg shadow-sm bg-white">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                {s.label}
                </label>
                {s.key === "verrouillage_weekend" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.value === 'true'}
                      onChange={(e) => updateSettingValue(s.key, e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Activer le verrouillage anticipé
                    </span>
                  </label>
                ) : (
                <input
                  type="time"
                  value={s.value}
                  onChange={(e) => updateSettingValue(s.key, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />)}
              {s.key === 'verrouillage_weekend' && (
              <p className="text-xs text-gray-500 mt-2">
                Si activé, les repas du samedi et dimanche seront verrouillés dès le vendredi à l'heure de verrouillage normale
              </p>
            )}
            </div>
            ))}
        </div>

        <div className="flex items-center justify-end">
            <Button
            onClick={saveSettings}
            disabled={saving}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
            >
            <Save size={18} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
            </Button>
        </div>

        {message && (
            <p
            className={`text-sm mt-2 ${
                message.startsWith('✅') ? 'text-green-600' : 'text-red-600'
            }`}
            >
            {message}
            </p>
        )}
        </div>
    )
}

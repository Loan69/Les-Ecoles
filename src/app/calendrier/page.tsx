'use client'

import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Event = {
  date: string
  title: string
  foyer: number
  color: string
  description?: string
  type?: 'switch' | 'check'
}

const events: Event[] = [
  { date: '2025-08-02', title: "Anniversaire d’Agathe !", foyer: 36, color: 'bg-pink-500', type: 'switch', description: '(n°36 à 18h)' },
  { date: '2025-08-02', title: 'Lingerie : Descendre Draps avant 8h', foyer: 12, color: 'bg-blue-600', type: 'check' },
  { date: '2025-08-08', title: 'Soirée jeux', foyer: 12, color: 'bg-yellow-400' },
  { date: '2025-08-17', title: 'Sortie pique-nique', foyer: 36, color: 'bg-red-500' },
  { date: '2025-08-24', title: 'Réunion mensuelle', foyer: 12, color: 'bg-purple-500' },
]

export default function CalendrierPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2025, 7, 2)) // Août 2025
  const formattedDate = format(selectedDate, 'd MMMM yyyy', { locale: fr })

  const eventsOfDay = events.filter(
    (event) => event.date === format(selectedDate, 'yyyy-MM-dd')
  )

  return (
    <main className="min-h-screen flex flex-col items-center bg-white px-4 pt-6 text-blue-900">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <img src="/logo.png" alt="Logo des écoles" className="h-16" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        <button className="border border-blue-400 rounded-xl px-4 py-2 flex items-center gap-2 text-sm">
          <span>👁️</span> Vue
        </button>
        <button className="border border-blue-400 rounded-xl px-4 py-2 flex items-center gap-2 text-sm">
          📅 Évènements
        </button>
        <button className="border border-blue-400 rounded-xl px-4 py-2 flex items-center gap-2 text-sm">
          🏠 12
        </button>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-2xl shadow p-4 w-full max-w-md">
        <Calendar
          locale="fr"
          onChange={(value) => setSelectedDate(value as Date)}
          value={selectedDate}
          prevLabel={<ChevronLeft className="w-4 h-4 text-blue-900" />}
          nextLabel={<ChevronRight className="w-4 h-4 text-blue-900" />}
          tileContent={({ date }) => {
            const dayEvents = events.filter(
              (e) => e.date === format(date, 'yyyy-MM-dd')
            )
            return (
              <div className="flex justify-center mt-1">
                {dayEvents.map((e, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${e.color} mx-0.5`}
                  />
                ))}
              </div>
            )
          }}
        />
      </div>

      {/* Évènements du jour */}
      <div className="w-full max-w-md mt-6">
        <h3 className="text-base font-semibold mb-3">
          Évènements du jour :{' '}
          <span className="font-normal">{formattedDate}</span>
        </h3>

        <div className="space-y-2">
          {eventsOfDay.length === 0 && (
            <p className="text-gray-400 text-sm">Aucun évènement prévu.</p>
          )}

          {eventsOfDay.map((event, index) => (
            <div
              key={index}
              className="flex items-center justify-between border rounded-xl p-3"
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${event.color}`} />
                <p className="text-sm">
                  <strong>{event.title}</strong>{' '}
                  {event.description && <span>{event.description}</span>}
                </p>
              </div>

              {event.type === 'switch' && (
                <div className="w-10 h-5 bg-green-200 rounded-full relative">
                  <div className="absolute top-0.5 left-5 w-4 h-4 bg-green-600 rounded-full transition" />
                </div>
              )}

              {event.type === 'check' && (
                <div className="w-5 h-5 border border-green-600 rounded flex items-center justify-center">
                  <span className="text-green-600 text-xs">✔</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

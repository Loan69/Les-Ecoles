import { Option } from "./Option"

export interface Rule {
  id: number
  start_date: string
  end_date: string | null
  indefinite: boolean
  service: 'dejeuner' | 'diner'
  options: Option[]
  created_at: string
  created_by: string
  conflict?: boolean
  active?: boolean
  updated_at?: string | null
  updated_by?: string | null
}
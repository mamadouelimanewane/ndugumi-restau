import { StateStorage } from 'zustand/middleware'

const isConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL)

export const supabaseStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!isConfigured) {
      return localStorage.getItem(name)
    }

    try {
      const res = await fetch(`/api/state?id=${encodeURIComponent(name)}`)
      if (!res.ok) {
        console.error('Erreur API state getItem', res.status)
        return localStorage.getItem(name) // fallback
      }
      const { data } = await res.json()
      return data ? JSON.stringify(data) : localStorage.getItem(name)
    } catch (e) {
      console.error(e)
      return localStorage.getItem(name)
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    if (!isConfigured) {
      localStorage.setItem(name, value)
      return
    }

    try {
      const parsed = JSON.parse(value)
      const res = await fetch(`/api/state?id=${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed }),
      })
      if (!res.ok) {
        console.error('Erreur API state setItem', res.status)
        localStorage.setItem(name, value) // fallback local backup
      }
    } catch (e) {
      console.error(e)
      localStorage.setItem(name, value)
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (!isConfigured) {
      localStorage.removeItem(name)
      return
    }

    try {
      const res = await fetch(`/api/state?id=${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!res.ok) console.error('Erreur API state removeItem', res.status)
    } catch (e) {
      console.error(e)
    }
    localStorage.removeItem(name)
  }
}

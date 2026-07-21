import { StateStorage } from 'zustand/middleware'
import { supabase } from './supabase'

export const supabaseStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!import.meta.env.VITE_SUPABASE_URL) {
      return localStorage.getItem(name)
    }
    
    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', name)
        .single()
        
      if (error) {
        if (error.code === 'PGRST116') {
           // Not found, maybe it's the first run. Let's try to recover from localStorage
           const local = localStorage.getItem(name)
           return local
        }
        console.error('Erreur Supabase getItem', error)
        return localStorage.getItem(name) // fallback
      }
      return data?.data ? JSON.stringify(data.data) : null
    } catch (e) {
      console.error(e)
      return localStorage.getItem(name)
    }
  },
  
  setItem: async (name: string, value: string): Promise<void> => {
    if (!import.meta.env.VITE_SUPABASE_URL) {
      localStorage.setItem(name, value)
      return
    }

    try {
      const parsed = JSON.parse(value)
      const { error } = await supabase
        .from('app_state')
        .upsert({ id: name, data: parsed, updated_at: new Date().toISOString() })
        
      if (error) {
        console.error('Erreur Supabase setItem', error)
        localStorage.setItem(name, value) // fallback local backup
      }
    } catch (e) {
      console.error(e)
      localStorage.setItem(name, value)
    }
  },
  
  removeItem: async (name: string): Promise<void> => {
    if (!import.meta.env.VITE_SUPABASE_URL) {
      localStorage.removeItem(name)
      return
    }

    try {
      const { error } = await supabase.from('app_state').delete().eq('id', name)
      if (error) console.error('Erreur Supabase removeItem', error)
    } catch (e) {
      console.error(e)
    }
    localStorage.removeItem(name)
  }
}

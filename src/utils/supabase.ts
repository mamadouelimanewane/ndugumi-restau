import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://rqbjnmvhlntzbjmhlnji.supabase.co'
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxYmpubXZobG50emJqbWhsbmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjQ0OTcsImV4cCI6MjEwMDI0MDQ5N30.lc5PCJUpCPDabYM54psOeoNo2FRamAz1ZuAt6qPgZn4'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

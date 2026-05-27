import { supabase } from '@/integrations/supabase/client'
import { getCurrentUser } from '@/lib/auth'
import { normalizeToDatabaseDate } from '@/lib/dates'
import { extractLeaveDatesFromRosterText } from '@/lib/rosterParse'

export type LeaveDay = {
  id: string
  staff_id: string
  date: string // ISO date (YYYY-MM-DD)
  created_at: string
}

export const getMyLeaveDays = async (): Promise<LeaveDay[]> => {
  const user = await getCurrentUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('leave_days')
    .select('*')
    .eq('staff_id', user.id)
    .order('date', { ascending: true })
  if (error) {
    console.error('Error fetching leave days:', error, { staffId: user.id })
    return []
  }
  return (data || []).map((row) => ({
    ...row,
    date: normalizeToDatabaseDate(String(row.date)),
  }))
}

export const addLeaveDay = async (
  dateIso: string
): Promise<{ ok: boolean; error?: string }> => {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Not signed in' }
  const date = normalizeToDatabaseDate(dateIso)
  const { error } = await supabase.from('leave_days').insert({ staff_id: user.id, date })
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { ok: true }
    }
    console.error('Error adding leave day:', error, { date, staffId: user.id })
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export const removeLeaveDay = async (
  dateIso: string
): Promise<{ ok: boolean; error?: string }> => {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Not signed in' }
  const date = normalizeToDatabaseDate(dateIso)
  const { error } = await supabase
    .from('leave_days')
    .delete()
    .eq('staff_id', user.id)
    .eq('date', date)
  if (error) {
    console.error('Error removing leave day:', error, { date, staffId: user.id })
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export const parseLeaveDaysFromText = (text: string): string[] => {
  return extractLeaveDatesFromRosterText(text)
}

export const replaceAllLeaveDaysForUser = async (
  staffId: string,
  leaveDatesIso: string[]
): Promise<{ deletedCount: number; insertedCount: number }> => {
  const normalizedDates = Array.from(
    new Set(leaveDatesIso.map((d) => normalizeToDatabaseDate(d)))
  )

  const { count, error: countError } = await supabase
    .from('leave_days')
    .select('*', { count: 'exact', head: true })
    .eq('staff_id', staffId)

  if (countError) throw countError

  const { error: deleteError } = await supabase
    .from('leave_days')
    .delete()
    .eq('staff_id', staffId)

  if (deleteError) throw deleteError

  if (normalizedDates.length === 0) {
    return { deletedCount: count || 0, insertedCount: 0 }
  }

  const rows = normalizedDates.map((date) => ({ staff_id: staffId, date }))
  const { error: insertError } = await supabase.from('leave_days').insert(rows)

  if (insertError) throw insertError

  return { deletedCount: count || 0, insertedCount: rows.length }
}

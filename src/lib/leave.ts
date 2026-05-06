import { supabase } from '@/integrations/supabase/client'
import { getCurrentUser } from '@/lib/auth'

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
    console.error('Error fetching leave days:', error)
    return []
  }
  return data || []
}

export const addLeaveDay = async (dateIso: string): Promise<boolean> => {
  const user = await getCurrentUser()
  if (!user) return false
  const { error } = await supabase
    .from('leave_days')
    .insert({ staff_id: user.id, date: dateIso })
  if (error) {
    // Ignore unique violation attempting to add duplicate
    if ((error as any).code !== '23505') {
      console.error('Error adding leave day:', error)
      return false
    }
  }
  return true
}

export const removeLeaveDay = async (dateIso: string): Promise<boolean> => {
  const user = await getCurrentUser()
  if (!user) return false
  const { error } = await supabase
    .from('leave_days')
    .delete()
    .eq('staff_id', user.id)
    .eq('date', dateIso)
  if (error) {
    console.error('Error removing leave day:', error)
    return false
  }
  return true
}

export const parseLeaveDaysFromText = (text: string): string[] => {
  const leaveDates: string[] = []
  const currentYear = new Date().getFullYear()
  const monthMap: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  }

  const coalescedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\u00A0/g, ' ')

  const lines = coalescedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  const parseRosterYear = (yearStr: string): number | null => {
    const parsed = parseInt(yearStr, 10)
    if (Number.isNaN(parsed)) return null

    const year = yearStr.length === 2 ? 2000 + parsed : parsed
    if (year < currentYear - 1 || year > currentYear + 2) return null
    return year
  }

  for (const line of lines) {
    const descriptorMatch = line.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})\s*-\s*(.+)$/i)
    if (!descriptorMatch) continue

    const [, dayStr, monthStr, yearStr, descriptor] = descriptorMatch
    if (!/LV\s*LEAVE/i.test(descriptor)) continue

    const month = monthMap[monthStr.toLowerCase()]
    const year = parseRosterYear(yearStr)
    const day = parseInt(dayStr, 10)
    if (!month || !year || Number.isNaN(day)) continue

    const dbDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    leaveDates.push(dbDate)
  }

  return Array.from(new Set(leaveDates))
}

export const replaceAllLeaveDaysForUser = async (staffId: string, leaveDatesIso: string[]): Promise<{ deletedCount: number; insertedCount: number }> => {
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

  if (leaveDatesIso.length === 0) {
    return { deletedCount: count || 0, insertedCount: 0 }
  }

  const rows = leaveDatesIso.map((date) => ({ staff_id: staffId, date }))
  const { error: insertError } = await supabase
    .from('leave_days')
    .insert(rows)

  if (insertError) throw insertError

  return { deletedCount: count || 0, insertedCount: rows.length }
}




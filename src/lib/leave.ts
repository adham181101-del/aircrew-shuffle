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



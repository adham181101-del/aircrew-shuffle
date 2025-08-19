import { supabase } from '@/integrations/supabase/client'

export type Shift = {
  id: string
  date: string
  time: string
  staff_id: string
  is_swapped: boolean
  created_at: string
}

export type SwapRequest = {
  id: string
  requester_id: string
  requester_shift_id: string
  repay_date: string | null
  accepter_id: string | null
  accepter_shift_id: string | null
  status: 'pending' | 'accepted' | 'declined' | 'canceled'
  message: string | null
  created_at: string
}

export const isValidTimeRange = (timeRange: string): boolean => {
  const pattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/
  return pattern.test(timeRange)
}

export const isMorningShift = (timeRange: string): boolean => {
  return timeRange.startsWith('04:15')
}

export const isAfternoonShift = (timeRange: string): boolean => {
  return timeRange.startsWith('13:15')
}

export const isEveningShift = (timeRange: string): boolean => {
  return timeRange.startsWith('21:15') || timeRange.startsWith('19:')
}

export const isValidDouble = (shift1Time: string, shift2Time: string): boolean => {
  return (isMorningShift(shift1Time) && isAfternoonShift(shift2Time)) ||
         (isAfternoonShift(shift1Time) && isMorningShift(shift2Time))
}

export const getShiftTimeOfDay = (timeRange: string): 'morning' | 'afternoon' | 'evening' | 'other' => {
  if (isMorningShift(timeRange)) return 'morning'
  if (isAfternoonShift(timeRange)) return 'afternoon'
  if (isEveningShift(timeRange)) return 'evening'
  return 'other'
}

export const hasShiftOnDate = async (staffId: string, date: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('id')
    .eq('staff_id', staffId)
    .eq('date', date)
    .single()

  if (error && error.code === 'PGRST116') return false // No rows returned
  if (error) throw error
  
  return !!data
}

export const getShiftOnDate = async (staffId: string, date: string): Promise<Shift | null> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('staff_id', staffId)
    .eq('date', date)
    .single()

  if (error && error.code === 'PGRST116') return null
  if (error) throw error
  
  return data
}

export const canCover = async (staffId: string, date: string, canWorkDoubles: boolean): Promise<boolean> => {
  const hasShift = await hasShiftOnDate(staffId, date)
  return !hasShift || canWorkDoubles
}

export const isEligibleRepayForRequester = async (
  requesterId: string, 
  offeredShift: Shift,
  requesterCanWorkDoubles: boolean
): Promise<boolean> => {
  const requesterShift = await getShiftOnDate(requesterId, offeredShift.date)
  
  if (!requesterShift) return true // Requester is OFF that day
  
  if (requesterCanWorkDoubles && isValidDouble(requesterShift.time, offeredShift.time)) {
    return true
  }
  
  return false
}

export const createShift = async (date: string, time: string, staffId: string): Promise<Shift> => {
  if (!isValidTimeRange(time)) {
    throw new Error('Invalid time format. Use HH:MM-HH:MM')
  }

  const { data, error } = await supabase
    .from('shifts')
    .insert({
      date,
      time,
      staff_id: staffId
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const getUserShifts = async (staffId: string): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('staff_id', staffId)
    .order('date', { ascending: true })

  if (error) throw error
  return data || []
}

export const deleteShift = async (shiftId: string, staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId)
    .eq('staff_id', staffId)

  if (error) throw error
}

// Parse PDF content to extract shifts (client-side parsing)
export const parseShiftsFromText = (text: string): Array<{date: string, time: string}> => {
  const shifts: Array<{date: string, time: string}> = []
  const seenDates = new Set<string>()
  
  // Date summary pattern: DD-Mon-YYYY - HH:MM - HH:MM
  const datePattern = /^\s*(\d{2})-([A-Za-z]{3})-(\d{4})\s*-\s*(?:(OFF|LV\s+LEAVE)|(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}))/gim
  
  const monthMap: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  }
  
  const lines = text.split('\n')
  
  for (const line of lines) {
    const match = datePattern.exec(line)
    if (match) {
      const [, day, month, year, offOrLeave, startTime, endTime] = match
      
      // Skip OFF days and LEAVE
      if (offOrLeave) continue
      
      // Skip 00:00-00:00 shifts
      if (startTime === '00:00' && endTime === '00:00') continue
      
      if (startTime && endTime) {
        try {
          const monthNum = monthMap[month.toLowerCase()]
          if (!monthNum) continue
          
          const date = new Date(parseInt(year), monthNum - 1, parseInt(day))
          const isoDate = date.toISOString().split('T')[0]
          
          if (!seenDates.has(isoDate)) {
            seenDates.add(isoDate)
            shifts.push({
              date: isoDate,
              time: `${startTime}-${endTime}`
            })
          }
        } catch (e) {
          console.warn('Failed to parse date:', match[0])
        }
      }
    }
    // Reset lastIndex for global regex
    datePattern.lastIndex = 0
  }
  
  return shifts
}
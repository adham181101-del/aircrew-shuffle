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

const getStartMinutesFromRange = (timeRange: string): number | null => {
  const start = timeRange.split('-')[0]
  const match = start.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  return hours * 60 + minutes
}

export const isMorningShift = (timeRange: string): boolean => {
  const minutes = getStartMinutesFromRange(timeRange)
  if (minutes === null) return false
  // Morning shifts roughly from 04:00 to 11:59 (covers 04:15, 05:30, 06:30, etc.)
  return minutes >= 4 * 60 && minutes < 12 * 60
}

export const isAfternoonShift = (timeRange: string): boolean => {
  const minutes = getStartMinutesFromRange(timeRange)
  if (minutes === null) return false
  // Afternoon shifts from 12:00 to 16:59 (covers 12:30, 13:15)
  return minutes >= 12 * 60 && minutes < 17 * 60
}

export const isEveningShift = (timeRange: string): boolean => {
  const minutes = getStartMinutesFromRange(timeRange)
  if (minutes === null) return false
  // Evening shifts from 17:00 onward (covers 19:00, 21:30, etc.)
  return minutes >= 17 * 60
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
  console.log('Fetching shifts for staff ID:', staffId)
  
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('staff_id', staffId)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching user shifts:', error)
    throw error
  }
  
  console.log('Fetched shifts:', data?.length || 0, 'shifts')
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

export const updateShiftTime = async (
  shiftId: string,
  staffId: string,
  time: string
): Promise<Shift> => {
  if (!isValidTimeRange(time)) {
    throw new Error('Invalid time format. Use HH:MM-HH:MM')
  }

  const { data, error } = await supabase
    .from('shifts')
    .update({ time })
    .eq('id', shiftId)
    .eq('staff_id', staffId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Parse PDF content to extract shifts
export const parseShiftsFromText = (text: string): Array<{date: string, time: string}> => {
  const shifts: Array<{date: string, time: string}> = []
  const seenDates = new Set<string>()

  // Accept any time range as HH:MM-HH:MM, we will later validate on insert
  const timeRangeRegex = /(\d{2}:\d{2})\s*(?:-|to|–|—)\s*(\d{2}:\d{2})/i

  const monthMap: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  }

  const coalescedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\u00A0/g, ' ')

  console.log('Parsing text (first 400 chars):', coalescedText.substring(0, 400) + '...')

  const lines = coalescedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Identify a date summary row, including OFF or descriptors like NA SHADOW
    const dateSummary = line.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})(?:\s*-\s*([^,|]+))?/)
    if (dateSummary) {
      const [, dayStr, monthStr, yearStr, descriptor] = dateSummary
      if (descriptor && /\bOFF\b/i.test(descriptor)) {
        continue
      }

      const month = monthMap[monthStr.toLowerCase()]
      if (!month) continue
      const year = parseInt(yearStr.length === 2 ? '20' + yearStr : yearStr)
      const day = parseInt(dayStr)
      const isoDate = new Date(year, month - 1, day).toISOString().split('T')[0]

      // Look ahead for plausible start/end times in this row or subsequent rows.
      // Collect multiple ranges if present and choose the first non-00:00 and non-identical times.
      const candidateRanges: string[] = []

      // Inline times on same line
      const inlineTimes = line.match(/(\d{2}:\d{2})[^\d]+(\d{2}:\d{2})/)
      if (inlineTimes) {
        candidateRanges.push(`${inlineTimes[1]}-${inlineTimes[2]}`)
      }

      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const next = lines[j]
        // Stop scanning at next date header or empty separator
        if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}/.test(next)) break
        if (/\bOFF\b/i.test(next)) break
        const t = next.match(timeRangeRegex)
        if (t) {
          candidateRanges.push(`${t[1]}-${t[2]}`)
        }
      }

      const picked = candidateRanges.find(r => {
        const [s, e] = r.split('-')
        return s !== '00:00' && e !== '00:00' && s !== e
      }) || candidateRanges[0]

      if (picked && isValidTimeRange(picked) && !seenDates.has(isoDate)) {
        seenDates.add(isoDate)
        shifts.push({ date: isoDate, time: picked })
      }
      continue
    }

    // Pattern A: Inline date and times, e.g. "20-Aug-2025 - 05:30 - 14:30"
    const inlineDateMatch = line.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4}).*?(\d{2}:\d{2}).*?(\d{2}:\d{2})/)
    if (inlineDateMatch) {
      try {
        const [, dayStr, monthStr, yearStr, startTime, endTime] = inlineDateMatch
        const month = monthMap[monthStr.toLowerCase()]
        if (!month) continue
        const year = parseInt(yearStr.length === 2 ? '20' + yearStr : yearStr)
        const day = parseInt(dayStr)
        const isoDate = new Date(year, month - 1, day).toISOString().split('T')[0]
        if (!seenDates.has(isoDate)) {
          const timeRange = `${startTime}-${endTime}`
          if (isValidTimeRange(timeRange)) {
            seenDates.add(isoDate)
            shifts.push({ date: isoDate, time: timeRange })
          }
        }
      } catch {}
      continue
    }

    // Pattern B: Date line followed by time(s) next lines (within next 5 lines)
    const dateOnlyMatch = line.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/)
    if (dateOnlyMatch) {
      const [, dayStr, monthStr, yearStr] = dateOnlyMatch
      const month = monthMap[monthStr.toLowerCase()]
      if (!month) continue
      const year = parseInt(yearStr.length === 2 ? '20' + yearStr : yearStr)
      const day = parseInt(dayStr)
      const isoDate = new Date(year, month - 1, day).toISOString().split('T')[0]

      // lookahead for time range
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const next = lines[j]
        if (/\bOFF\b/i.test(next)) break
        const t = next.match(timeRangeRegex)
        if (t) {
          const [, startTime, endTime] = t
          const timeRange = `${startTime}-${endTime}`
          if (isValidTimeRange(timeRange) && !seenDates.has(isoDate)) {
            seenDates.add(isoDate)
            shifts.push({ date: isoDate, time: timeRange })
          }
          break
        }
      }
      continue
    }
  }

  console.log('Total valid shifts found:', shifts.length)
  return shifts
}
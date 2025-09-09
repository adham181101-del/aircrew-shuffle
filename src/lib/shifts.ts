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
  // Morning shifts: 04:15, 05:30, 05:40, etc. (04:00 to 11:59)
  return minutes >= 4 * 60 && minutes < 12 * 60
}

export const isAfternoonShift = (timeRange: string): boolean => {
  const minutes = getStartMinutesFromRange(timeRange)
  if (minutes === null) return false
  // Afternoon shifts: 12:30, 13:15, etc. (12:00 to 23:59)
  return minutes >= 12 * 60 && minutes < 24 * 60
}

export const isNightShift = (timeRange: string): boolean => {
  const minutes = getStartMinutesFromRange(timeRange)
  if (minutes === null) return false
  // Night shifts: after 23:59 (00:00 to 03:59)
  return minutes >= 0 && minutes < 4 * 60
}

export const isValidDouble = (shift1Time: string, shift2Time: string): boolean => {
  return (isMorningShift(shift1Time) && isAfternoonShift(shift2Time)) ||
         (isAfternoonShift(shift1Time) && isMorningShift(shift2Time))
}

export const getShiftTimeOfDay = (timeRange: string): 'morning' | 'afternoon' | 'night' | 'other' => {
  if (isMorningShift(timeRange)) return 'morning'
  if (isAfternoonShift(timeRange)) return 'afternoon'
  if (isNightShift(timeRange)) return 'night'
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

export const upsertShift = async (date: string, time: string, staffId: string): Promise<{ action: 'created' | 'updated' | 'skipped'; shift?: Shift }> => {
  if (!isValidTimeRange(time)) {
    throw new Error('Invalid time format. Use HH:MM-HH:MM')
  }

  // Check if a shift already exists for this date
  const { data: existingShift, error: fetchError } = await supabase
    .from('shifts')
    .select('*')
    .eq('staff_id', staffId)
    .eq('date', date)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (!existingShift) {
    // No existing shift, create new one
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
    return { action: 'created', shift: data }
  } else {
    // Shift exists, check if it's different
    if (existingShift.time === time) {
      // Same time, skip
      return { action: 'skipped', shift: existingShift }
    } else {
      // Different time, update
      const { data, error } = await supabase
        .from('shifts')
        .update({ time })
        .eq('id', existingShift.id)
        .select()
        .single()

      if (error) throw error
      return { action: 'updated', shift: data }
    }
  }
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

export const deleteAllShifts = async (staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('staff_id', staffId)

  if (error) throw error
}

// Function to execute a shift swap when a swap request is accepted
export const executeShiftSwap = async (swapRequest: any): Promise<void> => {
  console.log('=== EXECUTING SHIFT SWAP ===');
  console.log('Swap request:', swapRequest);
  
  try {
    // Use the secure database function to execute the shift swap
    const { data, error } = await supabase.rpc('execute_shift_swap', {
      swap_request_id: swapRequest.id,
      requester_shift_id: swapRequest.requester_shift_id,
      accepter_id: swapRequest.accepter_id,
      counter_offer_date: swapRequest.counter_offer_date || null,
      accepter_shift_id: swapRequest.accepter_shift_id || null
    });

    if (error) {
      console.error('Error executing shift swap via RPC:', error);
      throw error;
    }

    if (!data.success) {
      console.error('Shift swap failed:', data.error);
      throw new Error(data.error || 'Shift swap failed');
    }

    console.log('Shift swap executed successfully:', data);
  } catch (error) {
    console.error('Error executing shift swap:', error);
    throw error;
  }
}

// Working Hours Limitations (WHL) validation functions
export interface WHLValidationResult {
  isValid: boolean
  violations: string[]
}

// Calculate shift hours from time range
const calculateShiftHours = (timeRange: string): number => {
  const [start, end] = timeRange.split('-')
  const startTime = new Date(`2000-01-01 ${start}:00`)
  const endTime = new Date(`2000-01-01 ${end}:00`)
  
  // Handle overnight shifts
  if (endTime < startTime) {
    endTime.setDate(endTime.getDate() + 1)
  }
  
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
}

// Get shifts within a date range
const getShiftsInRange = (shifts: Shift[], startDate: string, endDate: string): Shift[] => {
  return shifts.filter(shift => {
    // Convert UK format (DD/MM/YYYY) to Date object
    const parseUKDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split('/')
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    
    const shiftDate = parseUKDate(shift.date)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return shiftDate >= start && shiftDate <= end
  })
}

// Check 28-day period (256 hours max)
const check28DayLimit = (shifts: Shift[], targetDate: string): { isValid: boolean; hours: number } => {
  // Convert UK format (DD/MM/YYYY) to Date object
  const parseUKDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }
  
  const target = parseUKDate(targetDate)
  const startDate = new Date(target)
  startDate.setDate(target.getDate() - 27) // 28-day period
  
  const periodShifts = getShiftsInRange(shifts, startDate.toISOString().split('T')[0], targetDate)
  const totalHours = periodShifts.reduce((sum, shift) => sum + calculateShiftHours(shift.time), 0)
  
  return { isValid: totalHours <= 256, hours: totalHours }
}

// Check 24-hour period (16 hours max)
const check24HourLimit = (shifts: Shift[], targetDate: string): { isValid: boolean; hours: number } => {
  // Convert UK format (DD/MM/YYYY) to Date object
  const parseUKDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }
  
  const target = parseUKDate(targetDate)
  const startDate = new Date(target)
  startDate.setDate(target.getDate() - 1) // 24-hour period
  
  const periodShifts = getShiftsInRange(shifts, startDate.toISOString().split('T')[0], targetDate)
  const totalHours = periodShifts.reduce((sum, shift) => sum + calculateShiftHours(shift.time), 0)
  
  return { isValid: totalHours <= 16, hours: totalHours }
}

// Check consecutive days (max 9 days)
const checkConsecutiveDays = (shifts: Shift[], targetDate: string): { isValid: boolean; days: number } => {
  // Convert UK format (DD/MM/YYYY) to Date object
  const parseUKDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }
  
  const target = parseUKDate(targetDate)
  let consecutiveDays = 0
  const currentDate = new Date(target)
  
  // Count backwards to find consecutive working days
  while (true) {
    // Convert to UK format for comparison
    const dateStr = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`
    const hasShift = shifts.some(shift => shift.date === dateStr)
    
    if (hasShift) {
      consecutiveDays++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }
  
  return { isValid: consecutiveDays <= 9, days: consecutiveDays }
}

// Check 14-day period (at least 2 consecutive days off)
const check14DayBreak = (shifts: Shift[], targetDate: string): { isValid: boolean; hasBreak: boolean } => {
  // Convert UK format (DD/MM/YYYY) to Date object
  const parseUKDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }
  
  const target = parseUKDate(targetDate)
  const startDate = new Date(target)
  startDate.setDate(target.getDate() - 13) // 14-day period
  
  const periodShifts = getShiftsInRange(shifts, startDate.toISOString().split('T')[0], targetDate)
  const workingDates = new Set(periodShifts.map(shift => shift.date))
  
  // Check for at least 2 consecutive days off
  let hasConsecutiveBreak = false
  for (let i = 0; i < 13; i++) {
    const checkDate = new Date(startDate)
    checkDate.setDate(startDate.getDate() + i)
    // Convert to UK format for comparison
    const dateStr = `${checkDate.getDate().toString().padStart(2, '0')}/${(checkDate.getMonth() + 1).toString().padStart(2, '0')}/${checkDate.getFullYear()}`
    
    const nextDate = new Date(checkDate)
    nextDate.setDate(checkDate.getDate() + 1)
    // Convert to UK format for comparison
    const nextDateStr = `${nextDate.getDate().toString().padStart(2, '0')}/${(nextDate.getMonth() + 1).toString().padStart(2, '0')}/${nextDate.getFullYear()}`
    
    if (!workingDates.has(dateStr) && !workingDates.has(nextDateStr)) {
      hasConsecutiveBreak = true
      break
    }
  }
  
  return { isValid: hasConsecutiveBreak, hasBreak: hasConsecutiveBreak }
}

// Check pay week (Sunday to Saturday, 72 hours max)
const checkPayWeek = (shifts: Shift[], targetDate: string): { isValid: boolean; hours: number } => {
  // Convert UK format (DD/MM/YYYY) to Date object
  const parseUKDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }
  
  const target = parseUKDate(targetDate)
  const dayOfWeek = target.getDay() // 0 = Sunday, 6 = Saturday
  
  // Find the start of the pay week (Sunday)
  const payWeekStart = new Date(target)
  payWeekStart.setDate(target.getDate() - dayOfWeek)
  
  // Find the end of the pay week (Saturday)
  const payWeekEnd = new Date(payWeekStart)
  payWeekEnd.setDate(payWeekStart.getDate() + 6)
  
  const periodShifts = getShiftsInRange(
    shifts, 
    payWeekStart.toISOString().split('T')[0], 
    payWeekEnd.toISOString().split('T')[0]
  )
  const totalHours = periodShifts.reduce((sum, shift) => sum + calculateShiftHours(shift.time), 0)
  
  return { isValid: totalHours <= 72, hours: totalHours }
}

// Main WHL validation function
export const validateWHL = async (
  staffId: string, 
  newShiftDate: string, 
  newShiftTime: string
): Promise<WHLValidationResult> => {
  const violations: string[] = []
  
  // Get all user shifts
  const allShifts = await getUserShifts(staffId)
  
  // Create a hypothetical shift for validation
  const hypotheticalShift: Shift = {
    id: 'temp',
    date: newShiftDate,
    time: newShiftTime,
    staff_id: staffId,
    is_swapped: false,
    created_at: new Date().toISOString()
  }
  
  // Add the new shift to the list for validation
  const shiftsWithNew = [...allShifts, hypotheticalShift]
  
  // Check 28-day limit
  const day28Check = check28DayLimit(shiftsWithNew, newShiftDate)
  if (!day28Check.isValid) {
    violations.push(`28-day limit exceeded: ${day28Check.hours.toFixed(1)} hours (max 256)`)
  }
  
  // Check 24-hour limit
  const day24Check = check24HourLimit(shiftsWithNew, newShiftDate)
  if (!day24Check.isValid) {
    violations.push(`24-hour limit exceeded: ${day24Check.hours.toFixed(1)} hours (max 16)`)
  }
  
  // Check consecutive days
  const consecutiveCheck = checkConsecutiveDays(shiftsWithNew, newShiftDate)
  if (!consecutiveCheck.isValid) {
    violations.push(`Consecutive days limit exceeded: ${consecutiveCheck.days} days (max 9)`)
  }
  
  // Check 14-day break
  const breakCheck = check14DayBreak(shiftsWithNew, newShiftDate)
  if (!breakCheck.isValid) {
    violations.push(`No 2 consecutive days off in 14-day period`)
  }
  
  // Check pay week limit
  const payWeekCheck = checkPayWeek(shiftsWithNew, newShiftDate)
  if (!payWeekCheck.isValid) {
    violations.push(`Pay week limit exceeded: ${payWeekCheck.hours.toFixed(1)} hours (max 72)`)
  }
  
  return {
    isValid: violations.length === 0,
    violations
  }
}

// Parse PDF content to extract shifts
export const parseShiftsFromText = (text: string): Array<{date: string, time: string}> => {
  const shifts: Array<{date: string, time: string}> = []

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

  console.log('Total lines to process:', lines.length)

  // First pass: collect all dates and extract shift times directly from Date Summary
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Look for date summary with shift times: "11-Aug-2025 - 04:15 - 13:15"
    const dateWithTimeMatch = line.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})\s*-\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/i)
    if (dateWithTimeMatch) {
      const [, dayStr, monthStr, yearStr, startTime, endTime] = dateWithTimeMatch
      console.log(`Found date with times: ${dayStr}-${monthStr}-${yearStr} ${startTime}-${endTime}`)
      const month = monthMap[monthStr.toLowerCase()]
      if (month) {
        const year = parseInt(yearStr.length === 2 ? '20' + yearStr : yearStr)
        const day = parseInt(dayStr)
        // Create date in database format (YYYY-MM-DD)
        const dbDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        
        console.log(`Processing: Day=${day}, Month=${month}, Year=${year}, DB Date=${dbDate}`)
        
        // Skip 00:00 times and same start/end times
        if (startTime !== '00:00' && endTime !== '00:00' && startTime !== endTime) {
          const timeRange = `${startTime}-${endTime}`
          if (isValidTimeRange(timeRange)) {
            shifts.push({ date: dbDate, time: timeRange })
            console.log(`✅ Added shift from Date Summary: ${dbDate} ${timeRange}`)
          } else {
            console.log(`❌ Invalid time range: ${timeRange}`)
          }
        } else {
          console.log(`❌ Skipping invalid times: ${startTime}-${endTime}`)
        }
      } else {
        console.log(`❌ Invalid month: ${monthStr}`)
      }
      continue
    }
    
    // Look for date summary with descriptors (OFF, etc.) - skip these
    const dateWithDescriptorMatch = line.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})\s*-\s*(.+)$/i)
    if (dateWithDescriptorMatch) {
      const [, dayStr, monthStr, yearStr, descriptor] = dateWithDescriptorMatch
      console.log(`Skipping date with descriptor: ${dayStr}-${monthStr}-${yearStr} - ${descriptor}`)
      continue
    }
    
    // Fallback: look for any line that might contain a date and times
    const fallbackMatch = line.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4}).*?(\d{2}:\d{2}).*?(\d{2}:\d{2})/i)
    if (fallbackMatch) {
      const [, dayStr, monthStr, yearStr, startTime, endTime] = fallbackMatch
      console.log(`Fallback match found: ${dayStr}-${monthStr}-${yearStr} ${startTime}-${endTime} in line: "${line}"`)
      const month = monthMap[monthStr.toLowerCase()]
      if (month) {
        const year = parseInt(yearStr.length === 2 ? '20' + yearStr : yearStr)
        const day = parseInt(dayStr)
        // Create date in database format (YYYY-MM-DD)
        const dbDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        
        console.log(`Fallback processing: Day=${day}, Month=${month}, Year=${year}, DB Date=${dbDate}`)
        
        // Skip 00:00 times and same start/end times
        if (startTime !== '00:00' && endTime !== '00:00' && startTime !== endTime) {
          const timeRange = `${startTime}-${endTime}`
          if (isValidTimeRange(timeRange)) {
            shifts.push({ date: dbDate, time: timeRange })
            console.log(`✅ Added shift from fallback: ${dbDate} ${timeRange}`)
          } else {
            console.log(`❌ Invalid time range: ${timeRange}`)
          }
        } else {
          console.log(`❌ Skipping invalid times: ${startTime}-${endTime}`)
        }
      } else {
        console.log(`❌ Invalid month: ${monthStr}`)
      }
    }
  }



  console.log('Total valid shifts found:', shifts.length)
  return shifts
}
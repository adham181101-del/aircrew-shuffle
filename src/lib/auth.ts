import { supabase } from '@/integrations/supabase/client'

export type Staff = {
  id: string
  email: string
  staff_number: string
  base_location: string
  can_work_doubles: boolean
  created_at: string
}

export const ALLOWED_BASES = [
  "Iberia CER",
  "BA CER", 
  "Iberia & BA CER",
  "Iberia IOL",
  "Iberia IGL",
  "Baggage For BA",
  "Drivers For BA",
] as const

export type BaseLocation = typeof ALLOWED_BASES[number]

export const validateBAEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@ba.com')
}

export const validateStaffNumber = (staffNumber: string): boolean => {
  return /^\d{4,10}$/.test(staffNumber)
}

export const signUp = async (email: string, password: string, staffNumber: string, baseLocation: BaseLocation, canWorkDoubles: boolean) => {
  if (!validateBAEmail(email)) {
    throw new Error('Please use your @ba.com email address')
  }
  
  if (!validateStaffNumber(staffNumber)) {
    throw new Error('Staff number must be 4-10 digits')
  }

  // Check if staff number already exists
  const { data: existingStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('staff_number', staffNumber)
    .maybeSingle()

  if (existingStaff) {
    throw new Error('Staff number already registered')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: {
        staff_number: staffNumber,
        base_location: baseLocation,
        can_work_doubles: canWorkDoubles
      }
    }
  })

  if (error) throw error

  // Staff profile will be created automatically via database trigger
  return data
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async (): Promise<Staff | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching staff profile:', error)
    return null
  }

  return staff || null
}
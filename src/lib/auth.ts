import { supabase } from '@/integrations/supabase/client'

export type Staff = {
  id: string
  email: string
  staff_number: string
  base_location: string
  can_work_doubles: boolean
  company_id: string
  created_at: string
}

export type Company = {
  id: string
  name: string
  industry: string
  email_domain: string
  config: {
    bases: string[]
    features: {
      premium_calculator?: boolean
      shift_swapping: boolean
    }
  }
  created_at: string
  updated_at: string
}

export const getCompanies = async (): Promise<Company[]> => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name')
  
  if (error) throw error
  return (data || []) as Company[]
}

export const getCompanyByDomain = async (domain: string): Promise<Company | null> => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('email_domain', domain)
    .maybeSingle()
  
  if (error) throw error
  return data as Company | null
}

export const validateEmail = (email: string, companyDomain: string): boolean => {
  return email.toLowerCase().endsWith(`@${companyDomain}`)
}

export const validateStaffNumber = (staffNumber: string): boolean => {
  return /^\d{4,10}$/.test(staffNumber)
}

export const signUp = async (
  email: string, 
  password: string, 
  staffNumber: string, 
  baseLocation: string, 
  canWorkDoubles: boolean,
  companyId: string
) => {
  // Get company info to validate email domain
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('email_domain')
    .eq('id', companyId)
    .single()

  if (companyError) throw new Error('Invalid company selected')

  if (!validateEmail(email, company.email_domain)) {
    throw new Error(`Please use your @${company.email_domain} email address`)
  }
  
  if (!validateStaffNumber(staffNumber)) {
    throw new Error('Staff number must be 4-10 digits')
  }

  // Check if staff number already exists
  const { data: existingStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('staff_number', staffNumber)
    .eq('company_id', companyId)
    .maybeSingle()

  if (existingStaff) {
    throw new Error('Staff number already registered for this company')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: {
        staff_number: staffNumber,
        base_location: baseLocation,
        can_work_doubles: canWorkDoubles,
        company_id: companyId
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

export const getCurrentUser = async (): Promise<(Staff & { company: Company }) | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: staff, error } = await supabase
    .from('staff')
    .select(`
      *,
      companies (*)
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching staff profile:', error)
    return null
  }

  if (!staff) return null

  return {
    ...staff,
    company: staff.companies as Company
  }
}
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

  // TEMPORARILY DISABLED: Allow all email domains for testing
  // if (!validateEmail(email, company.email_domain)) {
  //   throw new Error(`Please use your @${company.email_domain} email address`)
  // }
  
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
  console.log('auth.ts: Starting sign in for:', email)
  console.log('auth.ts: Supabase URL:', import.meta.env.VITE_SUPABASE_URL || 'using fallback')
  
  // Test Supabase connection
  try {
    const { data: testData, error: testError } = await supabase.auth.getSession()
    console.log('auth.ts: Connection test result:', testData, testError)
  } catch (connectionError) {
    console.error('auth.ts: Connection test failed:', connectionError)
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    console.error('auth.ts: Sign in error:', error)
    throw error
  }
  
  console.log('auth.ts: Sign in successful, data:', data)
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getAllStaff = async (): Promise<Staff[]> => {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .order('staff_number')

    if (error) {
      console.error('Error fetching all staff:', error)
      return []
    }

    return staff || []
  } catch (error) {
    console.error('Error in getAllStaff:', error)
    return []
  }
}

export const getCurrentUser = async (): Promise<(Staff & { company: Company }) | null> => {
  try {
    console.log('auth.ts: Getting current user...')
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!session || !user) {
      console.log('auth.ts: No session or user found')
      return null
    }
    
    console.log('auth.ts: User found:', user.id)
    
    // Try to fetch staff profile with better error handling
    let staff = null
    let staffError = null
    
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, email, staff_number, base_location, can_work_doubles, company_id, created_at')
        .eq('id', user.id)
        .maybeSingle()
      
      staff = data
      staffError = error
    } catch (fetchError) {
      console.error('auth.ts: Exception during staff fetch:', fetchError)
      staffError = fetchError
    }

    if (staffError) {
      console.error('auth.ts: Error fetching staff profile:', staffError)
      console.log('auth.ts: Creating fallback user object')
      
      // Create a fallback user object from Supabase user data
      const fallbackUser = {
        id: user.id,
        email: user.email!,
        staff_number: user.user_metadata?.staff_number || '0000',
        base_location: user.user_metadata?.base_location || 'Unknown',
        can_work_doubles: user.user_metadata?.can_work_doubles || false,
        company_id: null,
        created_at: user.created_at,
        company: null
      }
      
      console.log('auth.ts: Returning fallback user:', fallbackUser)
      return fallbackUser
    }

  if (!staff) {
    console.log('auth.ts: No staff profile found, attempting to create one')
    
    // Try to create a staff profile
    try {
      const { data: newStaff, error: createError } = await supabase
        .from('staff')
        .insert({
          id: user.id,
          email: user.email!,
          staff_number: user.user_metadata?.staff_number || '0000',
          base_location: user.user_metadata?.base_location || 'Unknown',
          can_work_doubles: user.user_metadata?.can_work_doubles || false,
          company_id: null
        })
        .select()
        .single()
      
      if (createError) {
        console.error('auth.ts: Error creating staff profile:', createError)
        // Return fallback user if creation fails
        return {
          id: user.id,
          email: user.email!,
          staff_number: user.user_metadata?.staff_number || '0000',
          base_location: user.user_metadata?.base_location || 'Unknown',
          can_work_doubles: user.user_metadata?.can_work_doubles || false,
          company_id: null,
          created_at: user.created_at,
          company: null
        }
      }
      
      console.log('auth.ts: Created new staff profile:', newStaff)
      staff = newStaff
    } catch (createException) {
      console.error('auth.ts: Exception creating staff profile:', createException)
      // Return fallback user if creation fails
      return {
        id: user.id,
        email: user.email!,
        staff_number: user.user_metadata?.staff_number || '0000',
        base_location: user.user_metadata?.base_location || 'Unknown',
        can_work_doubles: user.user_metadata?.can_work_doubles || false,
        company_id: null,
        created_at: user.created_at,
        company: null
      }
    }
  }

  // Get company if staff has company_id
  let company = null
  if (staff.company_id) {
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', staff.company_id)
      .maybeSingle()

    if (!companyError) {
      company = companyData
    }
  }

  const result = {
    ...staff,
    company: company as Company
  }
  
  return result
  } catch (error) {
    console.error('auth.ts: Error in getCurrentUser:', error)
    return null
  }
}
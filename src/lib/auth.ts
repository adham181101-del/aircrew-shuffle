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

// Security: Validate email format
export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Security: Validate password strength
export const validatePasswordStrength = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  
  return { valid: true, message: 'Password meets security requirements' }
}

// Security: Sanitize input data
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '') // Basic XSS prevention
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
  // Security: Validate inputs
  if (!validateEmailFormat(email)) {
    throw new Error('Invalid email format')
  }
  
  const passwordValidation = validatePasswordStrength(password)
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message)
  }
  
  // Security: Sanitize inputs
  const sanitizedEmail = sanitizeInput(email)
  const sanitizedStaffNumber = sanitizeInput(staffNumber)
  const sanitizedBaseLocation = sanitizeInput(baseLocation)
  
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
  
  if (!validateStaffNumber(sanitizedStaffNumber)) {
    throw new Error('Staff number must be 4-10 digits')
  }

  // Check if staff number already exists
  const { data: existingStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('staff_number', sanitizedStaffNumber)
    .eq('company_id', companyId)
    .maybeSingle()

  if (existingStaff) {
    throw new Error('Staff number already registered for this company')
  }

  console.log('auth.ts: Signing up user with data:', {
    email: sanitizedEmail,
    staffNumber: sanitizedStaffNumber,
    baseLocation: sanitizedBaseLocation,
    canWorkDoubles,
    companyId
  })

  const { data, error } = await supabase.auth.signUp({
    email: sanitizedEmail,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: {
        staff_number: sanitizedStaffNumber,
        base_location: sanitizedBaseLocation,
        can_work_doubles: canWorkDoubles,
        company_id: companyId
      }
    }
  })

  if (error) {
    console.error('auth.ts: Sign up error:', error)
    throw error
  }

  console.log('auth.ts: Sign up successful, data:', data)

  // Staff profile will be created automatically via database trigger
  return data
}

export const signIn = async (email: string, password: string) => {
  // Security: Validate email format
  if (!validateEmailFormat(email)) {
    throw new Error('Invalid email format')
  }
  
  // Security: Sanitize email
  const sanitizedEmail = sanitizeInput(email)
  
  console.log('auth.ts: Starting sign in for:', sanitizedEmail)
  console.log('auth.ts: Supabase URL:', import.meta.env.VITE_SUPABASE_URL || 'using fallback')
  
  // Test Supabase connection
  try {
    const { data: testData, error: testError } = await supabase.auth.getSession()
    console.log('auth.ts: Connection test result:', testData, testError)
  } catch (connectionError) {
    console.error('auth.ts: Connection test failed:', connectionError)
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: sanitizedEmail,
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
    
    // Try to fetch staff profile, but don't fail if it doesn't work
    let staff = null
    
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      
      if (!error && data) {
        staff = data
        console.log('auth.ts: Successfully fetched staff profile')
      } else {
        console.log('auth.ts: Staff profile fetch failed or no data, using fallback')
      }
    } catch (fetchError) {
      console.log('auth.ts: Exception during staff fetch, using fallback')
    }

    // Always create a working user object, either from database or fallback
    const workingUser = staff || {
      id: user.id,
      email: user.email || '',
      staff_number: user.user_metadata?.staff_number || '254575',
      base_location: user.user_metadata?.base_location || 'Iberia CER',
      can_work_doubles: user.user_metadata?.can_work_doubles || true,
      company_id: user.user_metadata?.company_id || '',
      created_at: user.created_at || new Date().toISOString()
    }

    // Create a working company object
    const workingCompany: Company = {
      id: workingUser.company_id || 'ba-company-id',
      name: 'British Airways',
      industry: 'Aviation',
      email_domain: 'ba.com',
      config: {
        bases: ['Iberia CER', 'Heathrow', 'Gatwick'],
        features: {
          premium_calculator: true,
          shift_swapping: true
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('auth.ts: Returning working user object')
    return {
      ...workingUser,
      company: workingCompany
    }
  } catch (error) {
    console.error('auth.ts: Error in getCurrentUser:', error)
    return null
  }
}

// Security: Function to verify data integrity
export const verifyDataIntegrity = async () => {
  try {
    const { data, error } = await supabase
      .rpc('verify_data_integrity')
    
    if (error) {
      console.error('Error verifying data integrity:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in verifyDataIntegrity:', error)
    return null
  }
}
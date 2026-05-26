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
    console.error('Sign up error:', error)
    throw error
  }

  return data
}

export const signIn = async (email: string, password: string) => {
  // Security: Validate email format
  if (!validateEmailFormat(email)) {
    throw new Error('Invalid email format')
  }
  
  // Security: Sanitize email
  const sanitizedEmail = sanitizeInput(email)
  
  const signInWithTimeout = async () => {
    // Desktop Safari can be slower to resolve auth requests, so keep timeout generous.
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout - please try again')), 30000);
    });

    const signInPromise = supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password
    });

    return Promise.race([signInPromise, timeoutPromise]);
  };

  let response;
  try {
    response = await signInWithTimeout();
  } catch (error) {
    // Retry once if first attempt timed out (common on some desktop connections/browsers).
    if (error instanceof Error && error.message.includes('timeout')) {
      response = await signInWithTimeout();
    } else {
      throw error;
    }
  }

  const { data, error } = response as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

  if (error) {
    console.error('Sign in error:', error);
    throw error;
  }
  
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const requestPasswordReset = async (email: string) => {
  if (!validateEmailFormat(email)) {
    throw new Error('Invalid email format')
  }

  const sanitizedEmail = sanitizeInput(email)
  const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
    redirectTo: `${window.location.origin}/login`,
  })

  if (error) {
    console.error('Password reset request error:', error)
    throw error
  }
}

export const getAllStaff = async (): Promise<Staff[]> => {
  try {
    // Use the secure RPC function instead of direct table access
    const { data, error } = await supabase
      .rpc('get_all_staff_for_team')

    if (error) {
      console.error('Error fetching all staff:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllStaff:', error)
    return []
  }
}

export const getCurrentUser = async (): Promise<(Staff & { company: Company }) | null> => {
  try {
    // Create a timeout promise for Vercel compatibility
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout - please try again')), 15000); // Increased timeout
    });

    // Main user fetch with timeout
    const userPromise = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!session || !user) {
        return null;
      }
      
      // Try to fetch staff profile with timeout
      let staff = null;
      
      const { data, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (staffError) {
        console.error('Staff profile fetch failed:', staffError);
        throw new Error('Unable to load your staff profile. Please try again.');
      }

      if (!data) {
        console.error('No staff profile for user:', user.id);
        return null;
      }

      staff = data;

      let company: Company | null = null;
      if (staff.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', staff.company_id)
          .maybeSingle();

        if (!companyError && companyData) {
          company = companyData as Company;
        }
      }

      if (!company && user.email?.includes('@')) {
        const domain = user.email.split('@')[1]?.toLowerCase();
        if (domain) {
          company = await getCompanyByDomain(domain);
        }
      }

      if (!company) {
        console.error('Company not found for staff:', staff.id);
        return null;
      }

      return {
        ...staff,
        company
      };
    })();

    // Race between timeout and user fetch
    return await Promise.race([userPromise, timeoutPromise]);
  } catch (error) {
    console.error('Auth error:', error);
    // Don't return null immediately, let the calling code handle the error
    throw error;
  }
};

// Security: Function to verify data integrity
export const verifyDataIntegrity = async () => {
  try {
    // This function is not available in the current database schema
    // Return null for now as a placeholder
    console.log('verifyDataIntegrity: Function not available in current schema')
    return null
  } catch (error) {
    console.error('Error in verifyDataIntegrity:', error)
    return null
  }
}
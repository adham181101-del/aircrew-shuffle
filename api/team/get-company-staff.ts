import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create user client to verify authentication
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.authorization || '' } }
    })

    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Create admin client to check company membership
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user's company
    const { data: userStaff, error: staffError } = await adminSupabase
      .from('staff')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (staffError || !userStaff) {
      return res.status(403).json({ error: 'Staff record not found' })
    }

    // Get all staff from the same company
    const { data: companyStaff, error: fetchError } = await adminSupabase
      .from('staff')
      .select(`
        id,
        email,
        staff_number,
        base_location,
        can_work_doubles,
        company_id,
        created_at
      `)
      .eq('company_id', userStaff.company_id)
      .order('base_location, staff_number')

    if (fetchError) {
      console.error('Error fetching company staff:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch staff data' })
    }

    return res.status(200).json({ data: companyStaff })

  } catch (error) {
    console.error('Error in get-company-staff API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

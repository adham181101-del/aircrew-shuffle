import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../_supabaseAdmin'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create user client to verify authentication
    const userSupabase = createClient(process.env.SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: req.headers.authorization || '' } }
    })

    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    // Check if user is admin
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('staff_number, company_id')
      .eq('id', user.id)
      .single()

    if (staffError || !staffData) {
      return res.status(403).json({ error: 'Staff record not found' })
    }

    // Check if user is admin
    const adminStaffNumbers = ['ADMIN001', 'ADMIN002', '254575']
    if (!adminStaffNumbers.includes(staffData.staff_number)) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Get all staff (admin can see all)
    const { data: allStaff, error: fetchError } = await supabaseAdmin
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
      .order('company_id, base_location, staff_number')

    if (fetchError) {
      console.error('Error fetching all staff:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch staff data' })
    }

    return res.status(200).json({ data: allStaff })

  } catch (error) {
    console.error('Error in get-all-staff API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

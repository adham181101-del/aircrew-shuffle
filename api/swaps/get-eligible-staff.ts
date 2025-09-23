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
    const { requester_base_location, swap_date } = req.query

    if (!requester_base_location || !swap_date) {
      return res.status(400).json({ error: 'requester_base_location and swap_date are required' })
    }

    // Create user client to verify authentication
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.authorization || '' } }
    })

    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Create admin client for operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user is requesting for their own base location
    const { data: userStaff, error: staffError } = await adminSupabase
      .from('staff')
      .select('base_location, company_id')
      .eq('id', user.id)
      .single()

    if (staffError || !userStaff) {
      return res.status(403).json({ error: 'Staff record not found' })
    }

    if (userStaff.base_location !== requester_base_location) {
      return res.status(403).json({ error: 'Can only request swaps for your own base location' })
    }

    // Get eligible staff using the RPC function
    const { data: eligibleStaff, error: eligibleError } = await adminSupabase
      .rpc('get_eligible_staff_for_swap', {
        requester_base_location: requester_base_location as string,
        swap_date: swap_date as string
      })

    if (eligibleError) {
      console.error('Error fetching eligible staff:', eligibleError)
      return res.status(500).json({ error: 'Failed to fetch eligible staff' })
    }

    return res.status(200).json({ data: eligibleStaff })

  } catch (error) {
    console.error('Error in get-eligible-staff API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { swapRequestId } = req.body

    if (!swapRequestId) {
      return res.status(400).json({ error: 'swapRequestId is required' })
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

    // Get the swap request and verify user can execute it
    const { data: swapRequest, error: swapError } = await adminSupabase
      .from('swap_requests')
      .select(`
        id,
        requester_id,
        accepter_id,
        requester_shift_id,
        accepter_shift_id,
        status
      `)
      .eq('id', swapRequestId)
      .single()

    if (swapError || !swapRequest) {
      return res.status(404).json({ error: 'Swap request not found' })
    }

    // Verify user is either the requester or accepter
    if (swapRequest.requester_id !== user.id && swapRequest.accepter_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to execute this swap' })
    }

    // Verify swap request is in accepted status
    if (swapRequest.status !== 'accepted') {
      return res.status(400).json({ error: 'Swap request must be accepted to execute' })
    }

    // Execute the swap using the database function
    const { data: result, error: executeError } = await adminSupabase
      .rpc('execute_shift_swap', {
        swap_request_id: swapRequestId,
        requester_shift_id: swapRequest.requester_shift_id,
        accepter_shift_id: swapRequest.accepter_shift_id
      })

    if (executeError) {
      console.error('Error executing swap:', executeError)
      return res.status(500).json({ error: 'Failed to execute swap' })
    }

    return res.status(200).json({ 
      success: true, 
      data: result,
      message: 'Swap executed successfully'
    })

  } catch (error) {
    console.error('Error in execute-swap API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

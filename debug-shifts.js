// Debug script to test shift fetching
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htlwfdoxsfjehiblsjed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHdmZG94c2ZqZWhpYmxzamVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTEzMzEsImV4cCI6MjA3MTE4NzMzMX0.vYX-92qy3sgYamymGQSRkdYRg0K8W35RfpI4HA5JlMY'
)

async function debugShifts() {
  console.log('=== DEBUGGING SHIFTS ===')
  
  try {
    // Get all shifts
    const { data: allShifts, error: allError } = await supabase
      .from('shifts')
      .select('*')
      .order('date', { ascending: true })
    
    if (allError) {
      console.error('Error fetching all shifts:', allError)
      return
    }
    
    console.log('Total shifts in database:', allShifts?.length || 0)
    console.log('All shifts:', allShifts)
    
    // Get shifts for specific user (replace with your user ID)
    const userId = 'your-user-id-here' // Replace this
    const { data: userShifts, error: userError } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', userId)
      .order('date', { ascending: true })
    
    if (userError) {
      console.error('Error fetching user shifts:', userError)
    } else {
      console.log(`Shifts for user ${userId}:`, userShifts?.length || 0)
      console.log('User shifts:', userShifts)
    }
    
  } catch (error) {
    console.error('Debug error:', error)
  }
}

debugShifts()

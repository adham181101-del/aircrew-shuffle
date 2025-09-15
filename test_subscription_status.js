// Test script to check subscription status
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htlwfdoxsfjehiblsjed.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHdmZG94c2ZqZWhpYmxzamVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYxMTMzMSwiZXhwIjoyMDcxMTg3MzMxfQ.g0PdBhI-A3WvxVUvt57KmGHp2wDPgX0awKsbNPVcJtI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSubscription() {
  try {
    console.log('Testing subscription access...')
    
    // Test 1: Check if subscription exists
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', '342b9c6c-7abc-4d69-bd01-5f12aaa32f7d')
      .single()
    
    if (subError) {
      console.error('Subscription error:', subError)
    } else {
      console.log('✅ Subscription found:', subscription)
    }
    
    // Test 2: Check staff record
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', '342b9c6c-7abc-4d69-bd01-5f12aaa32f7d')
      .single()
    
    if (staffError) {
      console.error('Staff error:', staffError)
    } else {
      console.log('✅ Staff found:', staff)
    }
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

testSubscription()

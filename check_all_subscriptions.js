// Check all subscriptions for the user
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://htlwfdoxsfjehiblsjed.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHdmZG94c2ZqZWhpYmxzamVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYxMTMzMSwiZXhwIjoyMDcxMTg3MzMxfQ.g0PdBhI-A3WvxVUvt57KmGHp2wDPgX0awKsbNPVcJtI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllSubscriptions() {
  try {
    console.log('Checking all subscriptions for user...')
    
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', '342b9c6c-7abc-4d69-bd01-5f12aaa32f7d')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error:', error)
    } else {
      console.log(`Found ${subscriptions.length} subscriptions:`)
      subscriptions.forEach((sub, index) => {
        console.log(`\n${index + 1}. Subscription ID: ${sub.id}`)
        console.log(`   Stripe ID: ${sub.stripe_subscription_id}`)
        console.log(`   Status: ${sub.status}`)
        console.log(`   Created: ${sub.created_at}`)
        console.log(`   Trial End: ${sub.trial_end}`)
      })
    }
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

checkAllSubscriptions()

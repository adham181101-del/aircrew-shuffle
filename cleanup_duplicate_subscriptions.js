// Clean up duplicate subscriptions - keep only the most recent one
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://htlwfdoxsfjehiblsjed.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHdmZG94c2ZqZWhpYmxzamVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYxMTMzMSwiZXhwIjoyMDcxMTg3MzMxfQ.g0PdBhI-A3WvxVUvt57KmGHp2wDPgX0awKsbNPVcJtI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupSubscriptions() {
  try {
    console.log('Cleaning up duplicate subscriptions...')
    
    // Get all subscriptions for the user, ordered by creation date
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', '342b9c6c-7abc-4d69-bd01-5f12aaa32f7d')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return
    }
    
    if (subscriptions.length <= 1) {
      console.log('No duplicates found.')
      return
    }
    
    console.log(`Found ${subscriptions.length} subscriptions. Keeping the most recent one.`)
    
    // Keep the first (most recent) subscription
    const keepSubscription = subscriptions[0]
    const deleteSubscriptions = subscriptions.slice(1)
    
    console.log(`Keeping subscription: ${keepSubscription.id} (${keepSubscription.stripe_subscription_id})`)
    
    // Delete the older subscriptions
    for (const sub of deleteSubscriptions) {
      console.log(`Deleting subscription: ${sub.id} (${sub.stripe_subscription_id})`)
      
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', sub.id)
      
      if (deleteError) {
        console.error(`Error deleting subscription ${sub.id}:`, deleteError)
      } else {
        console.log(`✅ Deleted subscription: ${sub.id}`)
      }
    }
    
    console.log('✅ Cleanup completed!')
    
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

cleanupSubscriptions()

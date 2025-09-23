// API Client for secure serverless function calls
// This replaces direct Supabase calls for sensitive operations

import { getSession } from './auth'

const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api'
  : '/api'

class ApiClient {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await getSession()
    if (!session?.access_token) {
      throw new Error('No valid session found')
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  // Admin functions
  async getAllStaff() {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/admin/get-all-staff`, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch all staff')
    }
    
    return response.json()
  }

  // Team functions
  async getCompanyStaff() {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/team/get-company-staff`, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch company staff')
    }
    
    return response.json()
  }

  // Swap functions
  async getEligibleStaffForSwap(requesterBaseLocation: string, swapDate: string) {
    const headers = await this.getAuthHeaders()
    const params = new URLSearchParams({
      requester_base_location: requesterBaseLocation,
      swap_date: swapDate
    })
    
    const response = await fetch(`${API_BASE_URL}/swaps/get-eligible-staff?${params}`, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch eligible staff')
    }
    
    return response.json()
  }

  async executeSwap(swapRequestId: string) {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${API_BASE_URL}/swaps/execute-swap`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ swapRequestId })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to execute swap')
    }
    
    return response.json()
  }
}

export const apiClient = new ApiClient()

// Migration helpers - these will replace direct Supabase calls
export const migrateToApiClient = {
  // Replace: supabase.rpc('get_all_staff_for_team')
  getAllStaffForTeam: () => apiClient.getCompanyStaff(),
  
  // Replace: supabase.rpc('get_eligible_staff_for_swap', {...})
  getEligibleStaffForSwap: (requesterBaseLocation: string, swapDate: string) => 
    apiClient.getEligibleStaffForSwap(requesterBaseLocation, swapDate),
  
  // Replace: supabase.rpc('execute_shift_swap', {...})
  executeShiftSwap: (swapRequestId: string) => 
    apiClient.executeSwap(swapRequestId)
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Clock, MapPin, User, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getCurrentUser, type Staff } from "@/lib/auth";
import { validateWHL } from "@/lib/shifts";
import { supabase } from "@/integrations/supabase/client";

type SwapRequestWithDetails = {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  accepter_id: string | null;
  accepter_shift_id: string | null;
  status: string;
  message: string | null;
  created_at: string;
  requester_staff?: Staff;
  accepter_staff?: Staff;
  requester_shift?: any;
  accepter_shift?: any;
};

const ManageSwaps = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("incoming");
  const [user, setUser] = useState<Staff | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<SwapRequestWithDetails[]>([]);
  const [myRequests, setMyRequests] = useState<SwapRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableShifts, setAvailableShifts] = useState<any[]>([]);
  const [selectedCounterShift, setSelectedCounterShift] = useState<string>("");
  const [showCounterOffer, setShowCounterOffer] = useState<string | null>(null);
  const [loadingCounterShifts, setLoadingCounterShifts] = useState(false);

  useEffect(() => {
    loadUserAndRequests();
  }, []);

  const loadUserAndRequests = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      
      await Promise.all([
        loadIncomingRequests(currentUser.id),
        loadMyRequests(currentUser.id)
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load swap requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIncomingRequests = async (userId: string) => {
    console.log('=== LOADING INCOMING REQUESTS ===');
    console.log('User ID:', userId);
    
    const { data, error } = await supabase
      .from('swap_requests')
      .select(`
        *,
        requester_staff:staff!swap_requests_requester_id_fkey(*),
        requester_shift:shifts!swap_requests_requester_shift_id_fkey(*)
      `)
      .eq('accepter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading incoming requests:', error);
      return;
    }

    console.log('Incoming requests data:', data);
    console.log('Number of incoming requests:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('First request details:', {
        id: data[0].id,
        requester_staff: data[0].requester_staff,
        requester_shift: data[0].requester_shift,
        status: data[0].status
      });
    }

    setIncomingRequests(data || []);
  };

  const loadMyRequests = async (userId: string) => {
    const { data, error } = await supabase
      .from('swap_requests')
      .select(`
        *,
        accepter_staff:staff!swap_requests_accepter_id_fkey(*),
        requester_shift:shifts!swap_requests_requester_shift_id_fkey(*),
        accepter_shift:shifts!swap_requests_accepter_shift_id_fkey(*)
      `)
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading my requests:', error);
      return;
    }

    setMyRequests(data || []);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      accepted: "default",
      declined: "destructive"
    };
    return variants[status] || "secondary";
  };

  const fetchAvailableShifts = async (userId: string, requesterShiftDate: string) => {
    try {
      setLoadingCounterShifts(true);
      
      console.log('=== FETCHING AVAILABLE SHIFTS FOR COUNTER-OFFER ===');
      console.log('User ID:', userId);
      console.log('Requester shift date:', requesterShiftDate);
      console.log('Requester shift date type:', typeof requesterShiftDate);
      
      // Get all shifts for the current user
      const { data: userShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', userId)
        .order('date', { ascending: true });

      if (shiftsError) {
        console.error('Error fetching user shifts:', shiftsError);
        return [];
      }

      console.log('User shifts from database:', userShifts);
      console.log('Sample user shift date:', userShifts?.[0]?.date);
      console.log('Sample user shift date type:', typeof userShifts?.[0]?.date);

      // Get user's staff profile to check if they can work doubles
      const { data: userStaff, error: staffError } = await supabase
        .from('staff')
        .select('can_work_doubles')
        .eq('id', userId)
        .single();

      if (staffError) {
        console.error('Error fetching user staff profile:', staffError);
        return [];
      }

      const canWorkDoubles = userStaff?.can_work_doubles || false;
      console.log('User can work doubles:', canWorkDoubles);

      // Check if user is working on the requester's date
      const userWorkingOnRequesterDate = (userShifts || []).some(
        shift => shift.date === requesterShiftDate
      );
      
      console.log('User working on requester date:', userWorkingOnRequesterDate);
      console.log('All user shifts:', userShifts);
      console.log('Checking for requester date:', requesterShiftDate);
      console.log('User shift dates:', (userShifts || []).map(s => s.date));

      // Get all future dates where the user is OFF (no shifts)
      const futureDates = [];
      const today = new Date();
      const next30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      });

      console.log('Next 30 days:', next30Days);

      // Find dates where user is OFF and can work the requester's shift
      const availableDates = next30Days.filter(date => {
        // Skip past dates
        if (new Date(date) < today) {
          console.log(`❌ ${date} - Past date, skipping`);
          return false;
        }
        
        // Check if user has any shifts on this date
        const shiftsOnThisDate = (userShifts || []).filter(shift => shift.date === date);
        const isOffOnThisDate = shiftsOnThisDate.length === 0;
        
        console.log(`Date ${date}: ${isOffOnThisDate ? 'OFF' : 'WORKING'} (${shiftsOnThisDate.length} shifts)`);
        console.log(`Shifts on ${date}:`, shiftsOnThisDate);
        
        // CASE 1: If user is OFF on this date, they can offer it as a counter-offer
        if (isOffOnThisDate) {
          console.log(`✅ ${date} - User is OFF, can offer this date`);
          return true;
        }
        
        // CASE 2: If user is working on this date, they can only offer it if:
        // - They can work doubles AND
        // - They are also working on the requester's date (meaning they'd be doing a double for the requester)
        if (userWorkingOnRequesterDate && canWorkDoubles) {
          console.log(`✅ ${date} - User is working but can work doubles for requester`);
          return true;
        }
        
        // CASE 3: User is working on this date but cannot offer it
        console.log(`❌ ${date} - User is working and cannot offer this date`);
        return false;
      });

      console.log('Available dates for counter-offer:', availableDates);

      // Create mock shift objects for the available dates
      const availableShiftsForCounterOffer = availableDates.map(date => ({
        id: `counter-offer-${date}`,
        date: date,
        time: 'Available for swap',
        staff_id: userId,
        is_counter_offer: true
      }));

      console.log('Available shifts for counter-offer:', availableShiftsForCounterOffer);
      setAvailableShifts(availableShiftsForCounterOffer);
      return availableShiftsForCounterOffer;
    } catch (error) {
      console.error('Error in fetchAvailableShifts:', error);
      return [];
    } finally {
      setLoadingCounterShifts(false);
    }
  };

  const handleShowCounterOffer = async (swapId: string) => {
    if (!user) return;
    
    // Find the swap request to get the requester's shift date
    const swapRequest = incomingRequests.find(req => req.id === swapId);
    if (!swapRequest || !swapRequest.requester_shift?.date) {
      toast({
        title: "Error",
        description: "Could not find swap request details",
        variant: "destructive"
      });
      return;
    }
    
    setShowCounterOffer(swapId);
    setSelectedCounterShift("");
    await fetchAvailableShifts(user.id, swapRequest.requester_shift.date);
  };

  const handleAcceptSwap = async (swapId: string) => {
    try {
      console.log('=== ACCEPT SWAP DEBUG ===');
      console.log('Swap ID:', swapId);
      console.log('User ID:', user?.id);
      console.log('Incoming requests:', incomingRequests);
      
      // Find the swap request to get the shift details
      const swapRequest = incomingRequests.find(req => req.id === swapId);
      console.log('Found swap request:', swapRequest);
      
      if (!swapRequest) {
        console.error('Swap request not found in local state');
        toast({
          title: "Error",
          description: "Swap request not found",
          variant: "destructive"
        });
        return;
      }

      console.log('Requester shift:', swapRequest.requester_shift);
      console.log('Requester staff:', swapRequest.requester_staff);

      if (!swapRequest.requester_shift) {
        console.error('Requester shift details missing');
        toast({
          title: "Error",
          description: "Shift details not found",
          variant: "destructive"
        });
        return;
      }

      if (!user) {
        console.error('User not found');
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      // Check if a counter-offer shift is selected
      if (!selectedCounterShift) {
        toast({
          title: "Counter-Offer Required",
          description: "Please select a date to offer in exchange",
          variant: "destructive"
        });
        return;
      }

      // Extract the date from the selected counter-offer
      const selectedCounterOffer = availableShifts.find(shift => shift.id === selectedCounterShift);
      if (!selectedCounterOffer) {
        toast({
          title: "Error",
          description: "Selected counter-offer not found",
          variant: "destructive"
        });
        return;
      }

      console.log('Selected counter-offer date:', selectedCounterOffer.date);

      console.log('Validating WHL for shift:', {
        date: swapRequest.requester_shift.date,
        time: swapRequest.requester_shift.time
      });

      // Validate WHL before accepting
      const whlValidation = await validateWHL(
        user.id, 
        swapRequest.requester_shift.date, 
        swapRequest.requester_shift.time
      );

      console.log('WHL validation result:', whlValidation);

      if (!whlValidation.isValid) {
        toast({
          title: "Working Hours Limit Violation",
          description: `Cannot accept swap due to: ${whlValidation.violations.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Updating swap request with counter-offer...');

      // Update the swap request with the counter-offer date
      const { error } = await supabase
        .from('swap_requests')
        .update({ 
          status: 'accepted',
          accepter_shift_id: null, // No specific shift, just a date
          counter_offer_date: selectedCounterOffer.date // Store the offered date
        })
        .eq('id', swapId);

      if (error) {
        console.error('Error updating swap request:', error);
        throw error;
      }

      console.log('Swap request updated successfully');

      toast({
        title: "Swap Accepted",
        description: "You have accepted the swap request with your counter-offer",
      });

      // Reset counter-offer state
      setShowCounterOffer(null);
      setSelectedCounterShift("");
      setAvailableShifts([]);

      if (user) {
        await loadIncomingRequests(user.id);
      }
    } catch (error) {
      console.error('Error in handleAcceptSwap:', error);
      toast({
        title: "Error",
        description: "Failed to accept swap request",
        variant: "destructive"
      });
    }
  };

  const handleRejectSwap = async (swapId: string) => {
    try {
      const { error } = await supabase
        .from('swap_requests')
        .update({ status: 'declined' })
        .eq('id', swapId);

      if (error) throw error;

      toast({
        title: "Swap Rejected",
        description: "You have declined the swap request",
      });

      if (user) {
        await loadIncomingRequests(user.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject swap request",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Manage Swaps</h1>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/swaps/create')}>
                Create Swap Request
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="incoming">
                  Incoming ({incomingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="my-requests">
                  My Requests ({myRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="incoming" className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Swap Requests for You</h2>
                  <p className="text-muted-foreground">
                    Review and respond to shift swap requests from other crew members
                  </p>
                </div>

                {incomingRequests.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">No incoming requests</p>
                      <p className="text-muted-foreground">
                        You don't have any pending swap requests at the moment.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {incomingRequests.map((request) => (
                      <Card key={request.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <User className="h-5 w-5" />
                              Request from {request.requester_staff?.staff_number}
                            </CardTitle>
                            <Badge variant={getStatusBadge(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <CardDescription>
                            {format(new Date(request.created_at), 'MMM d, yyyy')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">SHIFT OFFERED TO YOU</h4>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{request.requester_shift?.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{request.requester_shift?.time}</span>
                              </div>
                            </div>
                          </div>

                          {request.message && (
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm font-medium mb-1">Message:</p>
                              <p className="text-sm">{request.message}</p>
                            </div>
                          )}

                          {request.status === "pending" && (
                            <div className="space-y-4">
                              {showCounterOffer === request.id ? (
                                <div className="space-y-3">
                                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                                    <h4 className="font-medium text-sm mb-2">SELECT A DATE TO OFFER IN EXCHANGE</h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                                      Choose a date where you are OFF and can work their shift, or a date where you can work a double shift for them.
                                    </p>
                                    
                                    {loadingCounterShifts ? (
                                      <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        <span className="text-sm">Loading your available dates...</span>
                                      </div>
                                    ) : availableShifts.length > 0 ? (
                                      <div className="space-y-2">
                                        <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                                          ✅ Available dates for counter-offer:
                                        </p>
                                        {availableShifts.map((shift) => (
                                          <div
                                            key={shift.id}
                                            className={`p-2 rounded border cursor-pointer transition-colors ${
                                              selectedCounterShift === shift.id
                                                ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600'
                                                : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                            onClick={() => setSelectedCounterShift(shift.id)}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                  <Calendar className="h-3 w-3" />
                                                  <span className="text-sm">{shift.date}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                                    {shift.is_counter_offer ? 'Available for swap' : shift.time}
                                                  </span>
                                                </div>
                                              </div>
                                              {selectedCounterShift === shift.id && (
                                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                                          ❌ No dates available for counter-offer
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                          This could be because:
                                        </p>
                                        <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                                          <li>You are working on all available dates</li>
                                          <li>You cannot work doubles and are already working on the requested date</li>
                                          <li>No future dates are available for swapping</li>
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button 
                                      onClick={() => handleAcceptSwap(request.id)}
                                      disabled={!selectedCounterShift}
                                      className="flex-1"
                                    >
                                      Accept with Counter-Offer
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      onClick={() => {
                                        setShowCounterOffer(null);
                                        setSelectedCounterShift("");
                                        setAvailableShifts([]);
                                      }}
                                      className="flex-1"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleShowCounterOffer(request.id)}
                                    className="flex-1"
                                  >
                                    Accept with Counter-Offer
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    onClick={() => handleRejectSwap(request.id)}
                                    className="flex-1"
                                  >
                                    Decline
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my-requests" className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Your Swap Requests</h2>
                  <p className="text-muted-foreground">
                    Track swap requests you've sent to other crew members
                  </p>
                </div>

                {myRequests.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">No active requests</p>
                      <p className="text-muted-foreground mb-4">
                        You haven't sent any swap requests recently.
                      </p>
                      <Button onClick={() => navigate('/swaps/create')}>
                        Create Your First Swap Request
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {myRequests.map((request) => (
                      <Card key={request.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>Request to {request.accepter_staff?.staff_number || 'Staff Member'}</CardTitle>
                            <Badge variant={getStatusBadge(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <CardDescription>
                            Sent {format(new Date(request.created_at), 'MMM d, yyyy')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">YOUR SHIFT TO SWAP</h4>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{request.requester_shift?.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{request.requester_shift?.time}</span>
                              </div>
                            </div>
                          </div>
                          
                          {request.status === 'accepted' && request.accepter_shift && (
                            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg mt-3">
                              <h4 className="font-medium text-sm mb-2">COUNTER-OFFER ACCEPTED</h4>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{request.accepter_shift?.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>{request.accepter_shift?.time}</span>
                                </div>
                              </div>
                              <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                                {request.accepter_staff?.staff_number} will cover your shift on {request.requester_shift?.date}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageSwaps;
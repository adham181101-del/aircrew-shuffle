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

      console.log('Updating swap request status to accepted...');

      const { error } = await supabase
        .from('swap_requests')
        .update({ status: 'accepted' })
        .eq('id', swapId);

      if (error) {
        console.error('Error updating swap request:', error);
        throw error;
      }

      console.log('Swap request updated successfully');

      toast({
        title: "Swap Accepted",
        description: "You have accepted the swap request",
      });

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
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => handleAcceptSwap(request.id)}
                                className="flex-1"
                              >
                                Accept Swap
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
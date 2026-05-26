import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Clock, MapPin, User, Calendar, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import { getCurrentUser, type Staff } from "@/lib/auth";
import { assertWHLCompliance } from '@/lib/shifts';
import {
  buildCounterOfferOptions,
  counterOfferCardClass,
  formatShiftTimeLabel,
  type CounterOfferOption,
} from '@/lib/counterOfferEligibility';
import { formatDateGB, normalizeToDatabaseDate } from '@/lib/dates';
import {
  completeSwapAcceptance,
  revokeAllPendingSwapRequestsForShift,
  verifyRequesterShiftExists,
  resolveCounterOfferShiftTime,
} from '@/lib/swapRequests';
import { groupSwapRequestsByShift } from '@/lib/swapBroadcastSummary';
import { SwapBroadcastHubCard } from '@/components/swaps/SwapBroadcastHubCard';
import { supabase } from "@/integrations/supabase/client";
import { useIncomingSwapRequests, useMySwapRequests, useInvalidateSwapRequests, type SwapRequestWithDetails } from "@/hooks/useSwapRequests";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { profiler } from "@/lib/performance";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ManageSwaps = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("incoming");
  const [availableShifts, setAvailableShifts] = useState<CounterOfferOption[]>([]);
  const [counterOfferTimes, setCounterOfferTimes] = useState<Record<string, string>>({});
  const [selectedCounterShift, setSelectedCounterShift] = useState<string>("");
  const [showCounterOffer, setShowCounterOffer] = useState<string | null>(null);
  const [loadingCounterShifts, setLoadingCounterShifts] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [requestToRevoke, setRequestToRevoke] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentSwapId, setCurrentSwapId] = useState<string | null>(null);
  
  // Performance profiling
  useEffect(() => {
    profiler.mark('ManageSwaps rendered', 'render')
  }, [])
  
  useEffect(() => {
    profiler.mark(`ManageSwaps tab change to ${activeTab}`, 'tab-change')
  }, [activeTab])

  // Use React Query hooks for data fetching
  const { data: user } = useCurrentUser()
  const { data: incomingRequests = [], isLoading: incomingLoading } = useIncomingSwapRequests(user?.id || null)
  const { data: myRequests = [], isLoading: myRequestsLoading } = useMySwapRequests(user?.id || null)
  const invalidateSwapRequests = useInvalidateSwapRequests()
  
  const loading = incomingLoading || myRequestsLoading

  const pendingIncomingRequests = useMemo(
    () => incomingRequests.filter((r) => r.status === 'pending'),
    [incomingRequests]
  )

  const swapBroadcasts = useMemo(
    () => groupSwapRequestsByShift(myRequests),
    [myRequests]
  )

  // Deep-link: open a specific swap request from notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openId = params.get('open');
    if (openId) {
      setShowCounterOffer(openId);
      setCurrentSwapId(openId);
      setCurrentMonth(new Date());
    }
  }, []);

  // Load accepter shift times for counter-offers the requester is reviewing
  useEffect(() => {
    const pending = myRequests.filter(
      (r) => r.status === 'pending' && r.counter_offer_date && r.accepter_id
    );
    if (pending.length === 0) {
      setCounterOfferTimes({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        pending.map(async (r) => {
          const time = await resolveCounterOfferShiftTime(
            r.accepter_id!,
            r.counter_offer_date!,
            ''
          );
          return [r.id, time] as const;
        })
      );
      if (!cancelled) {
        setCounterOfferTimes(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myRequests]);

  // Load counter-offer dates when opened via deep link
  useEffect(() => {
    if (!showCounterOffer || !user) return;
    const swapRequest = incomingRequests.find((req) => req.id === showCounterOffer);
    if (!swapRequest?.requester_shift?.date) return;
    void fetchAvailableShifts(
      user.id,
      swapRequest.requester_shift.date,
      showCounterOffer,
      currentMonth
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when panel opens
  }, [showCounterOffer, user?.id]);

  // Redirect if no user
  useEffect(() => {
    if (user === null && !loading) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      accepted: "default",
      declined: "destructive",
      counter_offered: "outline"
    };
    return variants[status] || "secondary";
  };

  const fetchAvailableShifts = async (
    userId: string,
    requesterShiftDate: string,
    swapId: string,
    targetMonth?: Date
  ) => {
    try {
      setLoadingCounterShifts(true);

      const { data: userShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', userId)
        .order('date', { ascending: true });

      if (shiftsError) {
        console.error('Error fetching user shifts:', shiftsError);
        return [];
      }

      const { data: userStaff, error: staffError } = await supabase
        .from('staff')
        .select('can_work_doubles')
        .eq('id', userId)
        .single();

      if (staffError) {
        console.error('Error fetching user staff profile:', staffError);
        return [];
      }

      const canWorkDoubles = userStaff?.can_work_doubles ?? false;

      const { data: requesterRow, error: requesterStaffError } = await supabase
        .from('swap_requests')
        .select('requester_id, requester_shift:shifts!swap_requests_requester_shift_id_fkey(date, time)')
        .eq('id', swapId)
        .single();

      if (requesterStaffError || !requesterRow) {
        console.error('Error fetching swap request:', requesterStaffError);
        return [];
      }

      const swapShift = requesterRow.requester_shift as { date: string; time: string } | null;
      const swapShiftDate = swapShift?.date ?? requesterShiftDate;
      const swapShiftTime = swapShift?.time ?? '';

      const { data: requesterShifts, error: requesterShiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', requesterRow.requester_id)
        .order('date', { ascending: true });

      if (requesterShiftsError) {
        console.error('Error fetching requester shifts:', requesterShiftsError);
        return [];
      }

      const { data: userLeaveDays } = await supabase
        .from('leave_days')
        .select('date')
        .eq('staff_id', userId);

      const { data: requesterLeaveDays } = await supabase
        .from('leave_days')
        .select('date')
        .eq('staff_id', requesterRow.requester_id);

      const userLeaveDates = new Set(
        (userLeaveDays || []).map((ld) => normalizeToDatabaseDate(ld.date))
      );
      const requesterLeaveDates = new Set(
        (requesterLeaveDays || []).map((ld) => normalizeToDatabaseDate(ld.date))
      );

      const options = buildCounterOfferOptions({
        userId,
        userShifts: userShifts || [],
        requesterShifts: requesterShifts || [],
        userLeaveDates,
        requesterLeaveDates,
        canWorkDoubles,
        swapShiftDate,
        swapShiftTime,
        targetMonth,
      });

      setAvailableShifts(options);
      return options;
    } catch (error) {
      console.error('Error in fetchAvailableShifts:', error);
      return [];
    } finally {
      setLoadingCounterShifts(false);
    }
  };

  const handleShowCounterOffer = async (swapId: string) => {
    if (!user) return;
    
    console.log('=== SHOWING COUNTER OFFER ===');
    console.log('Swap ID:', swapId);
    console.log('User:', user.id);
    
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
    
    console.log('Found swap request:', swapRequest);
    console.log('Setting currentSwapId to:', swapId);
    
    setShowCounterOffer(swapId);
    setSelectedCounterShift("");
    setCurrentSwapId(swapId);
    setCurrentMonth(new Date()); // Reset to current month
    
    console.log('State variables set, calling fetchAvailableShifts...');
    await fetchAvailableShifts(user.id, swapRequest.requester_shift.date, swapId, new Date());
    
    console.log('handleShowCounterOffer completed');
  };

  const handleAcceptSwap = async (swapId: string) => {
    await handleShowCounterOffer(swapId);
  };

  const handleAcceptSwapWithCounterOffer = async (swapId: string, selectedShiftId: string) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      const swapRequest = incomingRequests.find((req) => req.id === swapId);
      if (!swapRequest?.requester_shift) {
        toast({
          title: "Error",
          description: "Swap request not found",
          variant: "destructive"
        });
        return;
      }

      if (swapRequest.status !== 'pending') {
        toast({
          title: "Request no longer active",
          description: "This swap was already accepted, declined, or cancelled.",
          variant: "destructive"
        });
        await invalidateSwapRequests.mutateAsync();
        return;
      }

      if (!(await verifyRequesterShiftExists(swapRequest.requester_shift_id))) {
        toast({
          title: "Shift already covered",
          description: "This shift is no longer available to swap.",
          variant: "destructive"
        });
        await invalidateSwapRequests.mutateAsync();
        return;
      }

      const selectedShift = availableShifts.find(s => s.id === selectedShiftId);
      if (!selectedShift) {
        toast({
          title: "Error",
          description: "Selected date not found",
          variant: "destructive"
        });
        return;
      }

      if (!selectedShift.canSelect) {
        toast({
          title: "Date not compatible",
          description:
            'This date does not line up for a swap (orange). Pick a green date — day off for them or a valid 04:15 ↔ 13:15 double.',
          variant: "destructive"
        });
        return;
      }

      const counterOfferDate = normalizeToDatabaseDate(selectedShift.date);
      const requesterShiftDate = normalizeToDatabaseDate(swapRequest.requester_shift.date);

      try {
        await assertWHLCompliance(
          user.id,
          requesterShiftDate,
          swapRequest.requester_shift.time
        );
      } catch (whlError) {
        const whlMessage =
          whlError instanceof Error ? whlError.message : 'Working hours limits would be exceeded';
        toast({
          title: 'Working hours limit',
          description: whlMessage,
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('swap_requests')
        .update({
          status: 'pending',
          counter_offer_date: counterOfferDate,
          accepter_id: user.id,
        })
        .eq('id', swapId);

      if (error) throw error;

      const displayDate = formatDateGB(counterOfferDate, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      toast({
        title: "Counter-Offer Sent",
        description: `Your counter-offer for ${displayDate} has been sent to the requester`,
      });

      // Reload the requests
      if (user) {
        await invalidateSwapRequests.mutateAsync();
      }

      setShowCounterOffer(null);
      setSelectedCounterShift("");
      setAvailableShifts([]);
    } catch (error) {
      console.error('Error sending counter-offer:', error);
      const raw =
        error instanceof Error ? error.message : 'Failed to send counter-offer';
      const message =
        raw === 'Invalid Date' || raw === 'Invalid time value'
          ? 'Could not validate shift dates. Please try again or contact support.'
          : raw;
      toast({
        title: "Error",
        description: message,
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
        await invalidateSwapRequests.mutateAsync();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject swap request",
        variant: "destructive"
      });
    }
  };

  const handleAcceptDirectSwap = async (swapId: string) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      const swapRequest = incomingRequests.find((req) => req.id === swapId);
      if (!swapRequest?.requester_shift) {
        toast({
          title: "Error",
          description: "Swap request not found",
          variant: "destructive"
        });
        return;
      }

      if (swapRequest.status !== 'pending') {
        toast({
          title: "Request no longer active",
          description: "This swap was already accepted, declined, or cancelled.",
          variant: "destructive"
        });
        await invalidateSwapRequests.mutateAsync();
        return;
      }

      if (!(await verifyRequesterShiftExists(swapRequest.requester_shift_id))) {
        toast({
          title: "Shift already covered",
          description: "This shift is no longer available to swap.",
          variant: "destructive"
        });
        await invalidateSwapRequests.mutateAsync();
        return;
      }

      await assertWHLCompliance(
        user.id,
        swapRequest.requester_shift.date,
        swapRequest.requester_shift.time
      );

      await completeSwapAcceptance(swapRequest);

      toast({
        title: "Swap Accepted",
        description: "You have accepted the swap and the shifts have been exchanged",
      });

      if (typeof window !== 'undefined' && (window as Window & { refreshCalendarShifts?: () => void }).refreshCalendarShifts) {
        (window as Window & { refreshCalendarShifts?: () => void }).refreshCalendarShifts?.();
      }

      setTimeout(() => {
        window.location.reload();
      }, 1000);

      await invalidateSwapRequests.mutateAsync();
    } catch (error) {
      console.error('Error in handleAcceptDirectSwap:', error);
      const message = error instanceof Error ? error.message : 'Failed to accept swap';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const handleAcceptCounterOffer = async (swapId: string) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      const swapRequest = myRequests.find((req) => req.id === swapId);
      if (!swapRequest?.requester_shift || !swapRequest.counter_offer_date || !swapRequest.accepter_id) {
        toast({
          title: "Error",
          description: "Swap request not found",
          variant: "destructive"
        });
        return;
      }

      if (swapRequest.status !== 'pending') {
        toast({
          title: "Request no longer active",
          description: "This counter-offer was already handled.",
          variant: "destructive"
        });
        await invalidateSwapRequests.mutateAsync();
        return;
      }

      if (!(await verifyRequesterShiftExists(swapRequest.requester_shift_id))) {
        toast({
          title: "Shift already covered",
          description: "This shift is no longer available to swap.",
          variant: "destructive"
        });
        await invalidateSwapRequests.mutateAsync();
        return;
      }

      const counterShiftTime = await resolveCounterOfferShiftTime(
        swapRequest.accepter_id,
        swapRequest.counter_offer_date,
        swapRequest.requester_shift.time
      );

      await assertWHLCompliance(
        user.id,
        swapRequest.counter_offer_date,
        counterShiftTime
      );

      await completeSwapAcceptance(swapRequest);

      toast({
        title: "Counter-Offer Accepted",
        description: "You have accepted the counter-offer and the shifts have been swapped",
      });

      if (typeof window !== 'undefined' && (window as Window & { refreshCalendarShifts?: () => void }).refreshCalendarShifts) {
        (window as Window & { refreshCalendarShifts?: () => void }).refreshCalendarShifts?.();
      }

      setTimeout(() => {
        window.location.reload();
      }, 1000);

      await invalidateSwapRequests.mutateAsync();
    } catch (error) {
      console.error('Error in handleAcceptCounterOffer:', error);
      const message = error instanceof Error ? error.message : 'Failed to accept counter-offer';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const handleRejectCounterOffer = async (swapId: string) => {
    try {
      console.log('=== REJECTING COUNTER-OFFER ===');
      console.log('Swap ID:', swapId);
      
      // Update the swap request status to declined
      const { error } = await supabase
        .from('swap_requests')
        .update({ 
          status: 'declined'
        })
        .eq('id', swapId);

      if (error) {
        console.error('Error rejecting counter-offer:', error);
        throw error;
      }

      console.log('Counter-offer rejected successfully');

      toast({
        title: "Counter-Offer Rejected",
        description: "You have rejected the counter-offer",
      });

      if (user) {
        await invalidateSwapRequests.mutateAsync();
      }
    } catch (error) {
      console.error('Error in handleRejectCounterOffer:', error);
      toast({
        title: "Error",
        description: "Failed to reject counter-offer",
        variant: "destructive"
      });
    }
  };

  const handleRevokeRequest = async (swapId: string) => {
    try {
      console.log('=== REVOKING SWAP REQUEST ===');
      console.log('Swap ID:', swapId);
      
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      // First, get the swap request details to confirm it belongs to the current user
      const { data: swapRequest, error: fetchError } = await supabase
        .from('swap_requests')
        .select('*')
        .eq('id', swapId)
        .eq('requester_id', user.id) // Ensure only the requester can revoke
        .single();

      if (fetchError || !swapRequest) {
        toast({
          title: "Error",
          description: "Swap request not found or you don't have permission to revoke it",
          variant: "destructive"
        });
        return;
      }

      // Only allow revoking pending requests
      if (swapRequest.status !== 'pending') {
        toast({
          title: "Cannot Revoke",
          description: "Only pending requests can be revoked",
          variant: "destructive"
        });
        return;
      }

      const revokedCount = await revokeAllPendingSwapRequestsForShift(
        user.id,
        swapRequest.requester_shift_id
      );

      toast({
        title: "Request Revoked",
        description:
          revokedCount > 1
            ? `Cancelled ${revokedCount} pending requests to all recipients.`
            : 'Your swap request has been cancelled.',
      });

      // Refresh the requests
      if (user) {
        await invalidateSwapRequests.mutateAsync();
      }
    } catch (error) {
      console.error('Error in handleRevokeRequest:', error);
      toast({
        title: "Error",
        description: "Failed to revoke swap request",
        variant: "destructive"
      });
    }
  };

  const openRevokeDialog = (swapId: string) => {
    setRequestToRevoke(swapId);
    setRevokeDialogOpen(true);
  };

  const confirmRevoke = async () => {
    if (requestToRevoke) {
      await handleRevokeRequest(requestToRevoke);
      setRevokeDialogOpen(false);
      setRequestToRevoke(null);
    }
  };

  const navigateMonth = async (direction: 'prev' | 'next') => {
    console.log('=== NAVIGATING MONTH ===');
    console.log('Current month before:', currentMonth);
    console.log('Direction:', direction);
    console.log('Current state values:');
    console.log('  - currentSwapId:', currentSwapId);
    console.log('  - user:', user ? user.id : 'null');
    console.log('  - showCounterOffer:', showCounterOffer);
    
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    
    console.log('New month:', newMonth);
    console.log('New month string:', newMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
    
    setCurrentMonth(newMonth);
    
    // Use showCounterOffer instead of currentSwapId since that's what's actually working
    const activeSwapId = showCounterOffer;
    
    // Refresh available shifts for the new month
    if (activeSwapId && user) {
      console.log('Active swap ID from showCounterOffer:', activeSwapId);
      console.log('User ID:', user.id);
      
      const swapRequest = incomingRequests.find(req => req.id === activeSwapId);
      console.log('Found swap request:', swapRequest);
      
      if (swapRequest?.requester_shift?.date) {
        console.log('Requester shift date:', swapRequest.requester_shift.date);
        console.log('Calling fetchAvailableShifts with new month:', newMonth);
        
        // Set loading state and clear current available shifts
        setLoadingCounterShifts(true);
        setAvailableShifts([]);
        
        // Fetch new shifts for the new month and await it
        await fetchAvailableShifts(user.id, swapRequest.requester_shift.date, activeSwapId, newMonth);
      } else {
        console.log('No swap request or requester shift date found');
        setLoadingCounterShifts(false);
      }
    } else {
      console.log('No active swap ID or user');
      console.log('  - activeSwapId is:', activeSwapId);
      console.log('  - user is:', user);
      setLoadingCounterShifts(false);
    }
  };

  const resetToCurrentMonth = async () => {
    const today = new Date();
    setCurrentMonth(today);
    
    // Use showCounterOffer instead of currentSwapId since that's what's actually working
    const activeSwapId = showCounterOffer;
    
    // Refresh available shifts for current month
    if (activeSwapId && user) {
      const swapRequest = incomingRequests.find(req => req.id === activeSwapId);
      if (swapRequest?.requester_shift?.date) {
        setLoadingCounterShifts(true);
        setAvailableShifts([]);
        await fetchAvailableShifts(user.id, swapRequest.requester_shift.date, activeSwapId, today);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto lg:max-w-5xl xl:max-w-6xl w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manage Swaps</h2>
          <p className="text-sm text-slate-500">Review and respond to swap requests</p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/swaps/create')}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shrink-0"
        >
          New request
        </Button>
      </div>

      <div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Incoming Requests</CardTitle>
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                <ArrowLeftRight className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{incomingRequests.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed Swaps</CardTitle>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {myRequests.filter(req => req.status === 'accepted').length + 
                 incomingRequests.filter(req => req.status === 'accepted').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
          {loading && !incomingRequests.length && !myRequests.length ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          ) : (
          <div className="swap-requests-tabs flex flex-col gap-6 md:gap-8">
            <div className="w-full p-4 md:p-5 bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="flex flex-col w-full gap-3 sm:gap-4">
                <Button
                  type="button"
                  onClick={() => setActiveTab('incoming')}
                  className={`w-full min-h-14 px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'incoming'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="font-medium text-sm sm:text-base">Incoming</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 shrink-0">
                      {pendingIncomingRequests.length}
                    </Badge>
                  </div>
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab('counter-offers')}
                  className={`w-full min-h-14 px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'counter-offers'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="font-medium text-sm sm:text-base">Counter Offers</span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 shrink-0">
                      {myRequests.filter(r => r.status === 'pending' && r.counter_offer_date).length}
                    </Badge>
                  </div>
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab('my-requests')}
                  className={`w-full min-h-14 px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'my-requests'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="font-medium text-sm sm:text-base">My Requests</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 shrink-0">
                      {swapBroadcasts.length}
                    </Badge>
                  </div>
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab('accepted-swaps')}
                  className={`w-full min-h-14 px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'accepted-swaps'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="font-medium text-sm sm:text-base">Accepted Swaps</span>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0">
                      {myRequests.filter(r => r.status === 'accepted').length + incomingRequests.filter(r => r.status === 'accepted').length}
                    </Badge>
                  </div>
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab('dummy-swaps')}
                  className={`w-full min-h-14 px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'dummy-swaps'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="font-medium text-sm sm:text-base">Dummy Swaps</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 shrink-0">
                      {myRequests.filter(r => r.is_dummy).length + incomingRequests.filter(r => r.is_dummy).length}
                    </Badge>
                  </div>
                </Button>
              </div>
            </div>

              {activeTab === 'incoming' && (
              <div className="swap-requests-content space-y-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Incoming Swap Requests</h2>
                    <p className="text-gray-600">Review and respond to swap requests from other crew members.</p>
                </div>

                {pendingIncomingRequests.length === 0 ? (
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                      <CardHeader className="text-center pb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <ArrowLeftRight className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900">No Incoming Requests</CardTitle>
                        <CardDescription className="text-gray-600 max-w-2xl mx-auto">
                          You don't have any incoming swap requests at the moment. Check back later!
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-center">
                        <Button 
                          onClick={() => navigate('/swaps/create')}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                          Create Your Own Swap Request
                        </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {pendingIncomingRequests.map((request) => (
                        <Card key={request.id} className="bg-gradient-to-br from-white to-blue-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                              Request from {request.requester_staff?.staff_number}
                            </CardTitle>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span>Sent {new Date(request.created_at).toLocaleDateString('en-GB')}</span>
                                  <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                                    Pending Response
                            </Badge>
                          </div>
                              </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">THEIR SHIFT (you cover)</h4>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center space-x-2 text-gray-700 mb-2">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium">
                                      {request.requester_shift?.date
                                        ? formatDateGB(request.requester_shift.date)
                                        : '—'}
                                    </span>
                              </div>
                                  <div className="flex items-center space-x-2 text-gray-700">
                                    <Clock className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">{request.requester_shift?.time}</span>
                              </div>
                            </div>
                          </div>
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">OFFERED SHIFT</h4>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center space-x-2 text-gray-700 mb-2">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium">{request.counter_offer_date}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-gray-700">
                                    <Clock className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">Available for swap</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          {request.message && (
                              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                                  <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                                  Message
                                </h4>
                                <p className="text-gray-700">"{request.message}"</p>
                            </div>
                          )}

                            {/* Counter-offer selection interface */}
                              {showCounterOffer === request.id ? (
                              <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                  <h4 className="font-semibold text-blue-900 mb-3">SELECT A DATE FOR COUNTER-OFFER</h4>
                                  <p className="text-blue-700 text-sm mb-2">
                                    Choose a repay day: you work their shift on the date below, and they work your shift on the day you pick (they must be off, or a valid 04:15 ↔ 13:15 double).
                                  </p>
                                  <p className="text-xs text-slate-600 mb-4">
                                    You&apos;ll cover their shift on{' '}
                                    <span className="font-semibold">
                                      {formatDateGB(request.requester_shift?.date ?? '')}{' '}
                                      {formatShiftTimeLabel(request.requester_shift?.time ?? null)}
                                    </span>
                                  </p>
                                  <div className="flex flex-wrap gap-3 text-xs mb-4">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 border border-green-300 px-2 py-1 text-green-900">
                                      <span className="h-2 w-2 rounded-full bg-green-600" />
                                      Green — day off swap or valid double
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 border border-orange-300 px-2 py-1 text-orange-900">
                                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                                      Orange — days don&apos;t line up
                                    </span>
                                  </div>
                                  
                                  {/* Month Navigation */}
                                  <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg border border-blue-200">
                                    <Button
                                      onClick={() => navigateMonth('prev')}
                                      variant="outline"
                                      size="sm"
                                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                    >
                                      ← Previous Month
                                    </Button>
                                    
                                    <div className="text-center">
                                      <h5 className="font-semibold text-blue-900">
                                        {currentMonth.toLocaleDateString('en-GB', { 
                                          month: 'long', 
                                          year: 'numeric' 
                                        })}
                                      </h5>
                                      <Button
                                        onClick={resetToCurrentMonth}
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:text-blue-800 text-xs"
                                      >
                                        Today
                                      </Button>
                                    </div>
                                    
                                    <Button
                                      onClick={() => navigateMonth('next')}
                                      variant="outline"
                                      size="sm"
                                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                    >
                                      Next Month →
                                    </Button>
                                  </div>
                                    
                                    {loadingCounterShifts ? (
                                      <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                      <span className="text-sm text-blue-700">Loading available dates...</span>
                                      </div>
                                    ) : availableShifts.length > 0 ? (
                                      <div className="space-y-2">
                                      <p className="text-sm text-slate-700 font-medium">
                                          Dates this month ({availableShifts.filter((s) => s.canSelect).length} selectable)
                                        </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[min(420px,50vh)] overflow-y-auto pr-1">
                                        {availableShifts.map((shift) => {
                                          const selected = selectedCounterShift === shift.id
                                          const kindLabel =
                                            shift.matchKind === 'double'
                                              ? 'Valid double'
                                              : shift.matchKind === 'standard'
                                                ? 'Day off swap'
                                                : 'No match'
                                          return (
                                          <button
                                            type="button"
                                            key={shift.id}
                                            disabled={!shift.canSelect}
                                            className={counterOfferCardClass(shift.matchKind, selected)}
                                            onClick={() => {
                                              if (shift.canSelect) setSelectedCounterShift(shift.id)
                                            }}
                                          >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                              <div className="text-left">
                                                <div className="text-sm font-semibold text-gray-900">
                                                  {formatDateGB(shift.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </div>
                                                <div className="text-xs font-medium mt-0.5 opacity-90">{kindLabel}</div>
                                              </div>
                                              {shift.matchKind === 'double' && (
                                                <Badge className="bg-green-700 text-white shrink-0 text-[10px]">Double</Badge>
                                              )}
                                            </div>
                                            <div className="space-y-1 text-xs text-left">
                                              <p>
                                                <span className="font-semibold">Your shift:</span>{' '}
                                                {formatShiftTimeLabel(shift.userShiftTime)}
                                              </p>
                                              <p>
                                                <span className="font-semibold">Their shift:</span>{' '}
                                                {formatShiftTimeLabel(shift.requesterShiftTime)}
                                              </p>
                                              <p className="text-[11px] opacity-80 pt-1 border-t border-current/10">
                                                You cover them on {formatDateGB(shift.swapShiftDate)} ·{' '}
                                                {formatShiftTimeLabel(shift.swapShiftTime)}
                                              </p>
                                            </div>
                                          </button>
                                        )})}
                                      </div>
                                      </div>
                                    ) : (
                                    <div className="text-sm text-red-700">
                                      ❌ No dates available for counter-offer in {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                      </div>
                                    )}
                                  </div>
                                  
                                <div className="flex gap-3">
                                    <Button 
                                    onClick={() => handleAcceptSwapWithCounterOffer(request.id, selectedCounterShift)}
                                      disabled={!selectedCounterShift}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                    Send Counter-Offer
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      onClick={() => {
                                        setShowCounterOffer(null);
                                        setSelectedCounterShift("");
                                        setAvailableShifts([]);
                                      }}
                                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl transition-all duration-300"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <Button 
                                  onClick={() => handleAcceptSwap(request.id)}
                                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                                    >
                                      Counter-Offer
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      onClick={() => handleRejectSwap(request.id)}
                                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50 py-3 rounded-xl transition-all duration-300"
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
                </div>
              </div>
              )}

              {activeTab === 'counter-offers' && (
              <div className="swap-requests-content space-y-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Counter Offers to Review</h2>
                    <p className="text-gray-600">
                    Review counter-offers from crew members responding to your swap requests
                  </p>
                </div>

                {myRequests.filter(r => r.status === 'pending' && r.counter_offer_date).length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">No counter offers</p>
                      <p className="text-muted-foreground">
                        You don't have any counter-offers to review at the moment.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {myRequests
                      .filter(request => request.status === 'pending' && request.counter_offer_date)
                      .map((request) => (
                      <Card key={request.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <User className="h-5 w-5" />
                              Counter Offer from {request.accepter_staff?.staff_number}
                            </CardTitle>
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Counter Offer
                            </Badge>
                          </div>
                          <CardDescription>
                            Received {format(new Date(request.created_at), 'd MMM yyyy', { locale: enGB })}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">YOUR ORIGINAL SHIFT</h4>
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
                          
                          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg mt-3">
                            <h4 className="font-medium text-sm mb-2">COUNTER-OFFER RECEIVED</h4>
                            <div className="grid gap-2 sm:grid-cols-2 text-sm">
                              <div className="rounded-md bg-white/80 p-2 border border-orange-200">
                                <p className="text-xs font-semibold text-orange-800 mb-1">You work (their day)</p>
                                <p className="font-medium">
                                  {formatDateGB(request.counter_offer_date ?? '')}
                                </p>
                                <p className="text-gray-700 flex items-center gap-1 mt-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatShiftTimeLabel(counterOfferTimes[request.id] || null)}
                                </p>
                              </div>
                              <div className="rounded-md bg-white/80 p-2 border border-orange-200">
                                <p className="text-xs font-semibold text-orange-800 mb-1">They work (your day)</p>
                                <p className="font-medium">
                                  {request.requester_shift?.date
                                    ? formatDateGB(request.requester_shift.date)
                                    : '—'}
                                </p>
                                <p className="text-gray-700 flex items-center gap-1 mt-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatShiftTimeLabel(request.requester_shift?.time ?? null)}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                              {request.accepter_staff?.staff_number} covers your{' '}
                              {formatShiftTimeLabel(request.requester_shift?.time ?? null)} on{' '}
                              {request.requester_shift?.date
                                ? formatDateGB(request.requester_shift.date)
                                : 'your shift day'}{' '}
                              if you cover their shift on{' '}
                              {request.counter_offer_date
                                ? formatDateGB(request.counter_offer_date)
                                : 'the offered day'}
                              .
                            </p>
                            
                            <div className="flex gap-2 mt-3">
                              <Button 
                                onClick={() => handleAcceptCounterOffer(request.id)}
                                size="sm"
                                className="flex-1"
                              >
                                Accept Counter-Offer
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => handleRejectCounterOffer(request.id)}
                                size="sm"
                                className="flex-1"
                              >
                                Reject Counter-Offer
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                </div>
              </div>
              )}

              {activeTab === 'my-requests' && (
              <div className="swap-requests-content space-y-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Swap Requests</h2>
                    <p className="text-gray-600">Track swap requests you've sent to other crew members.</p>
                </div>

                {swapBroadcasts.length === 0 ? (
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
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
                    {swapBroadcasts.map((summary) => (
                      <SwapBroadcastHubCard
                        key={summary.requesterShiftId}
                        summary={summary}
                        onRevoke={openRevokeDialog}
                        onReviewCounterOffers={() => setActiveTab('counter-offers')}
                      />
                    ))}
                  </div>
                )}
                </div>
              </div>
              )}

              {activeTab === 'accepted-swaps' && (
              <div className="swap-requests-content space-y-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Accepted Swaps</h2>
                    <p className="text-gray-600">View all your accepted swap requests and their details.</p>
                  </div>

                  {/* Get all accepted swaps from both my requests and incoming requests */}
                  {(() => {
                    const acceptedMyRequests = myRequests.filter(r => r.status === 'accepted');
                    const acceptedIncomingRequests = incomingRequests.filter(r => r.status === 'accepted');
                    const allAcceptedSwaps = [...acceptedMyRequests, ...acceptedIncomingRequests];

                    if (allAcceptedSwaps.length === 0) {
                      return (
                        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-lg">
                          <CardHeader className="text-center pb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <ArrowLeftRight className="h-8 w-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-gray-900">No Accepted Swaps</CardTitle>
                            <CardDescription className="text-gray-600 max-w-2xl mx-auto">
                              You don't have any accepted swaps at the moment. Check back after accepting some swap requests!
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {allAcceptedSwaps.map((swap) => (
                          <Card key={swap.id} className="bg-gradient-to-br from-white to-emerald-50 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                                    {swap.requester_id === user?.id 
                                      ? `Swap with ${swap.accepter_staff?.staff_number || 'Staff Member'}`
                                      : `Swap with ${swap.requester_staff?.staff_number || 'Staff Member'}`
                                    }
                                  </CardTitle>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span>Accepted {new Date(swap.created_at).toLocaleDateString('en-GB')}</span>
                                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
                                      Accepted
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                                    {swap.requester_id === user?.id ? 'YOUR ORIGINAL SHIFT' : 'THEIR ORIGINAL SHIFT'}
                                  </h4>
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center space-x-2 text-gray-700 mb-2">
                                      <Calendar className="h-4 w-4 text-blue-600" />
                                      <span className="font-medium">{swap.requester_shift?.date}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-gray-700">
                                      <Clock className="h-4 w-4 text-green-600" />
                                      <span className="font-medium">{swap.requester_shift?.time}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                                    {swap.requester_id === user?.id ? 'THEIR OFFERED SHIFT' : 'YOUR OFFERED SHIFT'}
                                  </h4>
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center space-x-2 text-gray-700 mb-2">
                                      <Calendar className="h-4 w-4 text-blue-600" />
                                      <span className="font-medium">{swap.counter_offer_date || 'Not specified'}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-gray-700">
                                      <Clock className="h-4 w-4 text-green-600" />
                                      <span className="font-medium">
                                        {swap.counter_offer_date ? 'Available for swap' : 'Not specified'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {swap.message && (
                                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
                                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                                    <MessageSquare className="h-4 w-4 mr-2 text-emerald-600" />
                                    Message
                                  </h4>
                                  <p className="text-gray-700">"{swap.message}"</p>
                                </div>
                              )}
                              
                              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-emerald-800">
                                    ✅ This swap has been accepted and is now active
                                  </span>
        </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              )}

              {activeTab === 'dummy-swaps' && (
              <div className="swap-requests-content space-y-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Dummy Swaps</h2>
                    <p className="text-gray-600">
                      Track temporary swaps with placeholder dates that need to be resolved when dates open.
                    </p>
                  </div>

                  {(() => {
                    const dummyMyRequests = myRequests.filter(r => r.is_dummy);
                    const dummyIncomingRequests = incomingRequests.filter(r => r.is_dummy);
                    const allDummySwaps = [...dummyMyRequests, ...dummyIncomingRequests];

                    if (allDummySwaps.length === 0) {
                      return (
                        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
                          <CardHeader className="text-center pb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Calendar className="h-8 w-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-gray-900">No Dummy Swaps</CardTitle>
                            <CardDescription className="text-gray-600 max-w-2xl mx-auto">
                              You don't have any dummy swaps at the moment. Dummy swaps are temporary swaps with placeholder dates that need to be resolved when dates open.
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {allDummySwaps.map((swap) => (
                          <Card key={swap.id} className="bg-gradient-to-br from-white to-yellow-50 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                                    {swap.requester_id === user?.id 
                                      ? `Dummy Swap with ${swap.accepter_staff?.staff_number || 'Staff Member'}`
                                      : `Dummy Swap with ${swap.requester_staff?.staff_number || 'Staff Member'}`
                                    }
                                  </CardTitle>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span>Created {new Date(swap.created_at).toLocaleDateString('en-GB')}</span>
                                    <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
                                      Dummy Swap
                                    </Badge>
                                    <Badge variant={getStatusBadge(swap.status)}>
                                      {swap.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                <p className="text-sm font-medium text-yellow-900 mb-2">
                                  ⚠️ This is a temporary swap with placeholder dates
                                </p>
                                <p className="text-xs text-yellow-700">
                                  When dates open, you'll need to resolve this swap by returning the dummy date and receiving the final repayment date.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                                    ORIGINAL SHIFT TO SWAP
                                  </h4>
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center space-x-2 text-gray-700 mb-2">
                                      <Calendar className="h-4 w-4 text-blue-600" />
                                      <span className="font-medium">{swap.requester_shift?.date}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-gray-700">
                                      <Clock className="h-4 w-4 text-green-600" />
                                      <span className="font-medium">{swap.requester_shift?.time}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                                    SHIFT BEING WORKED
                                  </h4>
                                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center space-x-2 text-gray-700 mb-2">
                                      <Calendar className="h-4 w-4 text-blue-600" />
                                      <span className="font-medium">{swap.accepter_shift?.date || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-gray-700">
                                      <Clock className="h-4 w-4 text-green-600" />
                                      <span className="font-medium">{swap.accepter_shift?.time || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {swap.dummy_repay_date && (
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                  <h4 className="font-semibold text-blue-900 text-sm mb-2">DUMMY REPAYMENT DATE (Placeholder)</h4>
                                  <div className="flex items-center space-x-2 text-blue-700">
                                    <Calendar className="h-4 w-4" />
                                    <span className="font-medium">{swap.dummy_repay_date}</span>
                                  </div>
                                  <p className="text-xs text-blue-600 mt-2">
                                    This is the temporary placeholder date within the allowed swap period.
                                  </p>
                                </div>
                              )}

                              {swap.final_repay_date && (
                                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                  <h4 className="font-semibold text-purple-900 text-sm mb-2">FINAL REPAYMENT DATE (To be resolved)</h4>
                                  <div className="flex items-center space-x-2 text-purple-700">
                                    <Calendar className="h-4 w-4" />
                                    <span className="font-medium">{swap.final_repay_date}</span>
                                  </div>
                                  <p className="text-xs text-purple-600 mt-2">
                                    This is the actual desired repayment date outside the allowed swap period. This swap needs to be resolved when dates open.
                                  </p>
                                </div>
                              )}

                              {swap.message && (
                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                                    <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                                    Message
                                  </h4>
                                  <p className="text-gray-700">"{swap.message}"</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              )}
            </div>
          )}
      </div>

        {/* Revoke Confirmation Dialog */}
        <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your swap request and remove it from all recipients.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRevoke} className="bg-red-600 hover:bg-red-700">
                Revoke
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default ManageSwaps;
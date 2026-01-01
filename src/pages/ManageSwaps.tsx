import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Clock, MapPin, User, Calendar, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import { getCurrentUser, type Staff } from "@/lib/auth";
import { validateWHL, executeShiftSwap } from '@/lib/shifts';
import { supabase } from "@/integrations/supabase/client";
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

type SwapRequestWithDetails = {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  accepter_id: string | null;
  accepter_shift_id: string | null;
  counter_offer_date: string | null;
  status: string;
  message: string | null;
  created_at: string;
  is_dummy?: boolean;
  dummy_repay_date?: string | null;
  final_repay_date?: string | null;
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
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [requestToRevoke, setRequestToRevoke] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentSwapId, setCurrentSwapId] = useState<string | null>(null);
  // Deep-link: open a specific swap request from notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openId = params.get('open');
    if (openId) {
      setShowCounterOffer(openId);
      setCurrentSwapId(openId);
      // Ensure month is reset to current when opening from link
      setCurrentMonth(new Date());
    }
  }, []);

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
      declined: "destructive",
      counter_offered: "outline"
    };
    return variants[status] || "secondary";
  };

  const fetchAvailableShifts = async (userId: string, requesterShiftDate: string, swapId: string, targetMonth?: Date) => {
    try {
      setLoadingCounterShifts(true);
      
      console.log('=== FETCHING AVAILABLE SHIFTS FOR COUNTER-OFFER ===');
      console.log('User ID:', userId);
      console.log('Requester shift date:', requesterShiftDate);
      console.log('Swap ID:', swapId);
      console.log('Target month:', targetMonth);
      console.log('Requester shift date type:', typeof requesterShiftDate);

      // Helper: parse a date string (either DD/MM/YYYY or YYYY-MM-DD) into a Date at midnight local time
      const parseDate = (dateStr: string) => {
        // Check if it's YYYY-MM-DD format (database format)
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [yearStr, monthStr, dayStr] = dateStr.split('-');
          return new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
        }
        // Otherwise assume DD/MM/YYYY format
        const [dayStr, monthStr, yearStr] = dateStr.split('/');
        const day = Number(dayStr);
        const monthIndex = Number(monthStr) - 1; // zero-based
        const year = Number(yearStr);
        return new Date(year, monthIndex, day);
      };

      // Helper: convert Date to YYYY-MM-DD format (database format)
      const toDatabaseDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Helper: normalize date string to database format (YYYY-MM-DD)
      const normalizeToDatabaseFormat = (dateStr: string): string => {
        // If already in YYYY-MM-DD format, return as is
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateStr;
        }
        // Convert from DD/MM/YYYY to YYYY-MM-DD
        const [dayStr, monthStr, yearStr] = dateStr.split('/');
        return `${yearStr}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
      };
      
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

      // Get the requester's staff ID to find their shifts
      const { data: requesterStaff, error: requesterStaffError } = await supabase
        .from('swap_requests')
        .select('requester_id')
        .eq('id', swapId)
        .single();

      if (requesterStaffError) {
        console.error('Error fetching requester staff ID:', requesterStaffError);
        return [];
      }

      console.log('Requester staff ID:', requesterStaff.requester_id);

      // Get all shifts for the requester
      const { data: requesterShifts, error: requesterShiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', requesterStaff.requester_id)
        .order('date', { ascending: true });

      if (requesterShiftsError) {
        console.error('Error fetching requester shifts:', requesterShiftsError);
        return [];
      }

      console.log('Requester shifts:', requesterShifts);

      // Get leave days for the user (accepter)
      const { data: userLeaveDays, error: userLeaveError } = await supabase
        .from('leave_days')
        .select('date')
        .eq('staff_id', userId);

      if (userLeaveError) {
        console.error('Error fetching user leave days:', userLeaveError);
      }

      // Get leave days for the requester
      const { data: requesterLeaveDays, error: requesterLeaveError } = await supabase
        .from('leave_days')
        .select('date')
        .eq('staff_id', requesterStaff.requester_id);

      if (requesterLeaveError) {
        console.error('Error fetching requester leave days:', requesterLeaveError);
      }

      // Create sets of leave dates in database format for quick lookup
      const userLeaveDates = new Set(
        (userLeaveDays || []).map(ld => normalizeToDatabaseFormat(ld.date))
      );
      const requesterLeaveDates = new Set(
        (requesterLeaveDays || []).map(ld => normalizeToDatabaseFormat(ld.date))
      );

      console.log('User leave dates:', Array.from(userLeaveDates));
      console.log('Requester leave dates:', Array.from(requesterLeaveDates));

      // Normalize requester shift date to database format for comparison
      const normalizedRequesterShiftDate = normalizeToDatabaseFormat(requesterShiftDate);
      
      // Check if user is working on the requester's date
      const userWorkingOnRequesterDate = (userShifts || []).some(
        shift => normalizeToDatabaseFormat(shift.date) === normalizedRequesterShiftDate
      );
      
      console.log('User working on requester date:', userWorkingOnRequesterDate);
      console.log('All user shifts:', userShifts);
      console.log('Checking for requester date:', requesterShiftDate);
      console.log('User shift dates:', (userShifts || []).map(s => s.date));

      // Get all future dates where the user is OFF (no shifts)
      const futureDates = [];
      const today = new Date();
      // Normalize to midnight to avoid time drift in comparisons
      today.setHours(0, 0, 0, 0);
      
      // Use target month if provided, otherwise use current month
      let startDate, endDate;
      if (targetMonth) {
        // For target month, start from the 1st of that month
        startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
        // End on the last day of that month
        endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
      } else {
        // For current month, start from today
        startDate = today;
        endDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      }
      
      // Generate dates for the specified month or next 30 days
      const daysInMonth = targetMonth ? 
        new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate() : 
        Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      
      // Generate dates in database format (YYYY-MM-DD) for proper comparison
      const nextDays = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return toDatabaseDate(date);
      });

      console.log('Target month:', targetMonth ? `${targetMonth.getMonth() + 1}/${targetMonth.getFullYear()}` : 'Current month');
      console.log('Date range:', { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] });
      console.log('Days in month:', daysInMonth);
      console.log('Generated dates:', nextDays);
      if (targetMonth) {
        console.log(`Filtering for month: ${targetMonth.getMonth() + 1}/${targetMonth.getFullYear()}`);
        console.log('Target month object:', targetMonth);
        console.log('Target month getMonth():', targetMonth.getMonth());
        console.log('Target month getFullYear():', targetMonth.getFullYear());
      }

      // Find dates where user is OFF and can work the requester's shift
      const availableDates = nextDays.filter(dateStr => {
        // dateStr is now in YYYY-MM-DD format (database format)
        // Skip past dates
        const dateObj = parseDate(dateStr);
        if (dateObj < today) {
          console.log(`❌ ${dateStr} - Past date, skipping`);
          return false;
        }
        
        // If we have a target month, ensure the date is from that month
        if (targetMonth) {
          const isFromTargetMonth = dateObj.getMonth() === targetMonth.getMonth() && 
                                    dateObj.getFullYear() === targetMonth.getFullYear();
          if (!isFromTargetMonth) {
            console.log(`❌ ${dateStr} - Not from target month ${targetMonth.getMonth() + 1}/${targetMonth.getFullYear()}, skipping`);
            return false;
          }
          console.log(`✅ ${dateStr} - From target month ${targetMonth.getMonth() + 1}/${targetMonth.getFullYear()}`);
        }
        
        // Skip if user is on leave on this date
        if (userLeaveDates.has(dateStr)) {
          console.log(`❌ ${dateStr} - User is on leave, skipping`);
          return false;
        }

        // Skip if requester is on leave on this date (they can't work their shift)
        if (requesterLeaveDates.has(dateStr)) {
          console.log(`❌ ${dateStr} - Requester is on leave, skipping`);
          return false;
        }

        // Check if user has any shifts on this date (normalize both to database format for comparison)
        const userShiftsOnThisDate = (userShifts || []).filter(shift => 
          normalizeToDatabaseFormat(shift.date) === dateStr
        );
        const userIsOffOnThisDate = userShiftsOnThisDate.length === 0;
        
        // Check if requester has any shifts on this date (normalize both to database format for comparison)
        const requesterShiftsOnThisDate = (requesterShifts || []).filter(shift => 
          normalizeToDatabaseFormat(shift.date) === dateStr
        );
        const requesterIsWorkingOnThisDate = requesterShiftsOnThisDate.length > 0;
        
        console.log(`Date ${dateStr}: User ${userIsOffOnThisDate ? 'OFF' : 'WORKING'} (${userShiftsOnThisDate.length} shifts), Requester ${requesterIsWorkingOnThisDate ? 'WORKING' : 'OFF'} (${requesterShiftsOnThisDate.length} shifts)`);
        console.log(`User shifts on ${dateStr}:`, userShiftsOnThisDate);
        console.log(`Requester shifts on ${dateStr}:`, requesterShiftsOnThisDate);
        
        // CASE 1: Standard swap - User is OFF and requester is working
        if (userIsOffOnThisDate && requesterIsWorkingOnThisDate) {
          console.log(`✅ ${dateStr} - Standard swap: User is OFF and requester is working`);
          return true;
        }
        
        // CASE 2: Time swap - Both are working but with different shift times
        if (!userIsOffOnThisDate && requesterIsWorkingOnThisDate) {
          const userShiftTime = userShiftsOnThisDate[0]?.time;
          const requesterShiftTime = requesterShiftsOnThisDate[0]?.time;
          
          console.log(`Time swap check: User shift ${userShiftTime}, Requester shift ${requesterShiftTime}`);
          
          // Check for 4:15 ↔ 13:15 swap
          const isTimeSwap = (
            (userShiftTime === '04:15' && requesterShiftTime === '13:15') ||
            (userShiftTime === '13:15' && requesterShiftTime === '04:15')
          );
          
          if (isTimeSwap) {
            console.log(`✅ ${dateStr} - Time swap: ${userShiftTime} ↔ ${requesterShiftTime}`);
            return true;
          } else {
            console.log(`❌ ${dateStr} - Both working but not compatible times: ${userShiftTime} vs ${requesterShiftTime}`);
            return false;
          }
        }
        
        // CASE 3: Double shift - User is working but can work doubles for requester
        if (!userIsOffOnThisDate && userWorkingOnRequesterDate && canWorkDoubles) {
          console.log(`✅ ${dateStr} - Double shift: User is working but can work doubles for requester`);
          return true;
        }
        
        // CASE 4: No swap opportunity
        console.log(`❌ ${dateStr} - No swap opportunity`);
        return false;
      });

      console.log('Available dates for counter-offer:', availableDates);

      // Final filter: ensure all dates are from the target month if specified
      // (This is already done in the filter above, but keeping for safety)
      let finalAvailableDates = availableDates;
      if (targetMonth) {
        console.log('=== FINAL MONTH FILTERING ===');
        console.log('Available dates before final filter:', availableDates);
        console.log('Target month for filtering:', targetMonth);
        
        finalAvailableDates = availableDates.filter(date => {
          const dateObj = parseDate(date); // date is in YYYY-MM-DD format
          const dateMonth = dateObj.getMonth();
          const dateYear = dateObj.getFullYear();
          const targetMonthNum = targetMonth.getMonth();
          const targetYear = targetMonth.getFullYear();
          
          console.log(`Checking date ${date}: month=${dateMonth}, year=${dateYear} vs target month=${targetMonthNum}, year=${targetYear}`);
          
          const isFromTargetMonth = dateMonth === targetMonthNum && dateYear === targetYear;
          console.log(`Date ${date} is from target month: ${isFromTargetMonth}`);
          
          return isFromTargetMonth;
        });
        
        console.log(`Final filtered dates for ${targetMonth.getMonth() + 1}/${targetMonth.getFullYear()}:`, finalAvailableDates);
      }

      // Create mock shift objects for the available dates
      const availableShiftsForCounterOffer = finalAvailableDates.map(date => ({
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
    try {
      // First, get the swap request details to see what dates the requester is off
      const { data: swapRequest, error: fetchError } = await supabase
        .from('swap_requests')
        .select(`
          *,
          requester_staff:staff!swap_requests_requester_id_fkey(*),
          requester_shift:shifts!swap_requests_requester_shift_id_fkey(*)
        `)
        .eq('id', swapId)
        .single();

      if (fetchError) throw fetchError;

      // Get the requester's shifts to see what dates they're working
      const { data: requesterShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', swapRequest.requester_id)
        .gte('date', new Date().toISOString().split('T')[0]); // From today onwards

      if (shiftsError) throw shiftsError;

      // Find dates where the requester is NOT working (they're off)
      const requesterWorkingDates = requesterShifts.map(shift => shift.date);
      const today = new Date();
      const futureDates = [];
      
      // Generate dates for the next 30 days
      for (let i = 1; i <= 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // If the requester is not working on this date, it's available for swap
        if (!requesterWorkingDates.includes(dateStr)) {
          futureDates.push(dateStr);
        }
      }

      // Show available dates for counter-offer
      if (futureDates.length > 0) {
        // Store the available dates and swap request for counter-offer selection
        setAvailableShifts(futureDates.map(date => ({ id: date, date, is_counter_offer: true })));
        setShowCounterOffer(swapId);
        setSelectedCounterShift("");
        
        toast({
          title: "Select Counter-Offer Date",
          description: `Please select a date when ${swapRequest.requester_staff?.staff_number || 'the requester'} is off to send as a counter-offer.`,
        });
      } else {
        toast({
          title: "No Available Dates",
          description: "The requester is working on all available dates. Cannot accept this swap.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error accepting swap:', error);
        toast({
          title: "Error",
        description: "Failed to accept swap request",
          variant: "destructive"
        });
    }
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

      // Extract the date from the selected shift ID (format: "counter-offer-YYYY-MM-DD")
      // or find the shift in availableShifts to get the date
      const selectedShift = availableShifts.find(s => s.id === selectedShiftId);
      if (!selectedShift) {
        toast({
          title: "Error",
          description: "Selected date not found",
          variant: "destructive"
        });
        return;
      }

      const counterOfferDate = selectedShift.date; // This is now in YYYY-MM-DD format

      // Update the swap request with the counter-offer date
      const { error } = await supabase
        .from('swap_requests')
        .update({ 
          status: 'pending',
          counter_offer_date: counterOfferDate
        })
        .eq('id', swapId);

      if (error) throw error;

      // Format date for display
      const displayDate = (() => {
        const [y, m, d] = counterOfferDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      })();

      toast({
        title: "Counter-Offer Sent",
        description: `Your counter-offer for ${displayDate} has been sent to the requester`,
      });

      // Reload the requests
      await loadIncomingRequests(user.id);
      
      // Reset the counter-offer UI
      setShowCounterOffer(null);
      setSelectedCounterShift("");
      setAvailableShifts([]);
    } catch (error) {
      console.error('Error sending counter-offer:', error);
      toast({
        title: "Error",
        description: "Failed to send counter-offer",
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

  const handleAcceptDirectSwap = async (swapId: string) => {
    try {
      console.log('=== ACCEPTING DIRECT SWAP ===');
      console.log('Swap ID:', swapId);
      
      // Find the swap request to get all the details
      const swapRequest = incomingRequests.find(req => req.id === swapId);
      if (!swapRequest) {
        console.error('Swap request not found');
        toast({
          title: "Error",
          description: "Swap request not found",
          variant: "destructive"
        });
        return;
      }

      console.log('Found swap request:', swapRequest);
      
      // Update the swap request status to accepted
      const { error } = await supabase
        .from('swap_requests')
        .update({ 
          status: 'accepted'
        })
        .eq('id', swapId);

      if (error) {
        console.error('Error accepting direct swap:', error);
        throw error;
      }

      console.log('Direct swap accepted, now executing shift swap...');

      // Execute the actual shift swap
      await executeShiftSwap(swapRequest);

      console.log('Direct swap accepted and shift swap executed successfully');

      toast({
        title: "Swap Accepted",
        description: "You have accepted the swap and the shifts have been exchanged",
      });

      // Refresh the calendar to show the new shifts
      if (typeof window !== 'undefined' && (window as any).refreshCalendarShifts) {
        (window as any).refreshCalendarShifts();
      }

      // Force a page reload to ensure all calendars are updated
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      if (user) {
        await loadIncomingRequests(user.id);
      }
    } catch (error) {
      console.error('Error in handleAcceptDirectSwap:', error);
      toast({
        title: "Error",
        description: "Failed to accept swap",
        variant: "destructive"
      });
    }
  };

  const handleAcceptCounterOffer = async (swapId: string) => {
    try {
      console.log('=== ACCEPTING COUNTER-OFFER ===');
      console.log('Swap ID:', swapId);
      
      // Find the swap request to get all the details
      const swapRequest = myRequests.find(req => req.id === swapId);
      if (!swapRequest) {
        console.error('Swap request not found');
        toast({
          title: "Error",
          description: "Swap request not found",
          variant: "destructive"
        });
        return;
      }

      console.log('Found swap request:', swapRequest);
      
      // Update the swap request status to accepted
      const { error } = await supabase
        .from('swap_requests')
        .update({ 
          status: 'accepted'
        })
        .eq('id', swapId);

      if (error) {
        console.error('Error accepting counter-offer:', error);
        throw error;
      }

      console.log('Counter-offer accepted, now executing shift swap...');

      // Execute the actual shift swap
      await executeShiftSwap(swapRequest);

      console.log('Counter-offer accepted and shift swap executed successfully');

      toast({
        title: "Counter-Offer Accepted",
        description: "You have accepted the counter-offer and the shifts have been swapped",
      });

      // Refresh the calendar to show the new shifts
      if (typeof window !== 'undefined' && (window as any).refreshCalendarShifts) {
        (window as any).refreshCalendarShifts();
      }

      // Force a page reload to ensure all calendars are updated
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      if (user) {
        await loadMyRequests(user.id);
      }
    } catch (error) {
      console.error('Error in handleAcceptCounterOffer:', error);
      toast({
        title: "Error",
        description: "Failed to accept counter-offer",
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
        await loadMyRequests(user.id);
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

      // Delete the swap request completely
      const { error: deleteError } = await supabase
        .from('swap_requests')
        .delete()
        .eq('id', swapId);

      if (deleteError) {
        console.error('Error revoking swap request:', deleteError);
        throw deleteError;
      }

      console.log('Swap request revoked successfully');

      toast({
        title: "Request Revoked",
        description: "Your swap request has been cancelled and removed from all recipients",
      });

      // Refresh the requests
      if (user) {
        await loadMyRequests(user.id);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Manage Swaps
              </h1>
              <p className="text-blue-100 text-lg">
                Review and respond to shift swap requests.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button 
                onClick={() => navigate('/swaps/create')}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Create Swap Request
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto bg-white text-blue-600 border-blue-300 hover:bg-blue-50 px-6 py-2 rounded-xl transition-all duration-300"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
          {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-lg">Loading swap requests...</p>
            </div>
          ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="manage-swaps-tabs">
            <div className="mb-8">
              <TabsList className="w-full p-4">
                <div className="flex flex-col w-full space-y-3">
                  <TabsTrigger 
                    value="incoming" 
                    className="w-full px-6 py-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-gray-50 data-[state=inactive]:text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium text-base whitespace-nowrap">Incoming</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 flex-shrink-0">
                        {incomingRequests.length}
                      </Badge>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="counter-offers" 
                    className="w-full px-6 py-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-gray-50 data-[state=inactive]:text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium text-base whitespace-nowrap">Counter Offers</span>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 flex-shrink-0">
                        {myRequests.filter(r => r.status === 'pending' && r.counter_offer_date).length}
                      </Badge>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="my-requests" 
                    className="w-full px-6 py-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-gray-50 data-[state=inactive]:text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium text-base whitespace-nowrap">My Requests</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 flex-shrink-0">
                        {myRequests.length}
                      </Badge>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="accepted-swaps" 
                    className="w-full px-6 py-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-gray-50 data-[state=inactive]:text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium text-base whitespace-nowrap">Accepted Swaps</span>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 flex-shrink-0">
                        {myRequests.filter(r => r.status === 'accepted').length + incomingRequests.filter(r => r.status === 'accepted').length}
                      </Badge>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="dummy-swaps" 
                    className="w-full px-6 py-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-gray-50 data-[state=inactive]:text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium text-base whitespace-nowrap">Dummy Swaps</span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 flex-shrink-0">
                        {myRequests.filter(r => r.is_dummy).length + incomingRequests.filter(r => r.is_dummy).length}
                      </Badge>
                    </div>
                  </TabsTrigger>
                </div>
              </TabsList>
            </div>

              <TabsContent value="incoming" className="manage-swaps-content space-y-6 mt-8">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Incoming Swap Requests</h2>
                    <p className="text-gray-600">Review and respond to swap requests from other crew members.</p>
                </div>

                {incomingRequests.length === 0 ? (
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
                    {incomingRequests.map((request) => (
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
                                <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">YOUR SHIFT TO SWAP</h4>
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center space-x-2 text-gray-700 mb-2">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium">{request.requester_shift?.date}</span>
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
                                  <p className="text-blue-700 text-sm mb-4">
                                    Choose a date when {request.requester_staff?.staff_number || 'the requester'} is off to work their shift in exchange.
                                  </p>
                                  
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
                                      <p className="text-sm text-green-700 font-medium">
                                          ✅ Available dates for counter-offer:
                                        </p>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {availableShifts.map((shift) => (
                                          <div
                                            key={shift.id}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                              selectedCounterShift === shift.id
                                                ? 'bg-blue-100 border-blue-300'
                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                            }`}
                                            onClick={() => setSelectedCounterShift(shift.id)}
                                          >
                                            <div className="text-center">
                                              <div className="text-sm font-medium text-gray-900">
                                                {(() => {
                                                  // Parse date (handles both YYYY-MM-DD and DD/MM/YYYY)
                                                  const dateStr = shift.date;
                                                  let dateObj: Date;
                                                  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                                    // YYYY-MM-DD format
                                                    const [y, m, d] = dateStr.split('-').map(Number);
                                                    dateObj = new Date(y, m - 1, d);
                                                  } else {
                                                    // DD/MM/YYYY format
                                                    const [d, m, y] = dateStr.split('/').map(Number);
                                                    dateObj = new Date(y, m - 1, d);
                                                  }
                                                  return dateObj.toLocaleDateString('en-GB', { 
                                                    month: 'short', 
                                                    day: 'numeric' 
                                                  });
                                                })()}
                                                </div>
                                              <div className="text-xs text-gray-500">
                                                {(() => {
                                                  // Parse date (handles both YYYY-MM-DD and DD/MM/YYYY)
                                                  const dateStr = shift.date;
                                                  let dateObj: Date;
                                                  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                                    // YYYY-MM-DD format
                                                    const [y, m, d] = dateStr.split('-').map(Number);
                                                    dateObj = new Date(y, m - 1, d);
                                                  } else {
                                                    // DD/MM/YYYY format
                                                    const [d, m, y] = dateStr.split('/').map(Number);
                                                    dateObj = new Date(y, m - 1, d);
                                                  }
                                                  return dateObj.toLocaleDateString('en-GB', { 
                                                    weekday: 'short' 
                                                  });
                                                })()}
                                                </div>
                                            </div>
                                          </div>
                                        ))}
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
                                      Accept Swap
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
              </TabsContent>

              <TabsContent value="counter-offers" className="manage-swaps-content space-y-6 mt-8">
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
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{request.counter_offer_date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  Available for swap
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                              {request.accepter_staff?.staff_number} is offering to work your shift on {request.requester_shift?.date} in exchange for you working their shift on {request.counter_offer_date}
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
              </TabsContent>

              <TabsContent value="my-requests" className="manage-swaps-content space-y-6 mt-8">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Swap Requests</h2>
                    <p className="text-gray-600">Track swap requests you've sent to other crew members.</p>
                </div>

                {myRequests.length === 0 ? (
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
                            Sent {format(new Date(request.created_at), 'd MMM yyyy', { locale: enGB })}
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
                              <h4 className="font-medium text-sm mb-2">SWAP ACCEPTED</h4>
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
                          
                          {request.status === 'pending' && request.counter_offer_date && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg mt-3">
                              <h4 className="font-medium text-sm mb-2">COUNTER-OFFER PENDING</h4>
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                A counter-offer has been made. Check the "Counter Offers" tab to review it.
                              </p>
                            </div>
                          )}

                            {/* Action Buttons */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    onClick={() => openRevokeDialog(request.id)}
                                    variant="destructive"
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Revoke Request
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                    onClick={() => navigate('/swaps')}
                                  >
                                    View Details
                                  </Button>
                                </>
                              )}
                              
                              {request.status === 'accepted' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-green-300 text-green-700 hover:bg-green-50"
                                  onClick={() => navigate('/swaps')}
                                >
                                  View Swap Details
                                </Button>
                              )}
                              
              {request.status === 'declined' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => navigate('/swaps')}
                >
                  View Details
                </Button>
              )}
            </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                </div>
              </TabsContent>

              {/* Add spacing below tabs */}
              <div className="h-8"></div>

              <TabsContent value="accepted-swaps" className="manage-swaps-content space-y-6 mt-8">
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
              </TabsContent>

              <TabsContent value="dummy-swaps" className="manage-swaps-content space-y-6 mt-8">
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
              </TabsContent>
            </Tabs>
          )}
      </main>

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
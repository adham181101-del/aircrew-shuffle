import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRightLeft, Calendar, Clock, MapPin, Users, RotateCcw } from "lucide-react";
import { getUserShifts, validateWHL, type Shift } from "@/lib/shifts";
import { getCurrentUser, type Staff } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const CreateSwapRequest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<Staff | null>(null);
  const [userShifts, setUserShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [eligibleStaff, setEligibleStaff] = useState<Staff[]>([]);
  const [message, setMessage] = useState("");
  const [loadingEligible, setLoadingEligible] = useState(false);
  
  // Time change request states
  const [selectedTimeChangeShift, setSelectedTimeChangeShift] = useState<string>("");
  const [desiredTime, setDesiredTime] = useState<string>("");
  const [timeChangeEligibleStaff, setTimeChangeEligibleStaff] = useState<Staff[]>([]);
  const [loadingTimeChangeEligible, setLoadingTimeChangeEligible] = useState(false);
  const [timeChangeMessage, setTimeChangeMessage] = useState("");

  // Dummy swap request states
  const [selectedDummyRequesterShift, setSelectedDummyRequesterShift] = useState<string>("");
  const [selectedDummyAccepterShift, setSelectedDummyAccepterShift] = useState<string>("");
  const [dummyRepayDate, setDummyRepayDate] = useState<string>("");
  const [finalRepayDate, setFinalRepayDate] = useState<string>("");
  const [dummyEligibleStaff, setDummyEligibleStaff] = useState<Staff[]>([]);
  const [loadingDummyEligible, setLoadingDummyEligible] = useState(false);
  const [dummyMessage, setDummyMessage] = useState("");

  // Get the selected shift data for display
  const selectedShiftData = userShifts.find(s => s.id === selectedShift);
  const selectedTimeChangeShiftData = userShifts.find(s => s.id === selectedTimeChangeShift);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (selectedShift) {
      findEligibleStaff();
    }
  }, [selectedShift]);

  useEffect(() => {
    if (selectedTimeChangeShift && desiredTime) {
      findTimeChangeEligibleStaff();
    }
  }, [selectedTimeChangeShift, desiredTime]);

  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      
      const shifts = await getUserShifts(currentUser.id);
      // Only show future shifts
      const futureShifts = shifts.filter(shift => new Date(shift.date) >= new Date());
      setUserShifts(futureShifts);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load your data",
        variant: "destructive"
      });
    }
  };

  const findEligibleStaff = async () => {
    if (!selectedShift || !user) return;
    
    setLoadingEligible(true);
    try {
      const shift = userShifts.find(s => s.id === selectedShift);
      if (!shift) return;

      console.log(`=== SWAP REQUEST DEBUG ===`);
      console.log(`Selected shift:`, shift);
      console.log(`Your user ID: ${user.id}`);
      console.log(`Your base location: ${user.base_location}`);
      console.log(`Looking for staff who are OFF on ${shift.date}`);
      console.log(`Shift date type: ${typeof shift.date}`);
      console.log(`Shift date value: "${shift.date}"`);

      // Use the new database function for better performance
      console.log('Fetching eligible staff using database function...');
      
      // Try to use the database function first, fallback to manual query if it fails
      // Note: Using 'as any' because the Supabase client doesn't have this RPC function typed
      // This is a known limitation - the function exists in the database but not in the TypeScript types
      try {
        const { data: eligibleStaffData, error: eligibleError } = await (supabase as any)
          .rpc('get_eligible_staff_for_swap', {
            requester_base_location: user.base_location,
            swap_date: shift.date,
            requester_id: user.id
          });

        if (eligibleError) {
          console.error('Error fetching eligible staff:', eligibleError);
          throw eligibleError;
        }

        if (eligibleStaffData && Array.isArray(eligibleStaffData)) {
          console.log(`Found ${eligibleStaffData.length} eligible staff members using database function`);
          setEligibleStaff(eligibleStaffData);
          return;
        } else {
          console.log('No eligible staff data returned from function');
          setEligibleStaff([]);
          return;
        }
      } catch (rpcError) {
        console.log('RPC function failed, falling back to manual query...');
        // Continue to fallback method below
      }

      // Fallback to manual query if function fails
      console.log('Falling back to manual query...');
      const { data: baseStaff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('base_location', user.base_location)
        .neq('id', user.id);

      if (staffError) {
        console.error('Error fetching staff:', staffError);
        throw staffError;
      }

      console.log(`Found ${baseStaff?.length || 0} staff members at ${user.base_location}`);
      
      // Get all shifts for the selected date to see who's working
      console.log('Fetching shifts for the selected date...');
      const { data: shiftsOnDate, error: shiftsError } = await supabase
        .from('shifts')
        .select('staff_id')
        .eq('date', shift.date);

      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        throw shiftsError;
      }

      // Create a set of staff IDs who are working on this date
      const workingStaffIds = new Set(shiftsOnDate?.map(s => s.staff_id) || []);
      
      // Filter to eligible staff (those who are OFF on the selected date)
      const eligibleList = baseStaff?.filter(staff => !workingStaffIds.has(staff.id)) || [];
      
      console.log(`\n=== FALLBACK RESULTS ===`);
      console.log(`Total staff at ${user.base_location}: ${baseStaff?.length || 0}`);
      console.log(`Staff working on ${shift.date}: ${workingStaffIds.size}`);
      console.log(`Eligible staff (OFF): ${eligibleList.length}`);
      
      setEligibleStaff(eligibleList);
      return;
    } catch (error) {
      console.error('Error finding eligible staff:', error);
      toast({
        title: "Error",
        description: "Failed to find eligible staff members",
        variant: "destructive"
      });
    } finally {
      setLoadingEligible(false);
    }
  };

  const findTimeChangeEligibleStaff = async () => {
    if (!selectedTimeChangeShift || !desiredTime || !user) return;
    
    setLoadingTimeChangeEligible(true);
    try {
      const shift = userShifts.find(s => s.id === selectedTimeChangeShift);
      if (!shift) return;

      console.log(`=== TIME CHANGE REQUEST DEBUG ===`);
      console.log(`Selected shift:`, shift);
      console.log(`Desired time: ${desiredTime}`);
      console.log(`Your user ID: ${user.id}`);
      console.log(`Your base location: ${user.base_location}`);
      console.log(`Looking for staff who have ${desiredTime} shift on ${shift.date}`);

      // Convert desired time to the format used in database (e.g., "5:30 AM" -> "05:30")
      const formatTimeForDB = (timeStr: string) => {
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':');
        let hour24 = parseInt(hours);
        
        if (period === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
          hour24 = 0;
        }
        
        return `${hour24.toString().padStart(2, '0')}:${minutes}`;
      };

      const desiredTimeFormatted = formatTimeForDB(desiredTime);
      console.log(`Desired time formatted for DB: ${desiredTimeFormatted}`);

      // First, let's check what shifts exist on this date
      const { data: allShiftsOnDate, error: allShiftsError } = await supabase
        .from('shifts')
        .select('*')
        .eq('date', shift.date);

      console.log(`All shifts on ${shift.date}:`, allShiftsOnDate);
      if (allShiftsError) {
        console.error('Error fetching all shifts on date:', allShiftsError);
      }

      // Filter shifts that start with the desired time
      const matchingShifts = allShiftsOnDate?.filter(shift => {
        if (!shift.time) return false;
        // Extract start time from range (e.g., "04:15-13:15" -> "04:15")
        const startTime = shift.time.split('-')[0];
        console.log(`Checking shift ${shift.id}: start time "${startTime}" vs desired "${desiredTimeFormatted}"`);
        return startTime === desiredTimeFormatted;
      }) || [];

      console.log(`Matching shifts for ${desiredTimeFormatted}:`, matchingShifts);

      // Get staff IDs from matching shifts (excluding current user)
      const matchingStaffIds = matchingShifts
        .filter(shift => shift.staff_id !== user.id)
        .map(shift => shift.staff_id);

      console.log(`Matching staff IDs:`, matchingStaffIds);

      if (matchingStaffIds.length === 0) {
        console.log(`No staff found with ${desiredTime} shifts on ${shift.date}`);
        setTimeChangeEligibleStaff([]);
        return;
      }

      // Get staff details for matching staff IDs
      const { data: staffDetails, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .in('id', matchingStaffIds)
        .eq('base_location', user.base_location);

      console.log(`Staff details query result:`, staffDetails);
      console.log(`Staff details query error:`, staffError);

      if (staffError) {
        console.error('Error fetching staff details:', staffError);
        throw staffError;
      }

      const eligibleStaff = staffDetails || [];
      console.log(`Found ${eligibleStaff.length} staff members with ${desiredTime} shift on ${shift.date}`);
      console.log(`Eligible staff:`, eligibleStaff);
      setTimeChangeEligibleStaff(eligibleStaff);
    } catch (error) {
      console.error('Error finding time change eligible staff:', error);
      toast({
        title: "Error",
        description: "Failed to find staff members with the desired time slot",
        variant: "destructive"
      });
    } finally {
      setLoadingTimeChangeEligible(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedShift || !user) {
      toast({
        title: "Missing Information",
        description: "Please select a shift to swap",
        variant: "destructive"
      });
      return;
    }

    if (eligibleStaff.length === 0) {
      toast({
        title: "No Eligible Staff",
        description: "No staff members are available to cover this shift",
        variant: "destructive"
      });
      return;
    }

    // Additional validation
    if (!selectedShiftData) {
      toast({
        title: "Invalid Shift",
        description: "Selected shift data is invalid",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create swap request for each eligible staff member
      const requests = eligibleStaff.map(staff => ({
        requester_id: user.id,
        requester_shift_id: selectedShift,
        accepter_id: staff.id,
        message: message || null,
        status: 'pending'
      }));

      const { error } = await supabase
        .from('swap_requests')
        .insert(requests);

      if (error) throw error;

      toast({
        title: "Swap Request Sent!",
        description: `Your swap request has been sent to ${eligibleStaff.length} staff members who are off duty on ${selectedShiftData?.date}`,
      });
      
      navigate('/swaps');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create swap request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTimeChangeShift || !desiredTime || !user) {
      toast({
        title: "Missing Information",
        description: "Please select a shift and desired time",
        variant: "destructive"
      });
      return;
    }

    if (timeChangeEligibleStaff.length === 0) {
      toast({
        title: "No Eligible Staff",
        description: "No staff members have the desired time slot on this date",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTimeChangeShiftData) {
      toast({
        title: "Invalid Shift",
        description: "Selected shift data not found",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create time change requests for all eligible staff
      const requests = timeChangeEligibleStaff.map(staff => ({
        requester_id: user.id,
        requester_shift_id: selectedTimeChangeShift,
        accepter_id: staff.id,
        accepter_shift_id: null, // Will be filled when they accept
        counter_offer_date: null,
        message: timeChangeMessage || `Time change request: ${selectedTimeChangeShiftData.time} → ${desiredTime}`,
        status: 'pending',
        request_type: 'time_change' // New field to distinguish from regular swaps
      }));

      const { error } = await supabase
        .from('swap_requests')
        .insert(requests);

      if (error) throw error;

      toast({
        title: "Time Change Request Sent!",
        description: `Your time change request has been sent to ${timeChangeEligibleStaff.length} staff members who have ${desiredTime} shifts on ${selectedTimeChangeShiftData.date}`,
      });
      
      navigate('/swaps');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create time change request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <ArrowRightLeft className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Create Request</h1>
                <p className="text-white/80">Request a shift swap or time change with eligible team members</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto bg-white text-blue-600 border-blue-300 hover:bg-blue-50 px-6 py-2 rounded-xl transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="swap" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="swap" className="flex items-center space-x-2">
                <ArrowRightLeft className="h-4 w-4" />
                <span>Shift Swap</span>
              </TabsTrigger>
              <TabsTrigger value="time-change" className="flex items-center space-x-2">
                <RotateCcw className="h-4 w-4" />
                <span>Time Change</span>
              </TabsTrigger>
              <TabsTrigger value="dummy-swap" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Dummy Swap</span>
              </TabsTrigger>
            </TabsList>

            {/* Shift Swap Tab */}
            <TabsContent value="swap">
              <Card className="bg-white shadow-xl border border-gray-100">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100 rounded-t-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <ArrowRightLeft className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-gray-900">Request a Shift Swap</CardTitle>
                      <CardDescription className="text-gray-600 text-base">
                        Select a shift you want to swap and we'll find staff members who are off duty on that day to send your request to.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Shift Selection */}
                    <div className="space-y-4">
                      <Label htmlFor="shift" className="text-lg font-semibold text-gray-900">
                        Select Shift to Swap
                      </Label>
                      <Select value={selectedShift} onValueChange={setSelectedShift}>
                        <SelectTrigger className="h-12 text-base border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Choose a shift you want to swap..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userShifts.length === 0 ? (
                            <SelectItem value="no-shifts" disabled>No future shifts available</SelectItem>
                          ) : (
                            userShifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.id}>
                                {new Date(shift.date).toLocaleDateString('en-GB')} - {shift.time}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selected Shift Details */}
                    {selectedShiftData && (
                      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-green-800 text-lg flex items-center">
                              <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                              Selected Shift Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center space-x-3 bg-white p-4 rounded-lg border border-green-200">
                                <Calendar className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="text-sm text-green-600 font-medium">Date</p>
                                  <p className="text-green-800 font-semibold">{new Date(selectedShiftData.date).toLocaleDateString('en-GB')}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 bg-white p-4 rounded-lg border border-green-200">
                                <Clock className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="text-sm text-green-600 font-medium">Time</p>
                                  <p className="text-green-800 font-semibold">{selectedShiftData.time}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 bg-white p-4 rounded-lg border border-green-200">
                                <MapPin className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="text-sm text-green-600 font-medium">Location</p>
                                  <p className="text-green-800 font-semibold">{user?.base_location}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Eligible Staff */}
                    {selectedShift && (
                      <>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                            <Label className="text-lg font-semibold text-gray-900">Eligible Staff Members</Label>
                          </div>
                          
                          {loadingEligible ? (
                            <div className="flex items-center justify-center space-x-3 p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="text-gray-600 font-medium">Finding eligible staff...</span>
                            </div>
                          ) : eligibleStaff.length > 0 ? (
                            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    <p className="text-blue-800 font-medium">
                                      Your request will be sent to <span className="font-semibold">{eligibleStaff.length}</span> staff member(s) who are OFF on {selectedShiftData?.date}:
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {eligibleStaff.map((staff) => (
                                      <Badge 
                                        key={staff.id} 
                                        variant="secondary"
                                        className="bg-white text-blue-800 border-blue-200 px-3 py-2 text-sm font-medium hover:bg-blue-50 transition-colors"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <span className="font-semibold">{staff.staff_number}</span>
                                          {/* Desktop: Show email and doubles info */}
                                          <span className="hidden md:inline">•</span>
                                          <span className="hidden md:inline">{staff.email.split('@')[0]}</span>
                                          {staff.can_work_doubles && (
                                            <>
                                              <span className="hidden md:inline">•</span>
                                              <span className="hidden md:inline text-green-600">Can do doubles</span>
                                              {/* Mobile: Show doubles indicator only */}
                                              <span className="md:hidden text-green-600 text-xs">2x</span>
                                            </>
                                          )}
                                        </div>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className="p-4 border rounded bg-yellow-50 dark:bg-yellow-950/20">
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                No eligible staff found for this shift
                              </p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                Staff members are eligible if they're OFF on {selectedShiftData?.date}.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Message (Optional)</Label>
                          <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Add a message to explain why you need the swap..."
                            rows={3}
                          />
                        </div>
                      </>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="submit" 
                        disabled={loading || !selectedShift || eligibleStaff.length === 0}
                        className="flex-1"
                      >
                        {loading ? 'Sending Request...' : `Send Request to ${eligibleStaff.length} Staff`}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => navigate('/dashboard')}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Time Change Tab */}
            <TabsContent value="time-change">
              <Card className="bg-white shadow-xl border border-gray-100">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-100 rounded-t-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <RotateCcw className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-gray-900">Request a Time Change</CardTitle>
                      <CardDescription className="text-gray-600 text-base">
                        Select a shift and desired time, then we'll find staff members who have that time slot to send your request to.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-8">
                  <form onSubmit={handleTimeChangeSubmit} className="space-y-8">
                    {/* Shift Selection */}
                    <div className="space-y-4">
                      <Label htmlFor="time-change-shift" className="text-lg font-semibold text-gray-900">
                        Select Shift to Change
                      </Label>
                      <Select value={selectedTimeChangeShift} onValueChange={setSelectedTimeChangeShift}>
                        <SelectTrigger className="h-12 text-base border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Choose a shift you want to change the time for..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userShifts.length === 0 ? (
                            <SelectItem value="no-shifts" disabled>No future shifts available</SelectItem>
                          ) : (
                            userShifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.id}>
                                {new Date(shift.date).toLocaleDateString('en-GB')} - {shift.time}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Desired Time Selection */}
                    {selectedTimeChangeShift && (
                      <div className="space-y-4">
                        <Label htmlFor="desired-time" className="text-lg font-semibold text-gray-900">
                          Desired Time
                        </Label>
                        <Select value={desiredTime} onValueChange={setDesiredTime}>
                          <SelectTrigger className="h-12 text-base border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500 rounded-xl transition-all duration-300">
                            <SelectValue placeholder="Choose the time you want to change to..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4:15 AM">4:15 AM</SelectItem>
                            <SelectItem value="5:30 AM">5:30 AM</SelectItem>
                            <SelectItem value="12:30 PM">12:30 PM</SelectItem>
                            <SelectItem value="1:15 PM">1:15 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Selected Shift Details */}
                    {selectedTimeChangeShiftData && (
                      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 shadow-lg">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-purple-800 text-lg flex items-center">
                              <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                              Time Change Request Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center space-x-3 bg-white p-4 rounded-lg border border-purple-200">
                                <Calendar className="h-5 w-5 text-purple-600" />
                                <div>
                                  <p className="text-sm text-purple-600 font-medium">Date</p>
                                  <p className="text-purple-800 font-semibold">{new Date(selectedTimeChangeShiftData.date).toLocaleDateString('en-GB')}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 bg-white p-4 rounded-lg border border-purple-200">
                                <Clock className="h-5 w-5 text-purple-600" />
                                <div>
                                  <p className="text-sm text-purple-600 font-medium">Current Time</p>
                                  <p className="text-purple-800 font-semibold">{selectedTimeChangeShiftData.time}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 bg-white p-4 rounded-lg border border-purple-200">
                                <RotateCcw className="h-5 w-5 text-purple-600" />
                                <div>
                                  <p className="text-sm text-purple-600 font-medium">Desired Time</p>
                                  <p className="text-purple-800 font-semibold">{desiredTime || 'Not selected'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Eligible Staff for Time Change */}
                    {selectedTimeChangeShift && desiredTime && (
                      <>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                            <Label className="text-lg font-semibold text-gray-900">Staff with Desired Time</Label>
                          </div>
                          
                          {loadingTimeChangeEligible ? (
                            <div className="flex items-center justify-center space-x-3 p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                              <span className="text-gray-600 font-medium">Finding staff with {desiredTime} shifts...</span>
                            </div>
                          ) : timeChangeEligibleStaff.length > 0 ? (
                            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 shadow-lg">
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    <p className="text-purple-800 font-medium">
                                      Your time change request will be sent to <span className="font-semibold">{timeChangeEligibleStaff.length}</span> staff member(s) who have {desiredTime} shifts on {selectedTimeChangeShiftData?.date}:
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {timeChangeEligibleStaff.map((staff) => (
                                      <Badge 
                                        key={staff.id} 
                                        variant="secondary"
                                        className="bg-white text-purple-800 border-purple-200 px-3 py-2 text-sm font-medium hover:bg-purple-50 transition-colors"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <span className="font-semibold">{staff.staff_number}</span>
                                          {/* Desktop: Show email and doubles info */}
                                          <span className="hidden md:inline">•</span>
                                          <span className="hidden md:inline">{staff.email.split('@')[0]}</span>
                                          {staff.can_work_doubles && (
                                            <>
                                              <span className="hidden md:inline">•</span>
                                              <span className="hidden md:inline text-green-600">Can do doubles</span>
                                              {/* Mobile: Show doubles indicator only */}
                                              <span className="md:hidden text-green-600 text-xs">2x</span>
                                            </>
                                          )}
                                        </div>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className="p-4 border rounded bg-yellow-50 dark:bg-yellow-950/20">
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                No staff found with {desiredTime} shifts on {selectedTimeChangeShiftData?.date}
                              </p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                Try selecting a different time slot.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="time-change-message">Message (Optional)</Label>
                          <Textarea
                            id="time-change-message"
                            value={timeChangeMessage}
                            onChange={(e) => setTimeChangeMessage(e.target.value)}
                            placeholder="Add a message to explain why you need the time change..."
                            rows={3}
                          />
                        </div>
                      </>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="submit" 
                        disabled={loading || !selectedTimeChangeShift || !desiredTime || timeChangeEligibleStaff.length === 0}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {loading ? 'Sending Request...' : `Send Time Change Request to ${timeChangeEligibleStaff.length} Staff`}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => navigate('/dashboard')}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Dummy Swap Tab */}
            <TabsContent value="dummy-swap">
              <Card className="bg-white shadow-xl border border-gray-100">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-yellow-50 border-b border-gray-100 rounded-t-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-gray-900">Create Dummy Swap</CardTitle>
                      <CardDescription className="text-gray-600 text-base">
                        Create a temporary swap with placeholder dates when your desired date is outside the allowed swap period.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-8">
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>How dummy swaps work:</strong> If you need a date off that's outside the allowed swap period (e.g., April 4th), 
                      you can create a dummy swap where you work a colleague's shift (e.g., March 8th) and get a temporary repayment date 
                      within the allowed period (e.g., March 20th). Later when dates open, you'll resolve this swap.
                    </p>
                  </div>

                  <form onSubmit={handleDummySwapSubmit} className="space-y-8">
                    {/* Your shift to swap (final repayment date - outside allowed period) */}
                    <div className="space-y-4">
                      <Label htmlFor="dummy-requester-shift" className="text-lg font-semibold text-gray-900">
                        Your Shift to Swap (Final Date You Want Off)
                      </Label>
                      <Select value={selectedDummyRequesterShift} onValueChange={setSelectedDummyRequesterShift}>
                        <SelectTrigger className="h-12 text-base border-2 border-gray-200 hover:border-yellow-300 focus:border-yellow-500 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select the date you want off (outside allowed period)..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userShifts.length === 0 ? (
                            <SelectItem value="no-shifts" disabled>No future shifts available</SelectItem>
                          ) : (
                            userShifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.id}>
                                {new Date(shift.date).toLocaleDateString('en-GB')} - {shift.time}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {selectedDummyRequesterShift && (
                        <p className="text-sm text-gray-600">
                          This is the date you want off that's outside the allowed swap period. This will be your final repayment date.
                        </p>
                      )}
                    </div>

                    {/* Colleague's shift to work */}
                    <div className="space-y-4">
                      <Label htmlFor="dummy-accepter-shift" className="text-lg font-semibold text-gray-900">
                        Colleague's Shift ID to Work
                      </Label>
                      <input
                        type="text"
                        id="dummy-accepter-shift"
                        value={selectedDummyAccepterShift}
                        onChange={(e) => setSelectedDummyAccepterShift(e.target.value)}
                        placeholder="Enter the shift ID of the colleague's shift you'll work (e.g., from calendar or colleague)"
                        className="w-full h-12 text-base border-2 border-gray-200 hover:border-yellow-300 focus:border-yellow-500 rounded-xl px-4 transition-all duration-300"
                      />
                      <p className="text-sm text-gray-600">
                        Enter the shift ID of the shift you'll work for the colleague. 
                        You can find this shift ID by checking the calendar or asking the colleague for their shift details.
                        The colleague must have a shift on the date you want to work for them.
                      </p>
                      <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                        <strong>Tip:</strong> To find a shift ID, you can check the database, ask the colleague, or look it up in the calendar view.
                      </p>
                    </div>

                    {/* Dummy repayment date (within allowed period) */}
                    <div className="space-y-4">
                      <Label htmlFor="dummy-repay-date" className="text-lg font-semibold text-gray-900">
                        Dummy Repayment Date (Within Allowed Period)
                      </Label>
                      <input
                        type="date"
                        id="dummy-repay-date"
                        value={dummyRepayDate}
                        onChange={(e) => setDummyRepayDate(e.target.value)}
                        className="w-full h-12 text-base border-2 border-gray-200 hover:border-yellow-300 focus:border-yellow-500 rounded-xl px-4 transition-all duration-300"
                      />
                      <p className="text-sm text-gray-600">
                        This is a temporary placeholder date within the allowed swap period (e.g., March 20th). 
                        You'll work this date temporarily until the swap is resolved.
                      </p>
                    </div>

                    {/* Final repayment date (same as requester shift date, but stored separately) */}
                    {selectedDummyRequesterShift && (
                      <div className="space-y-4">
                        <Label htmlFor="final-repay-date" className="text-lg font-semibold text-gray-900">
                          Final Repayment Date (Date You Actually Want Off)
                        </Label>
                        <input
                          type="date"
                          id="final-repay-date"
                          value={finalRepayDate}
                          onChange={(e) => setFinalRepayDate(e.target.value)}
                          className="w-full h-12 text-base border-2 border-gray-200 hover:border-yellow-300 focus:border-yellow-500 rounded-xl px-4 transition-all duration-300"
                        />
                        <p className="text-sm text-gray-600">
                          This should match the date of your shift above. This is the date you actually want off (outside allowed period).
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="dummy-message">Message (Optional)</Label>
                      <Textarea
                        id="dummy-message"
                        value={dummyMessage}
                        onChange={(e) => setDummyMessage(e.target.value)}
                        placeholder="Add a message to explain the dummy swap arrangement..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="submit" 
                        disabled={loading || !selectedDummyRequesterShift || !selectedDummyAccepterShift || !dummyRepayDate || !finalRepayDate}
                        className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                      >
                        {loading ? 'Creating Dummy Swap...' : 'Create Dummy Swap'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => navigate('/dashboard')}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default CreateSwapRequest;
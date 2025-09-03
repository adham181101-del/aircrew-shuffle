import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRightLeft, Calendar, Clock, MapPin, Users } from "lucide-react";
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

  // Get the selected shift data for display
  const selectedShiftData = userShifts.find(s => s.id === selectedShift);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (selectedShift) {
      findEligibleStaff();
    }
  }, [selectedShift]);

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
      
      const { data: eligibleStaffData, error: eligibleError } = await supabase
        .rpc('get_eligible_staff_for_swap', {
          requester_base_location: user.base_location,
          swap_date: shift.date,
          requester_id: user.id
        } as any);

      if (eligibleError) {
        console.error('Error fetching eligible staff:', eligibleError);
        
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
      }

      if (eligibleStaffData && Array.isArray(eligibleStaffData)) {
        console.log(`Found ${eligibleStaffData.length} eligible staff members using database function`);
        setEligibleStaff(eligibleStaffData);
      } else {
        console.log('No eligible staff data returned from function');
        setEligibleStaff([]);
      }
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
                <h1 className="text-2xl font-bold text-white">Create Swap Request</h1>
                <p className="text-white/80">Request a shift swap with eligible team members</p>
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
                            {new Date(shift.date).toLocaleDateString()} - {shift.time}
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
                              <p className="text-green-800 font-semibold">{new Date(selectedShiftData.date).toLocaleDateString()}</p>
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
                                    className="bg-white text-blue-800 border-blue-200 px-4 py-2 text-sm font-medium hover:bg-blue-50 transition-colors"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold">{staff.staff_number}</span>
                                      <span>•</span>
                                      <span>{staff.email.split('@')[0]}</span>
                                      {staff.can_work_doubles && (
                                        <>
                                          <span>•</span>
                                          <span className="text-green-600">Can do doubles</span>
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
        </div>
      </main>
    </div>
  );
};

export default CreateSwapRequest;
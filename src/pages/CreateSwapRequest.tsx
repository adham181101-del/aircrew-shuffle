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
import { getUserShifts, type Shift } from "@/lib/shifts";
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

      // Find staff at the same base
      const { data: baseStaff, error } = await supabase
        .from('staff')
        .select('*')
        .eq('base_location', user.base_location)
        .neq('id', user.id);

      if (error) throw error;

      // Check who's available on that date
      const eligibleList: Staff[] = [];
      
      for (const staff of baseStaff || []) {
        const { data: staffShifts } = await supabase
          .from('shifts')
          .select('*')
          .eq('staff_id', staff.id)
          .eq('date', shift.date);

        const hasShiftOnDate = (staffShifts?.length || 0) > 0;
        
        // Staff is eligible if:
        // 1. They don't have a shift that day (OFF)
        // 2. OR they can work doubles and have a compatible shift
        if (!hasShiftOnDate || staff.can_work_doubles) {
          eligibleList.push(staff);
        }
      }

      setEligibleStaff(eligibleList);
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
        description: `Your swap request has been sent to ${eligibleStaff.length} eligible staff members`,
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

  const selectedShiftData = userShifts.find(s => s.id === selectedShift);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Create Swap Request</h1>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Request a Shift Swap
              </CardTitle>
              <CardDescription>
                Select a shift you want to swap and we'll find eligible staff members to send your request to.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="shift">Select Shift to Swap</Label>
                  <Select value={selectedShift} onValueChange={setSelectedShift}>
                    <SelectTrigger>
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

                {selectedShiftData && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <h4 className="font-medium">Selected Shift Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(selectedShiftData.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedShiftData.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{user?.base_location}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedShift && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <Label>Eligible Staff Members</Label>
                      </div>
                      
                      {loadingEligible ? (
                        <div className="flex items-center gap-2 p-4 border rounded">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Finding eligible staff...</span>
                        </div>
                      ) : eligibleStaff.length > 0 ? (
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground mb-3">
                                Your request will be sent to {eligibleStaff.length} eligible staff member(s):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {eligibleStaff.map((staff) => (
                                  <Badge key={staff.id} variant="secondary">
                                    {staff.staff_number} - {staff.email.split('@')[0]}
                                    {staff.can_work_doubles && ' (Can do doubles)'}
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
                            Staff members are eligible if they're OFF that day or can work doubles.
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
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useSearchParams } from "react-router-dom";
import { normalizeToDatabaseDate } from "@/lib/dates";
import { useToast } from "@/hooks/use-toast";
import { createShift } from "@/lib/shifts";
import { getCurrentUser } from "@/lib/auth";
import { useInvalidateShifts } from "@/hooks/useShifts";
import { Calendar, Clock, ArrowLeft } from "lucide-react";

const CreateShift = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const invalidateShifts = useInvalidateShifts();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    note: ""
  });

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam) return;
    const normalized = normalizeToDatabaseDate(dateParam);
    setFormData((prev) => (prev.date === normalized ? prev : { ...prev, date: normalized }));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.startTime || !formData.endTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to create shifts",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      const timeRange = `${formData.startTime}-${formData.endTime}`;
      
      await createShift(formData.date, timeRange, user.id, formData.note);
      await invalidateShifts.mutateAsync();

      toast({
        title: "Shift Created",
        description: "Your shift has been added successfully",
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create shift",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">Add Shift</h2>
        <p className="text-sm text-slate-500">Manually add a shift to your calendar</p>
      </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Create New Shift
              </CardTitle>
              <CardDescription>
                Add a shift manually to your schedule. This will appear in your calendar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Common Shift Times
                      </p>
                      <div className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                        <p>• Morning: 04:15 - 13:15</p>
                        <p>• Afternoon: 13:15 - 22:15</p>
                        <p>• Evening: 21:15 - 06:15</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Shift Note (optional)</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Example: Spoke with Alex about swapping this shift"
                    className="min-h-[96px]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Creating...' : 'Create Shift'}
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
  );
};

export default CreateShift;
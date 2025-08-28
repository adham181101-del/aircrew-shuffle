import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Lock, MapPin, Building, Hash, Mail } from 'lucide-react';
import { getCurrentUser, type Staff } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    staff_number: '',
    base_location: '',
    can_work_doubles: false,
    email: ''
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      setUser(currentUser);
      setFormData({
        staff_number: currentUser.staff_number || '',
        base_location: currentUser.base_location || '',
        can_work_doubles: currentUser.can_work_doubles || false,
        email: currentUser.email || ''
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      if (!user) return;

      // Update staff profile
      const { error: staffError } = await supabase
        .from('staff')
        .update({
          staff_number: formData.staff_number,
          base_location: formData.base_location,
          can_work_doubles: formData.can_work_doubles
        })
        .eq('id', user.id);

      if (staffError) {
        console.error('Error updating staff profile:', staffError);
        throw staffError;
      }

      // Update auth email if changed
      if (formData.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (authError) {
          console.error('Error updating email:', authError);
          throw authError;
        }
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });

      setEditing(false);
      await loadUserProfile(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setSaving(true);

      if (passwordData.new_password !== passwordData.confirm_password) {
        toast({
          title: "Error",
          description: "New passwords do not match",
          variant: "destructive"
        });
        return;
      }

      if (passwordData.new_password.length < 6) {
        toast({
          title: "Error",
          description: "Password must be at least 6 characters long",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) {
        console.error('Error changing password:', error);
        throw error;
      }

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal and work information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="staff_number">Staff Number</Label>
                      <Input
                        id="staff_number"
                        value={formData.staff_number}
                        onChange={(e) => setFormData({ ...formData, staff_number: e.target.value })}
                        placeholder="Enter staff number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="base_location">Base Location</Label>
                    <Select
                      value={formData.base_location}
                      onValueChange={(value) => setFormData({ ...formData, base_location: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select base location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Iberia CER">Iberia CER</SelectItem>
                        <SelectItem value="British Airways">British Airways</SelectItem>
                        <SelectItem value="Heathrow">Heathrow</SelectItem>
                        <SelectItem value="Gatwick">Gatwick</SelectItem>
                        <SelectItem value="Manchester">Manchester</SelectItem>
                        <SelectItem value="Birmingham">Birmingham</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="can_work_doubles"
                      checked={formData.can_work_doubles}
                      onChange={(e) => setFormData({ ...formData, can_work_doubles: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="can_work_doubles">Can work double shifts</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-muted-foreground">Staff Number</Label>
                      <p className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        {user?.staff_number || 'Not set'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user?.email || 'Not set'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Base Location</Label>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {user?.base_location || 'Not set'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Double Shift Permission</Label>
                    <p className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {user?.can_work_doubles ? (
                        <Badge variant="default">Can work doubles</Badge>
                      ) : (
                        <Badge variant="secondary">Cannot work doubles</Badge>
                      )}
                    </p>
                  </div>

                  <Button onClick={() => setEditing(true)}>
                    Edit Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button onClick={handleChangePassword} disabled={saving}>
                  {saving ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;

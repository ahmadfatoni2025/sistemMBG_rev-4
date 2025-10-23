import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      setUser(authUser);

      // Fetch profile
      const { data: profileData } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      setProfile(profileData);

      // Fetch roles
      const { data: rolesData } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id);

      if (rolesData) {
        setRoles(rolesData.map((r: any) => r.role));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {user?.email?.[0].toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {profile?.full_name || "User"}
                </h2>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Joined</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user?.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Roles</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <Badge key={role} variant="default">
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary">user</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <User className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">User ID</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {user?.id.slice(0, 20)}...
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;

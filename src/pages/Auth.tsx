import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Chrome, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        },
      });

      if (error) throw error;

      toast({
        title: "Account Created!",
        description: "You can now sign in with your credentials.",
      });
      
      // Auto sign in after successful signup
      if (data.session) {
        navigate("/");
      } else {
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      navigate("/");
    } catch (error: any) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("email not confirmed")) {
        toast({
          title: "Email Not Confirmed",
          description: "Please check your email and confirm your account before signing in.",
          variant: "destructive",
        });
      } else if (errorMsg.includes("invalid login credentials")) {
        toast({
          title: "Invalid Credentials",
          description: "The email or password you entered is incorrect.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions.",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-background via-secondary/10 to-background">
      {/* Left Panel - Modern Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {showForgotPassword ? (
            <>
              {/* Forgot Password Form */}
              <div className="space-y-4">
                <button 
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  ← Back to login
                </button>
                <div>
                  <h2 className="text-4xl font-bold text-foreground mb-2">
                    Reset password<span className="text-primary">.</span>
                  </h2>
                  <p className="text-muted-foreground">
                    Enter your email to receive reset instructions
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-medium text-foreground">
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="h-12 px-4 bg-background border-input rounded-lg"
                    disabled={loading}
                  />
                </div>

                <Button
                  onClick={handleForgotPassword}
                  className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg transition-colors"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
          {/* Logo & Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <div className="w-6 h-6 rounded-lg bg-primary-foreground/90" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">MBG Raw Materials</h1>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                {isLogin ? "WELCOME BACK" : "START FOR FREE"}
              </p>
              <h2 className="text-4xl font-bold text-foreground mb-2">
                {isLogin ? "Log in" : "Create new account"}
                <span className="text-primary">.</span>
              </h2>
              <p className="text-muted-foreground">
                {isLogin ? (
                  <>
                    New to platform? <button onClick={() => setIsLogin(false)} className="text-primary hover:underline font-medium">Create account</button>
                  </>
                ) : (
                  <>
                    Already a member? <button onClick={() => setIsLogin(true)} className="text-primary hover:underline font-medium">Log in</button>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name" className="text-sm font-medium text-foreground">
                    First name
                  </Label>
                  <div className="relative">
                    <Input
                      id="first-name"
                      type="text"
                      placeholder="Michal"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-12 px-4 bg-background border-input rounded-lg"
                      disabled={loading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Chrome className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name" className="text-sm font-medium text-foreground">
                    Last name
                  </Label>
                  <div className="relative">
                    <Input
                      id="last-name"
                      type="text"
                      placeholder="Masiak"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-12 px-4 bg-background border-input rounded-lg"
                      disabled={loading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Chrome className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="michal.masiak@anywhere.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 px-4 bg-background border-input rounded-lg"
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Chrome className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 px-4 pr-10 bg-background border-input rounded-lg"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              onClick={isLogin ? handleSignIn : handleSignUp}
              className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg transition-colors"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                isLogin ? "Log in" : "Create account"
              )}
            </Button>

          </div>
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="space-y-6 max-w-lg">
            <div className="space-y-3">
              <div className="inline-block px-4 py-2 bg-background/90 backdrop-blur-sm rounded-full text-sm font-medium border border-border">
                ✨ Enterprise-Grade Management
              </div>
              <h3 className="text-4xl font-bold text-foreground">
                Manage your raw materials with precision
              </h3>
              <p className="text-lg text-muted-foreground">
                Track inventory, create invoices, and manage returns all in one place. Built for modern food supply chains.
              </p>
            </div>
            
            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-4 p-4 bg-background/80 backdrop-blur-sm rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Chrome className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Real-time Analytics</h4>
                  <p className="text-sm text-muted-foreground">Track your inventory and performance metrics in real-time.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-background/80 backdrop-blur-sm rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Chrome className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Quality Control</h4>
                  <p className="text-sm text-muted-foreground">Comprehensive food inspection and quality management.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

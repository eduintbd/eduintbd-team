import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  password: z.string().min(12, "Password must be at least 12 characters").max(128, "Password too long"),
});

const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100, "First name too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(100, "Last name too long"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  phone: z.string().trim().min(10, "Phone number must be at least 10 digits").max(20, "Phone number too long"),
  password: z.string().min(12, "Password must be at least 12 characters").max(128, "Password too long"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Auth = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signInSchema.safeParse({ email: email.trim(), password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please check your credentials.");
      } else {
        toast.error(error.message || "Sign in failed. Please try again.");
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: employeeData } = await supabase
        .from("employees")
        .select("registration_status, onboarding_completed")
        .eq("user_id", data.user.id)
        .single();

      if (employeeData?.registration_status === "pending") {
        toast.info("Your registration is under review. Please wait for admin approval.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (employeeData?.registration_status === "approved" && !employeeData?.onboarding_completed) {
        toast.success("Registration approved! Please complete your onboarding.");
        navigate("/onboarding");
        setLoading(false);
        return;
      }
    }

    toast.success("Signed in successfully!");
    navigate("/dashboard");
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    if (error) {
      toast.error(error.message || "Failed to send reset email");
    } else {
      toast.success("Password reset link sent! Check your email.");
      setIsForgotPassword(false);
    }
    setLoading(false);
  };

  // Handle password recovery from email link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("type") === "recovery") {
      supabase.auth.onAuthStateChange(async (event) => {
        if (event === "PASSWORD_RECOVERY") {
          const newPassword = prompt("Enter your new password (min 12 characters):");
          if (newPassword && newPassword.length >= 12) {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
              toast.error(error.message);
            } else {
              toast.success("Password updated successfully! You can now sign in.");
              window.history.replaceState({}, "", "/auth");
            }
          } else if (newPassword) {
            toast.error("Password must be at least 12 characters");
          }
        }
      });
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signUpSchema.safeParse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      confirmPassword,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);

    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        "create-employee-account",
        {
          body: {
            employeeData: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: email.trim(),
              phone: phone.trim(),
            },
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message || "Failed to create account");
      }

      if (functionData?.error) {
        throw new Error(functionData.error);
      }

      toast.success("Account created successfully! Your registration is pending admin approval.");
      setIsSignUp(false);
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Sign up error:", error);
      if (error.message.includes("already exists") || error.message.includes("already registered")) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error(error.message || "Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-navy flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gold" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Eduint Accounting</CardTitle>
          <CardDescription>Professional Accounting Management System</CardDescription>
        </CardHeader>
        <CardContent>
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a password reset link.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email-reset">Email</Label>
                <Input
                  id="email-reset"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : isSignUp ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+880 1XXX-XXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input
                  id="password-signup"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-signin">Email</Label>
                <Input
                  id="email-signin"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signin">Password</Label>
                <Input
                  id="password-signin"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(false); setIsForgotPassword(false); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              ) : !isForgotPassword ? (
                <>
                  Want to join our team?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : null}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

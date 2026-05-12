import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

const resetPasswordSchema = z.object({
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
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Check existing session and handle OAuth callback
  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Check if this is a Google OAuth user who needs employee setup
        const provider = session.user.app_metadata?.provider;
        const userEmail = session.user.email || "";

        if (provider === "google") {
          await handleGoogleUserSetup(session.user.id, userEmail, session.user.user_metadata);
          return;
        }

        // Standard login redirect
        await handlePostLoginRedirect(session.user.id);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  // Handle password recovery from email link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("type") === "recovery") {
      supabase.auth.onAuthStateChange(async (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsResetPassword(true);
          setIsSignUp(false);
          setIsForgotPassword(false);
        }
      });
    }
  }, []);

  const handlePostLoginRedirect = async (userId: string) => {
    const { data: employeeData } = await supabase
      .from("employees")
      .select("registration_status, onboarding_completed")
      .eq("user_id", userId)
      .single();

    if (employeeData?.registration_status === "pending") {
      toast.info("Your registration is under review. Please wait for admin approval.");
      await supabase.auth.signOut();
      return;
    }

    if (employeeData?.registration_status === "approved" && !employeeData?.onboarding_completed) {
      toast.success("Registration approved! Please complete your onboarding.");
      navigate("/onboarding");
      return;
    }

    navigate("/dashboard");
  };

  const handleGoogleUserSetup = async (userId: string, userEmail: string, metadata: any) => {
    // Check if employee record already exists
    const { data: existingEmployee } = await supabase
      .from("employees")
      .select("registration_status, onboarding_completed")
      .eq("user_id", userId)
      .single();

    if (existingEmployee) {
      // Employee exists, follow normal redirect
      await handlePostLoginRedirect(userId);
      return;
    }

    // Also check by email (employee might exist from email/password signup)
    const { data: employeeByEmail } = await supabase
      .from("employees")
      .select("id, user_id, registration_status, onboarding_completed")
      .eq("email", userEmail.toLowerCase())
      .single();

    if (employeeByEmail) {
      // Link existing employee to this Google auth user if not already linked
      if (!employeeByEmail.user_id || employeeByEmail.user_id !== userId) {
        await supabase
          .from("employees")
          .update({ user_id: userId })
          .eq("id", employeeByEmail.id);
      }
      await handlePostLoginRedirect(userId);
      return;
    }

    // New Google user — create employee record
    const isWorkspaceUser = userEmail.toLowerCase().endsWith("@eduintbd.com");
    const firstName = metadata?.full_name?.split(" ")[0] || metadata?.name?.split(" ")[0] || "";
    const lastName = metadata?.full_name?.split(" ").slice(1).join(" ") || "";

    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        "create-employee-account",
        {
          body: {
            employeeData: {
              first_name: firstName,
              last_name: lastName,
              email: userEmail.toLowerCase(),
              phone: "",
              auto_approve: isWorkspaceUser,
            },
          },
        }
      );

      if (functionError) throw new Error(functionError.message);
      if (functionData?.error) throw new Error(functionData.error);

      if (isWorkspaceUser) {
        toast.success("Welcome! Please complete your onboarding.");
        navigate("/onboarding");
      } else {
        toast.info("Account created. Pending admin approval.");
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      console.error("Google user setup error:", error);
      toast.error("Failed to set up account. Please contact admin.");
      await supabase.auth.signOut();
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: {
          hd: "eduintbd.com",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      toast.error(error.message || "Google sign in failed");
      setGoogleLoading(false);
    }
  };

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
      await handlePostLoginRedirect(data.user.id);
    }

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = resetPasswordSchema.safeParse({
      password: newPassword,
      confirmPassword: confirmNewPassword,
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message || "Failed to update password");
    } else {
      toast.success("Password updated successfully! You can now sign in.");
      setIsResetPassword(false);
      setNewPassword("");
      setConfirmNewPassword("");
      window.history.replaceState({}, "", "/auth");
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

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

  // Password reset form
  if (isResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-navy flex items-center justify-center">
                <Building2 className="h-8 w-8 text-gold" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display">Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min 12 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <div className="space-y-4">
              {/* Google SSO */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {googleLoading ? "Redirecting..." : "Sign in with Google"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Email/Password */}
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
            </div>
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

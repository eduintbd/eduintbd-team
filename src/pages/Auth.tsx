import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  password: z.string().min(12, "Password must be at least 12 characters").max(128, "Password too long"),
});

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100, "First name too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(100, "Last name too long"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  password: z.string().min(12, "Password must be at least 12 characters").max(128, "Password too long"),
  phone: z.string().trim().min(1, "Phone is required").max(20, "Phone too long"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate input
    const validation = signupSchema.safeParse({ 
      email: email.trim(), 
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(signUpError.message || "Registration failed. Please try again.");
      }
      setLoading(false);
      return;
    }

    if (!authData.user) {
      toast.error("Failed to create user account");
      setLoading(false);
      return;
    }

    // Send welcome email
    try {
      await supabase.functions.invoke("send-welcome-email", {
        body: {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        },
      });
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
      // Don't block registration if email fails
    }

    let cvUrl = null;

    // Upload CV if provided
    if (cvFile) {
      const cvFileName = `${authData.user.id}/cv_${Date.now()}.pdf`;
      const { error: cvUploadError } = await supabase.storage
        .from("employee-cvs")
        .upload(cvFileName, cvFile);

      if (cvUploadError) {
        toast.error("Failed to upload CV: " + cvUploadError.message);
        setLoading(false);
        return;
      }

      const { data: cvUrlData } = supabase.storage
        .from("employee-cvs")
        .getPublicUrl(cvFileName);

      cvUrl = cvUrlData.publicUrl;
    }

    // Generate employee code automatically
    const employeeCode = `EMP${Date.now().toString().slice(-6)}`;
    
    // Create employee record
    const { error: employeeError } = await supabase
      .from('employees')
      .insert({
        user_id: authData.user.id,
        employee_code: employeeCode,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cv_url: cvUrl,
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active',
        registration_status: 'pending',
      });

    if (employeeError) {
      toast.error("Failed to create employee record. Please contact admin.");
      setLoading(false);
      return;
    }

    toast.success("Registration submitted! Please wait for admin approval.");
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = authSchema.safeParse({ email: email.trim(), password });
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
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please check your credentials.");
      } else {
        toast.error(error.message || "Sign in failed. Please try again.");
      }
      setLoading(false);
      return;
    }

    // Check registration status
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
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
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
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName-signup">First Name</Label>
                    <Input
                      id="firstName-signup"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName-signup">Last Name</Label>
                    <Input
                      id="lastName-signup"
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
                  <Label htmlFor="phone-signup">Phone</Label>
                  <Input
                    id="phone-signup"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cv">Upload CV (PDF)</Label>
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
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
                    minLength={12}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 12 characters required
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Register"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

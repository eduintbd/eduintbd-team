import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

const onboardingSchema = z.object({
  dateOfBirth: z.string().trim().min(1, "Date of birth is required"),
  address: z.string().trim().min(1, "Address is required").max(500, "Address too long"),
  emergencyContactName: z.string().trim().min(1, "Emergency contact name is required").max(100, "Name too long"),
  emergencyContactPhone: z.string().trim().min(1, "Emergency contact phone is required").max(20, "Phone too long"),
  bloodGroup: z.string().min(1, "Blood group is required"),
  bankAccountNumber: z.string().trim().min(1, "Bank account number is required").max(50, "Account number too long"),
  bankName: z.string().trim().min(1, "Bank name is required").max(100, "Bank name too long"),
  bankBranch: z.string().trim().min(1, "Bank branch is required").max(100, "Branch too long"),
  tinNumber: z.string().trim().min(1, "TIN number is required").max(50, "TIN too long"),
  nidNumber: z.string().trim().min(1, "NID number is required").max(50, "NID too long"),
});

export default function Onboarding() {
  const navigate = useNavigate();
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [salaryAccepted, setSalaryAccepted] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [tinFile, setTinFile] = useState<File | null>(null);
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      toast.error("Failed to fetch employee data");
      return;
    }

    if (data.onboarding_completed) {
      navigate("/");
      return;
    }

    setEmployeeData(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = onboardingSchema.safeParse({
      dateOfBirth: dateOfBirth.trim(),
      address: address.trim(),
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      bloodGroup,
      bankAccountNumber: bankAccountNumber.trim(),
      bankName: bankName.trim(),
      bankBranch: bankBranch.trim(),
      tinNumber: tinNumber.trim(),
      nidNumber: nidNumber.trim(),
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    if (!salaryAccepted) {
      toast.error("You must accept the salary offer to continue");
      return;
    }

    if (!employeeData.cv_url && !cvFile) {
      toast.error("Please upload your CV");
      return;
    }

    if (!tinFile || !nidFile) {
      toast.error("Please upload both TIN and NID documents");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      let cvUrl = employeeData.cv_url;

      // Upload CV if not already uploaded
      if (!employeeData.cv_url && cvFile) {
        const cvFileName = `${user.id}/cv_${Date.now()}.pdf`;
        const { error: cvUploadError } = await supabase.storage
          .from("employee-cvs")
          .upload(cvFileName, cvFile);

        if (cvUploadError) throw cvUploadError;

        cvUrl = cvFileName;
      }

      // Upload TIN document
      const tinFileName = `${user.id}/tin_${Date.now()}.pdf`;
      const { error: tinUploadError } = await supabase.storage
        .from("identity-documents")
        .upload(tinFileName, tinFile);

      if (tinUploadError) throw tinUploadError;

      // Upload NID document
      const nidFileName = `${user.id}/nid_${Date.now()}.pdf`;
      const { error: nidUploadError } = await supabase.storage
        .from("identity-documents")
        .upload(nidFileName, nidFile);

      if (nidUploadError) throw nidUploadError;

      // Get public URLs (identity-documents is not public, so store the file path)
      const tinFilePath = tinFileName;
      const nidFilePath = nidFileName;

      // Update employee record
      const { error: updateError } = await supabase
        .from("employees")
        .update({
          date_of_birth: dateOfBirth.trim(),
          address: address.trim(),
          emergency_contact_name: emergencyContactName.trim(),
          emergency_contact_phone: emergencyContactPhone.trim(),
          blood_group: bloodGroup,
          bank_account_number: bankAccountNumber.trim(),
          bank_name: bankName.trim(),
          bank_branch: bankBranch.trim(),
          tin_number: tinNumber.trim(),
          tin_document_url: tinFilePath,
          nid_number: nidNumber.trim(),
          nid_document_url: nidFilePath,
          cv_url: cvUrl,
          salary_accepted: true,
          onboarding_completed: true,
          status: "active",
        })
        .eq("id", employeeData.id);

      if (updateError) throw updateError;

      toast.success("Onboarding completed successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error("Failed to complete onboarding: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!employeeData) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Onboarding</CardTitle>
          <CardDescription>
            Please complete your profile and accept the salary offer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group *</Label>
                  <select
                    id="bloodGroup"
                    required
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Present Address *</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main St, City, Country"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Emergency Contact Name *</Label>
                  <Input
                    id="emergencyContactName"
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Emergency Contact Phone *</Label>
                  <Input
                    id="emergencyContactPhone"
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Salary Information */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Salary Information</h3>
              <div className="space-y-2">
                <Label>Offered Salary</Label>
                <p className="text-2xl font-bold">${employeeData.salary?.toLocaleString()}</p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="acceptSalary"
                  checked={salaryAccepted}
                  onChange={(e) => setSalaryAccepted(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="acceptSalary" className="cursor-pointer">
                  I accept the salary offer
                </Label>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">Bank Account Details</h3>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Enter bank name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankBranch">Bank Branch *</Label>
                <Input
                  id="bankBranch"
                  required
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="Enter branch name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Account Number *</Label>
                <Input
                  id="bankAccountNumber"
                  required
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                />
              </div>
            </div>

            {/* TIN Information */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">TIN Information</h3>
              <div className="space-y-2">
                <Label htmlFor="tinNumber">TIN Number *</Label>
                <Input
                  id="tinNumber"
                  required
                  value={tinNumber}
                  onChange={(e) => setTinNumber(e.target.value)}
                  placeholder="Enter TIN number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tinFile">Upload TIN Document (PDF) *</Label>
                <Input
                  id="tinFile"
                  type="file"
                  required
                  accept=".pdf"
                  onChange={(e) => setTinFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            {/* CV Upload (if not uploaded during registration) */}
            {!employeeData.cv_url && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold">CV Upload</h3>
                <div className="space-y-2">
                  <Label htmlFor="cvFile">Upload CV (PDF) *</Label>
                  <Input
                    id="cvFile"
                    type="file"
                    required
                    accept=".pdf"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            )}

            {/* NID Information */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold">NID Information</h3>
              <div className="space-y-2">
                <Label htmlFor="nidNumber">NID Number *</Label>
                <Input
                  id="nidNumber"
                  required
                  value={nidNumber}
                  onChange={(e) => setNidNumber(e.target.value)}
                  placeholder="Enter NID number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nidFile">Upload NID Document (PDF) *</Label>
                <Input
                  id="nidFile"
                  type="file"
                  required
                  accept=".pdf"
                  onChange={(e) => setNidFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Complete Onboarding"}
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

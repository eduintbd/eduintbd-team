import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Download, User, CheckCircle2, AlertCircle, Edit3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { z } from "zod";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  phone: z.string().trim().min(1, "Phone is required").max(20),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().trim().max(10).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
  bankName: z.string().trim().max(100).optional(),
  bankBranch: z.string().trim().max(100).optional(),
  bankAccountNumber: z.string().trim().max(50).optional(),
  nidNumber: z.string().trim().max(50).optional(),
  tinNumber: z.string().trim().max(50).optional(),
});

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingNID, setUploadingNID] = useState(false);
  const [uploadingTIN, setUploadingTIN] = useState(false);
  const [uploadingBankStatement, setUploadingBankStatement] = useState(false);
  const [requestingUpdate, setRequestingUpdate] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [tinFile, setTinFile] = useState<File | null>(null);
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    bloodGroup: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    bankName: "",
    bankBranch: "",
    bankAccountNumber: "",
    nidNumber: "",
    tinNumber: "",
  });

  useEffect(() => {
    fetchEmployeeData();
    checkPendingUpdates();
  }, []);

  const checkPendingUpdates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!employee) return;

      const { data, error } = await supabase
        .from("employee_profile_updates")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("status", "pending")
        .single();

      if (!error && data) {
        setHasPendingUpdate(true);
      }
    } catch (error) {
      console.error("Error checking pending updates:", error);
    }
  };

  const fetchEmployeeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view your profile");
        return;
      }

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setEmployeeData(data);
      
      // Load avatar preview if exists
      if (data.avatar_url) {
        const { data: avatarData } = supabase.storage
          .from("avatars")
          .getPublicUrl(data.avatar_url);
        setAvatarPreview(avatarData.publicUrl);
      }
      
      setFormData({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        phone: data.phone || "",
        dateOfBirth: data.date_of_birth || "",
        bloodGroup: data.blood_group || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        postalCode: data.postal_code || "",
        country: data.country || "",
        emergencyContactName: data.emergency_contact_name || "",
        emergencyContactPhone: data.emergency_contact_phone || "",
        bankName: data.bank_name || "",
        bankBranch: data.bank_branch || "",
        bankAccountNumber: data.bank_account_number || "",
        nidNumber: data.nid_number || "",
        tinNumber: data.tin_number || "",
      });
    } catch (error: any) {
      toast.error("Failed to load profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const validation = profileSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setSaving(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prepare update data
      const updateData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim(),
        date_of_birth: formData.dateOfBirth || null,
        blood_group: formData.bloodGroup.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        postal_code: formData.postalCode.trim() || null,
        country: formData.country.trim() || null,
        emergency_contact_name: formData.emergencyContactName.trim() || null,
        emergency_contact_phone: formData.emergencyContactPhone.trim() || null,
        bank_name: formData.bankName.trim() || null,
        bank_branch: formData.bankBranch.trim() || null,
        bank_account_number: formData.bankAccountNumber.trim() || null,
        nid_number: formData.nidNumber.trim() || null,
        tin_number: formData.tinNumber.trim() || null,
      };

      // Create pending update request
      const { data: updateRequest, error: updateError } = await supabase
        .from("employee_profile_updates")
        .insert({
          employee_id: employeeData.id,
          pending_data: updateData,
          status: "pending",
        })
        .select()
        .single();

      if (updateError) throw updateError;

      // Create task for manager review
      const { error: taskError } = await supabase.functions.invoke('create-profile-review-task', {
        body: { 
          employeeId: employeeData.id, 
          updateRequestId: updateRequest.id 
        }
      });

      if (taskError) {
        console.error('Failed to create task:', taskError);
        toast.warning("Update request submitted, but task creation failed. Please notify your manager.");
      } else {
        toast.success("Profile update submitted for manager approval!");
      }

      setHasPendingUpdate(true);
    } catch (error: any) {
      toast.error("Failed to submit update: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestBankUpdate = async () => {
    setRequestingUpdate(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("employees")
        .update({ bank_details_update_requested: true })
        .eq("user_id", user.id);

      if (error) throw error;

      // Create task for manager
      const { error: taskError } = await supabase.functions.invoke('create-bank-verification-task', {
        body: { employeeId: employeeData.id, actionType: 'update_request' }
      });

      if (taskError) {
        console.error('Failed to create task:', taskError);
        toast.warning("Update request submitted, but task creation failed. Please notify your manager.");
      } else {
        toast.success("Update request submitted. A task has been created for your manager.");
      }

      fetchEmployeeData();
    } catch (error: any) {
      toast.error("Failed to request update: " + error.message);
    } finally {
      setRequestingUpdate(false);
    }
  };

  const handleCVUpload = async () => {
    if (!cvFile) {
      toast.error("Please select a CV file");
      return;
    }

    setUploadingCV(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = cvFile.name.split('.').pop();
      const cvFileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("employee-cvs")
        .upload(cvFileName, cvFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("employees")
        .update({ cv_url: cvFileName })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("CV uploaded successfully!");
      setCvFile(null);
      fetchEmployeeData();
    } catch (error: any) {
      toast.error("Failed to upload CV: " + error.message);
    } finally {
      setUploadingCV(false);
    }
  };

  const handleDownloadCV = async () => {
    if (!employeeData?.cv_url) return;

    try {
      const { data, error } = await supabase.storage
        .from("employee-cvs")
        .download(employeeData.cv_url);

      if (error) throw error;

      const fileName = employeeData.cv_url.split('/').pop() || 'cv.pdf';
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("CV downloaded successfully!");
    } catch (error: any) {
      toast.error("Failed to download CV: " + error.message);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingAvatar(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = avatarFile.name.split('.').pop();
      const avatarFileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(avatarFileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("employees")
        .update({ avatar_url: avatarFileName })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("Profile picture updated successfully!");
      setAvatarFile(null);
      fetchEmployeeData();
    } catch (error: any) {
      toast.error("Failed to upload profile picture: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleNIDUpload = async () => {
    if (!nidFile) {
      toast.error("Please select an NID document");
      return;
    }

    setUploadingNID(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = nidFile.name.split('.').pop();
      const nidFileName = `${user.id}/nid_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(nidFileName, nidFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("employees")
        .update({ nid_document_url: nidFileName })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("NID document uploaded successfully!");
      setNidFile(null);
      fetchEmployeeData();
    } catch (error: any) {
      toast.error("Failed to upload NID: " + error.message);
    } finally {
      setUploadingNID(false);
    }
  };

  const handleDownloadNID = async () => {
    if (!employeeData?.nid_document_url) return;

    try {
      const { data, error } = await supabase.storage
        .from("identity-documents")
        .download(employeeData.nid_document_url);

      if (error) throw error;

      const fileName = employeeData.nid_document_url.split('/').pop() || 'nid.pdf';
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("NID document downloaded successfully!");
    } catch (error: any) {
      toast.error("Failed to download NID: " + error.message);
    }
  };

  const handleTINUpload = async () => {
    if (!tinFile) {
      toast.error("Please select a TIN document");
      return;
    }

    setUploadingTIN(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = tinFile.name.split('.').pop();
      const tinFileName = `${user.id}/tin_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(tinFileName, tinFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("employees")
        .update({ tin_document_url: tinFileName })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("TIN document uploaded successfully!");
      setTinFile(null);
      fetchEmployeeData();
    } catch (error: any) {
      toast.error("Failed to upload TIN: " + error.message);
    } finally {
      setUploadingTIN(false);
    }
  };

  const handleDownloadTIN = async () => {
    if (!employeeData?.tin_document_url) return;

    try {
      const { data, error } = await supabase.storage
        .from("identity-documents")
        .download(employeeData.tin_document_url);

      if (error) throw error;

      const fileName = employeeData.tin_document_url.split('/').pop() || 'tin.pdf';
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("TIN document downloaded successfully!");
    } catch (error: any) {
      toast.error("Failed to download TIN: " + error.message);
    }
  };

  const handleBankStatementUpload = async () => {
    if (!bankStatementFile) {
      toast.error("Please select a bank statement or cheque");
      return;
    }

    setUploadingBankStatement(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = bankStatementFile.name.split('.').pop();
      const fileName = `${user.id}/bank_statement_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("bank-documents")
        .upload(fileName, bankStatementFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("employees")
        .update({ bank_statement_url: fileName })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Create task for manager to verify
      const { error: taskError } = await supabase.functions.invoke('create-bank-verification-task', {
        body: { employeeId: employeeData.id, actionType: 'upload' }
      });

      if (taskError) {
        console.error('Failed to create task:', taskError);
        toast.warning("Bank statement uploaded, but task creation failed. Please notify your manager.");
      } else {
        toast.success("Bank statement uploaded! A verification task has been created for your manager.");
      }

      setBankStatementFile(null);
      fetchEmployeeData();
    } catch (error: any) {
      toast.error("Failed to upload bank statement: " + error.message);
    } finally {
      setUploadingBankStatement(false);
    }
  };

  const handleDownloadBankStatement = async () => {
    if (!employeeData?.bank_statement_url) return;

    try {
      const { data, error } = await supabase.storage
        .from("bank-documents")
        .download(employeeData.bank_statement_url);

      if (error) throw error;

      const fileName = employeeData.bank_statement_url.split('/').pop() || 'bank_statement.pdf';
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Bank statement downloaded successfully!");
    } catch (error: any) {
      toast.error("Failed to download bank statement: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">Manage your personal information and documents</p>
          </div>
          {hasPendingUpdate && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">Update Pending Manager Approval</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Profile Picture */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Upload your profile photo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview} alt={`${formData.firstName} ${formData.lastName}`} />
                <AvatarFallback className="text-2xl">
                  {formData.firstName?.[0]}{formData.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="avatarUpload">Choose Image</Label>
                  <Input
                    id="avatarUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, or WEBP. Maximum file size: 5MB
                  </p>
                </div>
                <Button
                  onClick={handleAvatarUpload}
                  disabled={!avatarFile || uploadingAvatar}
                  variant="secondary"
                  size="sm"
                >
                  {uploadingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Upload className="mr-2 h-4 w-4" />
                  {employeeData?.avatar_url ? "Update Photo" : "Upload Photo"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Input
                    id="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    placeholder="e.g., A+"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nidNumber">NID Number</Label>
                  <Input
                    id="nidNumber"
                    value={formData.nidNumber}
                    onChange={(e) => setFormData({ ...formData, nidNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tinNumber">TIN Number</Label>
                  <Input
                    id="tinNumber"
                    value={formData.tinNumber}
                    onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Address Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                    <Input
                      id="emergencyContactPhone"
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Banking Information</h3>
                  {employeeData?.bank_details_verified && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Verified by Manager</span>
                    </div>
                  )}
                  {employeeData?.bank_details_update_requested && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-600">Update Pending</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      disabled={employeeData?.bank_details_verified}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankBranch">Branch</Label>
                    <Input
                      id="bankBranch"
                      value={formData.bankBranch}
                      onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                      disabled={employeeData?.bank_details_verified}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      disabled={employeeData?.bank_details_verified}
                    />
                  </div>
                </div>

                {employeeData?.bank_details_verified && !employeeData?.bank_details_update_requested && (
                  <Button
                    variant="outline"
                    onClick={handleRequestBankUpdate}
                    disabled={requestingUpdate}
                  >
                    {requestingUpdate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Edit3 className="mr-2 h-4 w-4" />
                    Request Update
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving || hasPendingUpdate}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {hasPendingUpdate ? "Update Pending Approval" : "Submit for Approval"}
                </Button>
                {hasPendingUpdate && (
                  <p className="text-sm text-muted-foreground">
                    Your previous update is pending manager approval
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* CV Management */}
        <Card>
          <CardHeader>
            <CardTitle>CV Management</CardTitle>
            <CardDescription>Upload or update your curriculum vitae</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {employeeData?.cv_url && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">Current CV</p>
                    <p className="text-sm text-muted-foreground">Uploaded on file</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadCV}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cvUpload">
                {employeeData?.cv_url ? "Upload New CV" : "Upload CV"}
              </Label>
              <Input
                id="cvUpload"
                type="file"
                accept=".pdf"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                PDF format only. Maximum file size: 10MB
              </p>
            </div>

            <Button
              onClick={handleCVUpload}
              disabled={!cvFile || uploadingCV}
              variant="secondary"
            >
              {uploadingCV && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              {employeeData?.cv_url ? "Update CV" : "Upload CV"}
            </Button>
          </CardContent>
        </Card>

        {/* NID Document Management */}
        <Card>
          <CardHeader>
            <CardTitle>NID Certificate</CardTitle>
            <CardDescription>Upload your National ID document</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {employeeData?.nid_document_url && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">NID Document Uploaded</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadNID}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nidUpload">
                {employeeData?.nid_document_url ? "Upload New NID Document" : "Upload NID Document"}
              </Label>
              <Input
                id="nidUpload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setNidFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                PDF, JPG, or PNG format. Maximum file size: 10MB
              </p>
            </div>

            <Button
              onClick={handleNIDUpload}
              disabled={!nidFile || uploadingNID}
              variant="secondary"
            >
              {uploadingNID && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              {employeeData?.nid_document_url ? "Update NID" : "Upload NID"}
            </Button>
          </CardContent>
        </Card>

        {/* TIN Document Management */}
        <Card>
          <CardHeader>
            <CardTitle>TIN Certificate</CardTitle>
            <CardDescription>Upload your Tax Identification Number certificate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {employeeData?.tin_document_url && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">TIN Document Uploaded</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTIN}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tinUpload">
                {employeeData?.tin_document_url ? "Upload New TIN Document" : "Upload TIN Document"}
              </Label>
              <Input
                id="tinUpload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setTinFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                PDF, JPG, or PNG format. Maximum file size: 10MB
              </p>
            </div>

            <Button
              onClick={handleTINUpload}
              disabled={!tinFile || uploadingTIN}
              variant="secondary"
            >
              {uploadingTIN && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              {employeeData?.tin_document_url ? "Update TIN" : "Upload TIN"}
            </Button>
          </CardContent>
        </Card>

        {/* Bank Statement/Cheque Management */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Statement or Cheque</CardTitle>
            <CardDescription>Upload bank statement or cancelled cheque for verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {employeeData?.bank_statement_url && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">Bank Document Uploaded</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadBankStatement}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bankStatementUpload">
                {employeeData?.bank_statement_url ? "Upload New Bank Document" : "Upload Bank Document"}
              </Label>
              <Input
                id="bankStatementUpload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setBankStatementFile(e.target.files?.[0] || null)}
                disabled={employeeData?.bank_details_verified}
              />
              <p className="text-xs text-muted-foreground">
                PDF, JPG, or PNG format. Maximum file size: 10MB
              </p>
            </div>

            <Button
              onClick={handleBankStatementUpload}
              disabled={!bankStatementFile || uploadingBankStatement || employeeData?.bank_details_verified}
              variant="secondary"
            >
              {uploadingBankStatement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              {employeeData?.bank_statement_url ? "Update Document" : "Upload Document"}
            </Button>
          </CardContent>
        </Card>

        {/* Read-only Information */}
        <Card>
          <CardHeader>
            <CardTitle>Work Information</CardTitle>
            <CardDescription>This information is managed by HR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Employee ID</Label>
                <p className="font-medium">{employeeData?.employee_code}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{employeeData?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Hire Date</Label>
                <p className="font-medium">
                  {employeeData?.hire_date
                    ? new Date(employeeData.hire_date).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="font-medium capitalize">{employeeData?.status || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;

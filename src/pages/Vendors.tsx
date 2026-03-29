import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Building2, Phone, Mail, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "", contact_person: "", phone: "", email: "", address: "", notes: "",
  });

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("name");
    if (error) toast.error("Error loading vendors");
    else setVendors(data || []);
  };

  const resetForm = () => {
    setFormData({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "" });
    setEditingVendor(null);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contact_person: vendor.contact_person || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVendor) {
      const { error } = await supabase
        .from("vendors")
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq("id", editingVendor.id);
      if (error) toast.error("Error updating vendor");
      else toast.success("Vendor updated");
    } else {
      const { error } = await supabase.from("vendors").insert([formData]);
      if (error) toast.error("Error creating vendor");
      else toast.success("Vendor added");
    }
    setOpen(false);
    resetForm();
    fetchVendors();
  };

  const toggleActive = async (vendor: Vendor) => {
    const { error } = await supabase
      .from("vendors")
      .update({ is_active: !vendor.is_active })
      .eq("id", vendor.id);
    if (error) toast.error("Error updating vendor");
    else {
      toast.success(`Vendor ${vendor.is_active ? "deactivated" : "activated"}`);
      fetchVendors();
    }
  };

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.contact_person?.toLowerCase().includes(search.toLowerCase()) || false
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Vendors</h1>
          <p className="text-muted-foreground mt-2">Manage suppliers and vendor relationships</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Vendor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
              <DialogDescription>Enter vendor/supplier details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Company/Vendor Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">{editingVendor ? "Update Vendor" : "Add Vendor"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Vendors ({filtered.length})</CardTitle>
              <CardDescription>Supplier directory</CardDescription>
            </div>
            <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{vendor.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{vendor.contact_person || "-"}</TableCell>
                  <TableCell>{vendor.phone || "-"}</TableCell>
                  <TableCell>{vendor.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={vendor.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(vendor)}>
                      {vendor.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(vendor)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No vendors found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendors;

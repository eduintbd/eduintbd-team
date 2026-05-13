import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Facebook,
  Youtube,
  Linkedin,
  ExternalLink,
  Pencil,
  Users,
  MessageCircle,
  Music,
  Camera,
  Plus,
  Building2,
  Trash2,
} from "lucide-react";

interface Package {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  features: string[];
  max_channels: number;
  max_posts_per_month: number;
}

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  contact_person: string | null;
  client_type: string | null;
  package_id: string | null;
  monthly_fee: number | null;
  package_start_date: string | null;
  notes: string | null;
  is_active: boolean;
}

interface SocialChannel {
  id: string;
  platform: string;
  channel_name: string;
  channel_handle: string | null;
  channel_url: string | null;
  followers_count: number;
  is_active: boolean;
  description: string | null;
  company_id: string | null;
  created_at: string;
}

const platformConfig: Record<string, { icon: React.ReactNode; color: string; bgClass: string }> = {
  facebook: { icon: <Facebook className="h-6 w-6" />, color: "text-blue-600", bgClass: "bg-blue-50 dark:bg-blue-950/30" },
  youtube: { icon: <Youtube className="h-6 w-6" />, color: "text-red-600", bgClass: "bg-red-50 dark:bg-red-950/30" },
  whatsapp: { icon: <MessageCircle className="h-6 w-6" />, color: "text-green-600", bgClass: "bg-green-50 dark:bg-green-950/30" },
  linkedin: { icon: <Linkedin className="h-6 w-6" />, color: "text-blue-700", bgClass: "bg-blue-50 dark:bg-blue-950/30" },
  tiktok: { icon: <Music className="h-6 w-6" />, color: "text-gray-900 dark:text-gray-100", bgClass: "bg-gray-100 dark:bg-gray-800" },
  instagram: { icon: <Camera className="h-6 w-6" />, color: "text-pink-600", bgClass: "bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30" },
};

const platformOptions = ["facebook", "youtube", "whatsapp", "linkedin", "tiktok", "instagram"];

function formatFollowers(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function ChannelManager() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  // Edit channel
  const [editChannel, setEditChannel] = useState<SocialChannel | null>(null);
  const [editForm, setEditForm] = useState({ channel_name: "", channel_handle: "", channel_url: "", description: "" });

  // Add channel
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ platform: "facebook", channel_name: "", channel_handle: "", channel_url: "", description: "", company_id: "" });

  // Packages
  const [packages, setPackages] = useState<Package[]>([]);

  // Add/Edit company
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: "", logo_url: "", website: "", industry: "", description: "", address: "", phone: "",
    whatsapp: "", email: "", contact_person: "", client_type: "standard",
    package_id: "", monthly_fee: "", notes: "",
  });

  // Inline channel rows for company setup
  const [companyChannelRows, setCompanyChannelRows] = useState<
    { platform: string; channel_name: string; channel_handle: string; channel_url: string }[]
  >([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: compData }, { data: chanData }, { data: pkgData }] = await Promise.all([
      supabase.from("social_media_companies").select("*").order("name"),
      supabase.from("social_media_channels").select("*").order("platform"),
      supabase.from("social_media_packages").select("*").order("price"),
    ]);
    setCompanies((compData || []) as any);
    setChannels((chanData || []) as any);
    setPackages((pkgData || []) as any);
    setLoading(false);
  };

  const openAddCompany = () => {
    setEditingCompany(null);
    setCompanyForm({ name: "", logo_url: "", website: "", industry: "", description: "", address: "", phone: "", whatsapp: "", email: "", contact_person: "", client_type: "standard", package_id: "", monthly_fee: "", notes: "" });
    setCompanyChannelRows([]);
    setAddCompanyOpen(true);
  };

  const openEditCompany = (c: Company) => {
    setEditingCompany(c);
    setCompanyForm({
      name: c.name, logo_url: c.logo_url || "", website: c.website || "", industry: c.industry || "", description: c.description || "",
      address: c.address || "", phone: c.phone || "", whatsapp: c.whatsapp || "", email: c.email || "",
      contact_person: c.contact_person || "", client_type: c.client_type || "standard",
      package_id: c.package_id || "", monthly_fee: c.monthly_fee ? String(c.monthly_fee) : "", notes: c.notes || "",
    });
    // Load existing channels for this company
    const existingChannels = channels.filter(ch => ch.company_id === c.id);
    setCompanyChannelRows(existingChannels.map(ch => ({
      platform: ch.platform,
      channel_name: ch.channel_name,
      channel_handle: ch.channel_handle || "",
      channel_url: ch.channel_url || "",
    })));
    setAddCompanyOpen(true);
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name) { toast.error("Company name required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      name: companyForm.name,
      logo_url: companyForm.logo_url || null,
      website: companyForm.website || null,
      industry: companyForm.industry || null,
      description: companyForm.description || null,
      address: companyForm.address || null,
      phone: companyForm.phone || null,
      whatsapp: companyForm.whatsapp || null,
      email: companyForm.email || null,
      contact_person: companyForm.contact_person || null,
      client_type: companyForm.client_type || "standard",
      package_id: companyForm.package_id || null,
      monthly_fee: companyForm.monthly_fee ? parseFloat(companyForm.monthly_fee) : null,
      notes: companyForm.notes || null,
    } as any;

    let companyId: string;

    if (editingCompany) {
      const { error } = await supabase.from("social_media_companies").update(payload).eq("id", editingCompany.id);
      if (error) { toast.error("Failed to update company"); return; }
      companyId = editingCompany.id;
    } else {
      payload.created_by = user?.id;
      const { data, error } = await supabase.from("social_media_companies").insert(payload).select("id").single();
      if (error || !data) { toast.error("Failed to add company"); return; }
      companyId = (data as any).id;
    }

    // Save inline channels — delete old ones for this company and re-insert
    const validRows = companyChannelRows.filter(r => r.channel_name);
    if (validRows.length > 0 || editingCompany) {
      // Remove existing channels for this company
      await supabase.from("social_media_channels").delete().eq("company_id", companyId);

      if (validRows.length > 0) {
        const channelInserts = validRows.map(r => ({
          platform: r.platform,
          channel_name: r.channel_name,
          channel_handle: r.channel_handle || null,
          channel_url: r.channel_url || null,
          company_id: companyId,
          created_by: user?.id,
        }));
        const { error: chErr } = await supabase.from("social_media_channels").insert(channelInserts as any);
        if (chErr) { toast.error("Company saved but failed to save some channels"); }
      }
    }

    toast.success(`${companyForm.name} ${editingCompany ? "updated" : "added"}`);
    setAddCompanyOpen(false);
    setEditingCompany(null);
    setCompanyChannelRows([]);
    fetchAll();
  };

  const handleAddChannel = async () => {
    if (!newChannel.channel_name || !newChannel.company_id) { toast.error("Name and company required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("social_media_channels").insert({
      platform: newChannel.platform,
      channel_name: newChannel.channel_name,
      channel_handle: newChannel.channel_handle || null,
      channel_url: newChannel.channel_url || null,
      description: newChannel.description || null,
      company_id: newChannel.company_id,
      created_by: user?.id,
    } as any);
    if (error) { toast.error("Failed to add channel"); return; }
    toast.success(`${newChannel.channel_name} added`);
    setAddChannelOpen(false);
    setNewChannel({ platform: "facebook", channel_name: "", channel_handle: "", channel_url: "", description: "", company_id: "" });
    fetchAll();
  };

  const handleToggleActive = async (channel: SocialChannel) => {
    await supabase.from("social_media_channels").update({ is_active: !channel.is_active } as any).eq("id", channel.id);
    toast.success(`${channel.channel_name} ${channel.is_active ? "deactivated" : "activated"}`);
    fetchAll();
  };

  const openEdit = (channel: SocialChannel) => {
    setEditChannel(channel);
    setEditForm({ channel_name: channel.channel_name, channel_handle: channel.channel_handle || "", channel_url: channel.channel_url || "", description: channel.description || "" });
  };

  const handleSave = async () => {
    if (!editChannel) return;
    await supabase.from("social_media_channels").update({
      channel_name: editForm.channel_name,
      channel_handle: editForm.channel_handle || null,
      channel_url: editForm.channel_url || null,
      description: editForm.description || null,
    } as any).eq("id", editChannel.id);
    toast.success("Channel updated");
    setEditChannel(null);
    fetchAll();
  };

  const handleDeleteChannel = async (channel: SocialChannel) => {
    await supabase.from("social_media_channels").delete().eq("id", channel.id);
    toast.success(`${channel.channel_name} deleted`);
    fetchAll();
  };

  const filtered = selectedCompany === "all" ? channels : channels.filter(c => c.company_id === selectedCompany);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <>
      {/* Company selector + actions */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies ({channels.length})</SelectItem>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({channels.filter(ch => ch.company_id === c.id).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={openAddCompany}>
          <Building2 className="h-4 w-4 mr-2" />
          Add Company
        </Button>
        <Button onClick={() => { setNewChannel({ ...newChannel, company_id: selectedCompany !== "all" ? selectedCompany : "" }); setAddChannelOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Channel
        </Button>
      </div>

      {/* Company cards */}
      {companies.length > 0 && selectedCompany === "all" && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Companies</h3>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {companies.map(c => {
              const pkg = packages.find(p => p.id === c.package_id);
              const clientTypeColors: Record<string, string> = {
                standard: "bg-gray-100 text-gray-700", premium: "bg-amber-100 text-amber-700",
                enterprise: "bg-purple-100 text-purple-700", startup: "bg-green-100 text-green-700",
                agency: "bg-blue-100 text-blue-700",
              };
              return (
                <Card key={c.id} className={`cursor-pointer hover:bg-accent/50 transition-colors ${selectedCompany === c.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedCompany(c.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt={c.name} className="h-10 w-10 rounded-lg object-cover border shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{channels.filter(ch => ch.company_id === c.id).length} channels</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openEditCompany(c); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.client_type && <Badge className={`text-[10px] ${clientTypeColors[c.client_type] || ""}`}>{c.client_type}</Badge>}
                      {c.industry && <Badge variant="outline" className="text-[10px]">{c.industry}</Badge>}
                      {pkg && <Badge variant="outline" className="text-[10px]">{pkg.name}</Badge>}
                    </div>
                    {c.contact_person && <p className="text-xs text-muted-foreground mt-1">{c.contact_person}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Separator className="mt-6" />
        </div>
      )}

      {/* Channels grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((channel) => {
          const config = platformConfig[channel.platform] || { icon: <Users className="h-6 w-6" />, color: "text-gray-600", bgClass: "bg-gray-50" };
          const company = companies.find(c => c.id === channel.company_id);
          return (
            <Card key={channel.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bgClass} ${config.color}`}>{config.icon}</div>
                    <div>
                      <CardTitle className="text-base">{channel.channel_name}</CardTitle>
                      {channel.channel_handle && <p className="text-xs text-muted-foreground">@{channel.channel_handle}</p>}
                    </div>
                  </div>
                  <Badge variant={channel.is_active ? "default" : "secondary"}>{channel.is_active ? "Active" : "Inactive"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {company && (
                  <Badge variant="outline" className="text-[10px] mb-2">
                    <Building2 className="h-3 w-3 mr-1" />{company.name}
                  </Badge>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Users className="h-4 w-4" />
                  <span>{formatFollowers(channel.followers_count)} followers</span>
                </div>
                {channel.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{channel.description}</p>}
                <div className="flex items-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openEdit(channel)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteChannel(channel)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="flex items-center gap-2 ml-auto">
                    <Switch id={`active-${channel.id}`} checked={channel.is_active} onCheckedChange={() => handleToggleActive(channel)} />
                  </div>
                  {channel.channel_url && (
                    <a href={channel.channel_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No channels found. Add a channel to get started.</div>}
      </div>

      {/* Edit Channel Dialog */}
      <Dialog open={!!editChannel} onOpenChange={(open) => !open && setEditChannel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Channel Name</Label><Input value={editForm.channel_name} onChange={(e) => setEditForm({ ...editForm, channel_name: e.target.value })} /></div>
            <div><Label>Handle</Label><Input value={editForm.channel_handle} onChange={(e) => setEditForm({ ...editForm, channel_handle: e.target.value })} placeholder="@handle" /></div>
            <div><Label>Channel URL</Label><Input value={editForm.channel_url} onChange={(e) => setEditForm({ ...editForm, channel_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Description</Label><Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditChannel(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Channel Dialog */}
      <Dialog open={addChannelOpen} onOpenChange={setAddChannelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Channel</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Company</Label>
              <Select value={newChannel.company_id} onValueChange={(v) => setNewChannel({ ...newChannel, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={newChannel.platform} onValueChange={(v) => setNewChannel({ ...newChannel, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{platformOptions.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Channel Name</Label><Input value={newChannel.channel_name} onChange={(e) => setNewChannel({ ...newChannel, channel_name: e.target.value })} placeholder="Page/account name" /></div>
            <div><Label>Handle</Label><Input value={newChannel.channel_handle} onChange={(e) => setNewChannel({ ...newChannel, channel_handle: e.target.value })} placeholder="@handle" /></div>
            <div><Label>URL</Label><Input value={newChannel.channel_url} onChange={(e) => setNewChannel({ ...newChannel, channel_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Description</Label><Input value={newChannel.description} onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddChannelOpen(false)}>Cancel</Button><Button onClick={handleAddChannel}>Add Channel</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Company Dialog */}
      <Dialog open={addCompanyOpen} onOpenChange={(open) => { if (!open) { setAddCompanyOpen(false); setEditingCompany(null); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCompany ? "Edit" : "Add"} Company</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Company Name *</Label><Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} placeholder="Acme Corp" /></div>
              <div><Label>Contact Person</Label><Input value={companyForm.contact_person} onChange={(e) => setCompanyForm({ ...companyForm, contact_person: e.target.value })} placeholder="John Doe" /></div>
            </div>
            <div><Label>Logo URL</Label><Input value={companyForm.logo_url} onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })} placeholder="https://example.com/logo.png" /></div>
            {companyForm.logo_url && (
              <div className="flex items-center gap-3">
                <img src={companyForm.logo_url} alt="Logo preview" className="h-10 w-10 rounded-lg object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-xs text-muted-foreground">Logo preview</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} placeholder="info@company.com" /></div>
              <div><Label>Phone</Label><Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} placeholder="+880 1XXX-XXXXXX" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>WhatsApp</Label><Input value={companyForm.whatsapp} onChange={(e) => setCompanyForm({ ...companyForm, whatsapp: e.target.value })} placeholder="+880 1XXX-XXXXXX" /></div>
              <div><Label>Website</Label><Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div><Label>Address</Label><Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} placeholder="Full address" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Industry</Label><Input value={companyForm.industry} onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })} placeholder="Technology, Finance..." /></div>
              <div>
                <Label>Client Type</Label>
                <Select value={companyForm.client_type} onValueChange={(v) => setCompanyForm({ ...companyForm, client_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <h4 className="text-sm font-medium">Package & Billing</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Package</Label>
                <Select value={companyForm.package_id} onValueChange={(v) => setCompanyForm({ ...companyForm, package_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    {packages.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — BDT {p.price.toLocaleString()}/{p.billing_cycle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Monthly Fee (BDT)</Label><Input type="number" value={companyForm.monthly_fee} onChange={(e) => setCompanyForm({ ...companyForm, monthly_fee: e.target.value })} placeholder="0" /></div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Social Media Channels</h4>
              <Button type="button" variant="outline" size="sm" onClick={() => setCompanyChannelRows([...companyChannelRows, { platform: "facebook", channel_name: "", channel_handle: "", channel_url: "" }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Channel
              </Button>
            </div>
            {companyChannelRows.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No channels added. Click "Add Channel" to link social pages.</p>
            ) : (
              <div className="space-y-3">
                {companyChannelRows.map((row, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <Select value={row.platform} onValueChange={(v) => { const updated = [...companyChannelRows]; updated[idx] = { ...updated[idx], platform: v }; setCompanyChannelRows(updated); }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{platformOptions.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className="h-8 text-xs" value={row.channel_name} onChange={(e) => { const updated = [...companyChannelRows]; updated[idx] = { ...updated[idx], channel_name: e.target.value }; setCompanyChannelRows(updated); }} placeholder="Page / Channel name" />
                      <Input className="h-8 text-xs" value={row.channel_handle} onChange={(e) => { const updated = [...companyChannelRows]; updated[idx] = { ...updated[idx], channel_handle: e.target.value }; setCompanyChannelRows(updated); }} placeholder="@handle" />
                      <Input className="h-8 text-xs" value={row.channel_url} onChange={(e) => { const updated = [...companyChannelRows]; updated[idx] = { ...updated[idx], channel_url: e.target.value }; setCompanyChannelRows(updated); }} placeholder="https://..." />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => setCompanyChannelRows(companyChannelRows.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Separator />
            <div><Label>Description</Label><Textarea value={companyForm.description} onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })} placeholder="About this client..." rows={2} /></div>
            <div><Label>Notes</Label><Textarea value={companyForm.notes} onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })} placeholder="Internal notes..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddCompanyOpen(false); setEditingCompany(null); }}>Cancel</Button>
            <Button onClick={handleSaveCompany}>{editingCompany ? "Save Changes" : "Add Company"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

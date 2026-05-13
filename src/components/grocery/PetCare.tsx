import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Dog,
  Droplets,
  Syringe,
  UtensilsCrossed,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PetProfile {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  date_of_birth: string | null;
  is_active: boolean;
}

interface PetFoodLog {
  id: string;
  pet_id: string;
  date: string;
  food_type: string;
  brand: string | null;
  quantity: string | null;
  notes: string | null;
}

interface PetGroomingLog {
  id: string;
  pet_id: string;
  date: string;
  type: string;
  next_due_date: string | null;
  notes: string | null;
}

interface PetVaccine {
  id: string;
  pet_id: string;
  vaccine_name: string;
  date_given: string;
  next_due_date: string | null;
  vet_name: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GROOMING_TYPES: Record<string, { label: string; className: string }> = {
  bath: { label: "Bath", className: "bg-blue-100 text-blue-800" },
  grooming: { label: "Grooming", className: "bg-purple-100 text-purple-800" },
  nail_trim: { label: "Nail Trim", className: "bg-orange-100 text-orange-800" },
  other: { label: "Other", className: "bg-gray-100 text-gray-800" },
};

function vaccineStatusColor(nextDueDate: string | null) {
  if (!nextDueDate) return "";
  const days = differenceInDays(parseISO(nextDueDate), new Date());
  if (days < 0) return "bg-red-100 text-red-800";
  if (days <= 30) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function vaccineStatusLabel(nextDueDate: string | null) {
  if (!nextDueDate) return "";
  const days = differenceInDays(parseISO(nextDueDate), new Date());
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days <= 30) return `Due in ${days}d`;
  return `${days}d away`;
}

function formatDateStr(d: string) {
  try {
    return format(parseISO(d), "dd MMM yyyy");
  } catch {
    return d;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PetCare() {
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [foodLogs, setFoodLogs] = useState<PetFoodLog[]>([]);
  const [groomingLogs, setGroomingLogs] = useState<PetGroomingLog[]>([]);
  const [vaccines, setVaccines] = useState<PetVaccine[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [petDialogOpen, setPetDialogOpen] = useState(false);
  const [foodDialogOpen, setFoodDialogOpen] = useState(false);
  const [groomDialogOpen, setGroomDialogOpen] = useState(false);
  const [vaccineDialogOpen, setVaccineDialogOpen] = useState(false);

  // Forms
  const [petForm, setPetForm] = useState({ name: "", species: "dog", breed: "", date_of_birth: "" });
  const [foodForm, setFoodForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), food_type: "", brand: "", quantity: "", notes: "" });
  const [groomForm, setGroomForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), type: "bath", next_due_date: "", notes: "" });
  const [vaccineForm, setVaccineForm] = useState({ vaccine_name: "", date_given: format(new Date(), "yyyy-MM-dd"), next_due_date: "", vet_name: "", notes: "" });

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    if (selectedPetId) {
      fetchAllLogs();
    }
  }, [selectedPetId]);

  const fetchPets = async () => {
    const { data } = await supabase
      .from("pet_profiles" as any)
      .select("*")
      .eq("is_active", true)
      .order("name");
    const pets = (data as any) || [];
    setPets(pets);
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
    setLoading(false);
  };

  const fetchAllLogs = async () => {
    const [foodRes, groomRes, vaccRes] = await Promise.all([
      supabase.from("pet_food_logs" as any).select("*").eq("pet_id", selectedPetId).order("date", { ascending: false }).limit(50),
      supabase.from("pet_grooming_logs" as any).select("*").eq("pet_id", selectedPetId).order("date", { ascending: false }).limit(50),
      supabase.from("pet_vaccines" as any).select("*").eq("pet_id", selectedPetId).order("date_given", { ascending: false }),
    ]);
    setFoodLogs((foodRes.data as any) || []);
    setGroomingLogs((groomRes.data as any) || []);
    setVaccines((vaccRes.data as any) || []);
  };

  // Pet CRUD
  const handleSavePet = async () => {
    if (!petForm.name) { toast.error("Name is required"); return; }
    const { error } = await supabase.from("pet_profiles" as any).insert({
      name: petForm.name,
      species: petForm.species,
      breed: petForm.breed || null,
      date_of_birth: petForm.date_of_birth || null,
    } as any);
    if (error) { toast.error("Failed to add pet"); return; }
    toast.success(`${petForm.name} added`);
    setPetDialogOpen(false);
    setPetForm({ name: "", species: "dog", breed: "", date_of_birth: "" });
    fetchPets();
  };

  // Food log
  const handleAddFood = async () => {
    if (!foodForm.food_type) { toast.error("Food type is required"); return; }
    await supabase.from("pet_food_logs" as any).insert({
      pet_id: selectedPetId,
      date: foodForm.date,
      food_type: foodForm.food_type,
      brand: foodForm.brand || null,
      quantity: foodForm.quantity || null,
      notes: foodForm.notes || null,
    } as any);
    toast.success("Food entry added");
    setFoodDialogOpen(false);
    setFoodForm({ date: format(new Date(), "yyyy-MM-dd"), food_type: "", brand: "", quantity: "", notes: "" });
    fetchAllLogs();
  };

  // Grooming log
  const handleAddGroom = async () => {
    await supabase.from("pet_grooming_logs" as any).insert({
      pet_id: selectedPetId,
      date: groomForm.date,
      type: groomForm.type,
      next_due_date: groomForm.next_due_date || null,
      notes: groomForm.notes || null,
    } as any);
    toast.success("Grooming entry added");
    setGroomDialogOpen(false);
    setGroomForm({ date: format(new Date(), "yyyy-MM-dd"), type: "bath", next_due_date: "", notes: "" });
    fetchAllLogs();
  };

  // Vaccine
  const handleAddVaccine = async () => {
    if (!vaccineForm.vaccine_name) { toast.error("Vaccine name is required"); return; }
    await supabase.from("pet_vaccines" as any).insert({
      pet_id: selectedPetId,
      vaccine_name: vaccineForm.vaccine_name,
      date_given: vaccineForm.date_given,
      next_due_date: vaccineForm.next_due_date || null,
      vet_name: vaccineForm.vet_name || null,
      notes: vaccineForm.notes || null,
    } as any);
    toast.success("Vaccine record added");
    setVaccineDialogOpen(false);
    setVaccineForm({ vaccine_name: "", date_given: format(new Date(), "yyyy-MM-dd"), next_due_date: "", vet_name: "", notes: "" });
    fetchAllLogs();
  };

  // Delete helpers
  const deleteFood = async (id: string) => {
    await supabase.from("pet_food_logs" as any).delete().eq("id", id);
    toast.success("Entry deleted");
    fetchAllLogs();
  };
  const deleteGroom = async (id: string) => {
    await supabase.from("pet_grooming_logs" as any).delete().eq("id", id);
    toast.success("Entry deleted");
    fetchAllLogs();
  };
  const deleteVaccine = async (id: string) => {
    await supabase.from("pet_vaccines" as any).delete().eq("id", id);
    toast.success("Record deleted");
    fetchAllLogs();
  };

  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const overdueVaccines = vaccines.filter((v) => v.next_due_date && differenceInDays(parseISO(v.next_due_date), new Date()) < 0);

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading...</p>;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5" /> Pet Care
            </CardTitle>
            <div className="flex items-center gap-2">
              {pets.length > 0 && (
                <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.species})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" variant="outline" onClick={() => setPetDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Pet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pets.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No pets added yet. Add your first pet profile to get started.
            </p>
          ) : (
            <>
              {/* Pet info bar */}
              {selectedPet && (
                <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/30">
                  <Dog className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedPet.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {selectedPet.species}
                      {selectedPet.breed && ` — ${selectedPet.breed}`}
                      {selectedPet.date_of_birth && ` — Born ${formatDateStr(selectedPet.date_of_birth)}`}
                    </p>
                  </div>
                  {overdueVaccines.length > 0 && (
                    <Badge className="bg-red-100 text-red-800 gap-1 ml-auto">
                      <AlertTriangle className="h-3 w-3" /> {overdueVaccines.length} overdue vaccine(s)
                    </Badge>
                  )}
                </div>
              )}

              {/* Inner tabs */}
              <Tabs defaultValue="food">
                <TabsList>
                  <TabsTrigger value="food" className="gap-1">
                    <UtensilsCrossed className="h-3.5 w-3.5" /> Food Log
                  </TabsTrigger>
                  <TabsTrigger value="grooming" className="gap-1">
                    <Droplets className="h-3.5 w-3.5" /> Grooming
                  </TabsTrigger>
                  <TabsTrigger value="vaccines" className="gap-1">
                    <Syringe className="h-3.5 w-3.5" /> Vaccines
                  </TabsTrigger>
                </TabsList>

                {/* Food Log */}
                <TabsContent value="food" className="mt-4">
                  <Button size="sm" className="mb-3" onClick={() => setFoodDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Food Entry
                  </Button>
                  {foodLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No food entries yet.</p>
                  ) : (
                    <div className="rounded-md border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Food Type</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {foodLogs.map((f) => (
                            <TableRow key={f.id}>
                              <TableCell>{formatDateStr(f.date)}</TableCell>
                              <TableCell className="font-medium">{f.food_type}</TableCell>
                              <TableCell>{f.brand || "—"}</TableCell>
                              <TableCell>{f.quantity || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{f.notes || "—"}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFood(f.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Grooming */}
                <TabsContent value="grooming" className="mt-4">
                  <Button size="sm" className="mb-3" onClick={() => setGroomDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Grooming Entry
                  </Button>
                  {groomingLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No grooming entries yet.</p>
                  ) : (
                    <div className="rounded-md border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Next Due</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groomingLogs.map((g) => {
                            const gt = GROOMING_TYPES[g.type] || GROOMING_TYPES.other;
                            return (
                              <TableRow key={g.id}>
                                <TableCell>{formatDateStr(g.date)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-xs ${gt.className}`}>{gt.label}</Badge>
                                </TableCell>
                                <TableCell>{g.next_due_date ? formatDateStr(g.next_due_date) : "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{g.notes || "—"}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteGroom(g.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Vaccines */}
                <TabsContent value="vaccines" className="mt-4">
                  <Button size="sm" className="mb-3" onClick={() => setVaccineDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Vaccine Record
                  </Button>
                  {vaccines.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No vaccine records yet.</p>
                  ) : (
                    <div className="rounded-md border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vaccine</TableHead>
                            <TableHead>Date Given</TableHead>
                            <TableHead>Next Due</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Vet</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vaccines.map((v) => (
                            <TableRow
                              key={v.id}
                              className={v.next_due_date && differenceInDays(parseISO(v.next_due_date), new Date()) < 0 ? "bg-red-50 dark:bg-red-950/10" : ""}
                            >
                              <TableCell className="font-medium">{v.vaccine_name}</TableCell>
                              <TableCell>{formatDateStr(v.date_given)}</TableCell>
                              <TableCell>{v.next_due_date ? formatDateStr(v.next_due_date) : "—"}</TableCell>
                              <TableCell>
                                {v.next_due_date && (
                                  <Badge variant="outline" className={`text-xs ${vaccineStatusColor(v.next_due_date)}`}>
                                    {vaccineStatusLabel(v.next_due_date)}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{v.vet_name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{v.notes || "—"}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteVaccine(v.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Pet Dialog */}
      <Dialog open={petDialogOpen} onOpenChange={setPetDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Pet</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Name *</Label>
              <Input value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} placeholder="e.g. Buddy" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Species</Label>
                <Select value={petForm.species} onValueChange={(v) => setPetForm({ ...petForm, species: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">Dog</SelectItem>
                    <SelectItem value="cat">Cat</SelectItem>
                    <SelectItem value="bird">Bird</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Breed</Label>
                <Input value={petForm.breed} onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })} placeholder="e.g. German Shepherd" />
              </div>
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={petForm.date_of_birth} onChange={(e) => setPetForm({ ...petForm, date_of_birth: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePet}>Add Pet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Food Dialog */}
      <Dialog open={foodDialogOpen} onOpenChange={setFoodDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Food Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Date</Label><Input type="date" value={foodForm.date} onChange={(e) => setFoodForm({ ...foodForm, date: e.target.value })} /></div>
            <div><Label>Food Type *</Label><Input value={foodForm.food_type} onChange={(e) => setFoodForm({ ...foodForm, food_type: e.target.value })} placeholder="e.g. Dry kibble, Rice with chicken" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Brand</Label><Input value={foodForm.brand} onChange={(e) => setFoodForm({ ...foodForm, brand: e.target.value })} placeholder="e.g. Pedigree" /></div>
              <div><Label>Quantity</Label><Input value={foodForm.quantity} onChange={(e) => setFoodForm({ ...foodForm, quantity: e.target.value })} placeholder="e.g. 500g, 2 cups" /></div>
            </div>
            <div><Label>Notes</Label><Input value={foodForm.notes} onChange={(e) => setFoodForm({ ...foodForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFoodDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFood}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Grooming Dialog */}
      <Dialog open={groomDialogOpen} onOpenChange={setGroomDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Grooming Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Date</Label><Input type="date" value={groomForm.date} onChange={(e) => setGroomForm({ ...groomForm, date: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={groomForm.type} onValueChange={(v) => setGroomForm({ ...groomForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bath">Bath</SelectItem>
                  <SelectItem value="grooming">Grooming</SelectItem>
                  <SelectItem value="nail_trim">Nail Trim</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Next Due Date</Label><Input type="date" value={groomForm.next_due_date} onChange={(e) => setGroomForm({ ...groomForm, next_due_date: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={groomForm.notes} onChange={(e) => setGroomForm({ ...groomForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroomDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddGroom}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vaccine Dialog */}
      <Dialog open={vaccineDialogOpen} onOpenChange={setVaccineDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Vaccine Record</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Vaccine Name *</Label><Input value={vaccineForm.vaccine_name} onChange={(e) => setVaccineForm({ ...vaccineForm, vaccine_name: e.target.value })} placeholder="e.g. Rabies, DHPP" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date Given</Label><Input type="date" value={vaccineForm.date_given} onChange={(e) => setVaccineForm({ ...vaccineForm, date_given: e.target.value })} /></div>
              <div><Label>Next Due Date</Label><Input type="date" value={vaccineForm.next_due_date} onChange={(e) => setVaccineForm({ ...vaccineForm, next_due_date: e.target.value })} /></div>
            </div>
            <div><Label>Vet Name</Label><Input value={vaccineForm.vet_name} onChange={(e) => setVaccineForm({ ...vaccineForm, vet_name: e.target.value })} placeholder="Dr. Name" /></div>
            <div><Label>Notes</Label><Input value={vaccineForm.notes} onChange={(e) => setVaccineForm({ ...vaccineForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVaccineDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddVaccine}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

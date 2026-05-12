import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  MapPin,
  Clock,
  Trash2,
  Pencil,
  Loader2,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { email: string; responseStatus?: string }[];
  colorId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function calendarProxy<T = any>(action: string, params: Record<string, any> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("calendar-proxy", {
    body: { action, ...params },
  });
  if (error) throw error;
  return data as T;
}

const GOOGLE_COLORS: Record<string, string> = {
  "1": "#7986cb",
  "2": "#33b679",
  "3": "#8e24aa",
  "4": "#e67c73",
  "5": "#f6bf26",
  "6": "#f4511e",
  "7": "#039be5",
  "8": "#616161",
  "9": "#3f51b5",
  "10": "#0b8043",
  "11": "#d50000",
};

function getEventColor(colorId?: string): string {
  return GOOGLE_COLORS[colorId ?? "7"] ?? "#039be5";
}

function getEventTime(event: CalendarEvent): string {
  const start = event.start.dateTime ?? event.start.date ?? "";
  if (event.start.dateTime) {
    return new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return "All day";
}

function getEventDate(event: CalendarEvent): Date {
  const str = event.start.dateTime ?? event.start.date ?? "";
  return new Date(str);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toLocalISOString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Calendar = () => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formAttendees, setFormAttendees] = useState("");
  const [formColorId, setFormColorId] = useState("7");
  const [saving, setSaving] = useState(false);

  // -----------------------------------------------------------------------
  // Calendar grid computation
  // -----------------------------------------------------------------------

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(currentYear, currentMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [currentMonth, currentYear]);

  // -----------------------------------------------------------------------
  // Fetch events for visible month
  // -----------------------------------------------------------------------

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const timeMin = new Date(currentYear, currentMonth, 1).toISOString();
      const timeMax = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      const res = await calendarProxy<{ items: CalendarEvent[] }>("list_events", {
        calendarId: "primary",
        timeMin,
        timeMax,
      });
      setEvents(res.items ?? []);
    } catch (err: any) {
      toast.error("Failed to load events: " + err.message);
    } finally {
      setEventsLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

  // -----------------------------------------------------------------------
  // Events for a given day
  // -----------------------------------------------------------------------

  const eventsForDay = (day: Date) => events.filter((e) => isSameDay(getEventDate(e), day));

  const selectedDayEvents = selectedDate ? eventsForDay(selectedDate) : [];

  // -----------------------------------------------------------------------
  // Create / Edit
  // -----------------------------------------------------------------------

  const openCreateDialog = (date?: Date) => {
    setEditingEvent(null);
    const d = date ?? selectedDate ?? today;
    const start = new Date(d);
    start.setHours(9, 0, 0, 0);
    const end = new Date(d);
    end.setHours(10, 0, 0, 0);
    setFormTitle("");
    setFormDescription("");
    setFormLocation("");
    setFormStart(toLocalISOString(start));
    setFormEnd(toLocalISOString(end));
    setFormAttendees("");
    setFormColorId("7");
    setDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.summary ?? "");
    setFormDescription(event.description ?? "");
    setFormLocation(event.location ?? "");
    const s = event.start.dateTime ?? event.start.date ?? "";
    const e = event.end.dateTime ?? event.end.date ?? "";
    setFormStart(s ? toLocalISOString(new Date(s)) : "");
    setFormEnd(e ? toLocalISOString(new Date(e)) : "");
    setFormAttendees((event.attendees ?? []).map((a) => a.email).join(", "));
    setFormColorId(event.colorId ?? "7");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const attendees = formAttendees
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const payload: Record<string, any> = {
        summary: formTitle,
        description: formDescription,
        location: formLocation,
        startDateTime: new Date(formStart).toISOString(),
        endDateTime: new Date(formEnd).toISOString(),
        attendees,
        colorId: formColorId,
      };

      if (editingEvent) {
        await calendarProxy("update_event", { eventId: editingEvent.id, ...payload });
        toast.success("Event updated");
      } else {
        await calendarProxy("create_event", payload);
        toast.success("Event created");
      }
      setDialogOpen(false);
      fetchEvents();
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      await calendarProxy("delete_event", { eventId });
      toast.success("Event deleted");
      setExpandedEvent(null);
      fetchEvents();
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">
            {MONTHS[currentMonth]} {currentYear}
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          {eventsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Button onClick={() => openCreateDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          New Event
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col min-h-0 p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 flex-1 border-l border-t">
            {calendarGrid.map((day, idx) => {
              const isToday = day && isSameDay(day, today);
              const isSelected = day && selectedDate && isSameDay(day, selectedDate);
              const dayEvents = day ? eventsForDay(day) : [];

              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDate(day)}
                  className={`border-r border-b p-1 min-h-[80px] cursor-pointer transition-colors hover:bg-accent/30 ${
                    isSelected ? "bg-accent/50" : ""
                  } ${!day ? "bg-muted/20" : ""}`}
                >
                  {day && (
                    <>
                      <div className="flex justify-end">
                        <span
                          className={`text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white"
                            style={{ backgroundColor: getEventColor(ev.colorId) }}
                            title={ev.summary}
                          >
                            {ev.summary}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-muted-foreground pl-1">
                            +{dayEvents.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Sidebar */}
        <div className="w-[300px] border-l flex flex-col min-h-0">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold">
              {selectedDate
                ? selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "Select a day"}
            </h2>
            {selectedDate && (
              <p className="text-xs text-muted-foreground">
                {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <ScrollArea className="flex-1">
            {!selectedDate ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mb-2" />
                <p className="text-sm">Click a day to see events</p>
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm mb-2">No events</p>
                <Button variant="outline" size="sm" onClick={() => openCreateDialog(selectedDate)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add event
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {selectedDayEvents.map((ev) => {
                  const isExpanded = expandedEvent === ev.id;
                  return (
                    <div key={ev.id} className="px-4 py-3">
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: getEventColor(ev.colorId) }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                {getEventTime(ev)}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate">{ev.summary}</p>
                            {ev.location && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {ev.location}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="ml-5 mt-2 space-y-2">
                          {ev.description && (
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {ev.description}
                            </p>
                          )}
                          {ev.attendees && ev.attendees.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-medium">Attendees</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {ev.attendees.map((a, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">
                                    {a.email}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <Separator />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => openEditDialog(ev)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDelete(ev.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* ---- Create / Edit Event Dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "New Event"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                placeholder="Event title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                placeholder="Add description..."
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                placeholder="Add location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-attendees">Attendees (comma-separated emails)</Label>
              <Input
                id="event-attendees"
                placeholder="user@example.com, other@example.com"
                value={formAttendees}
                onChange={(e) => setFormAttendees(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(GOOGLE_COLORS).map(([id, color]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormColorId(id)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${
                      formColorId === id ? "border-foreground scale-125" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Color ${id}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingEvent ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;

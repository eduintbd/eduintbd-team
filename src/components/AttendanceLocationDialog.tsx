import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface AttendanceLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "in" | "out";
  existingRecordId?: string;
}

// Component to recenter map when location changes
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [lat, lng, map]);
  return null;
}

export function AttendanceLocationDialog({
  open,
  onOpenChange,
  type,
  existingRecordId,
}: AttendanceLocationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user's current location
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          setAddress(data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } catch (err) {
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        let msg = "Unable to get your location. Please try again.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location access denied. Please enable location permissions in your browser settings.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please check your GPS/location settings and try again.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location unavailable. Ensure GPS is enabled on your device.";
        }
        if (window.location.protocol === "http:" && window.location.hostname !== "localhost") {
          msg += " Note: Location requires HTTPS. Please use the https:// URL.";
        }
        setLocationError(msg);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Request location when dialog opens
  useEffect(() => {
    if (open) {
      getCurrentLocation();
      setRemarks("");
    }
  }, [open]);

  const attendanceMutation = useMutation({
    mutationFn: async () => {
      if (!location) throw new Error("Location is required");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get employee ID
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (empError) throw empError;
      if (!employee) throw new Error("Employee record not found");

      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      if (type === "in") {
        // Check for existing record today
        const { data: existingRecord } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("employee_id", employee.id)
          .eq("attendance_date", today)
          .maybeSingle();

        if (existingRecord) {
          throw new Error("You have already clocked in today");
        }

        // Create new attendance record with clock in
        const { error } = await supabase.from("attendance_records").insert({
          employee_id: employee.id,
          attendance_date: today,
          clock_in: now,
          clock_in_latitude: location.lat,
          clock_in_longitude: location.lng,
          clock_in_address: address,
          status: "present",
          notes: remarks || null,
        });

        if (error) throw error;
      } else {
        // Clock out - update existing record
        const { data: existingRecord, error: fetchError } = await supabase
          .from("attendance_records")
          .select("id, clock_in")
          .eq("employee_id", employee.id)
          .eq("attendance_date", today)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existingRecord) throw new Error("No clock-in record found for today");
        if (!existingRecord.clock_in) throw new Error("You haven't clocked in yet");

        // Calculate total hours
        const clockInTime = new Date(existingRecord.clock_in);
        const clockOutTime = new Date();
        const totalHours = ((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);

        const { error } = await supabase
          .from("attendance_records")
          .update({
            clock_out: now,
            clock_out_latitude: location.lat,
            clock_out_longitude: location.lng,
            clock_out_address: address,
            total_hours: parseFloat(totalHours),
            notes: remarks ? `${remarks}` : null,
          })
          .eq("id", existingRecord.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: type === "in" ? "Clocked In" : "Clocked Out",
        description: `Successfully recorded your ${type === "in" ? "clock in" : "clock out"} time with location.`,
      });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance-today"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            {type === "in" ? "Clock In" : "Clock Out"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Map Container */}
          <div className="h-[200px] w-full rounded-lg overflow-hidden border relative bg-muted">
            {isGettingLocation ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Getting your location...</span>
                </div>
              </div>
            ) : locationError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <MapPin className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive mb-2">{locationError}</p>
                <Button variant="outline" size="sm" onClick={getCurrentLocation}>
                  Try Again
                </Button>
              </div>
            ) : location ? (
              <MapContainer
                center={[location.lat, location.lng]}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.lat, location.lng]} />
                <RecenterMap lat={location.lat} lng={location.lng} />
              </MapContainer>
            ) : null}

            {/* Recenter button */}
            {location && !isGettingLocation && (
              <button
                onClick={getCurrentLocation}
                className="absolute bottom-3 right-3 z-[1000] bg-background border rounded-full p-2 shadow-md hover:bg-muted transition-colors"
                title="Recenter to current location"
              >
                <Navigation className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Location Address */}
          {address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{address}</span>
            </div>
          )}

          {/* Remarks Field */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Add any notes or remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => attendanceMutation.mutate()}
              disabled={!location || attendanceMutation.isPending}
            >
              {attendanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

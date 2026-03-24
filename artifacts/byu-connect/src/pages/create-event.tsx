import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetCategories, useGetBuildings, useGetClubs, useCreateEvent } from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, Check, CalendarDays, MapPin, Tag, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STEPS = ["Basic Info", "Location & Time", "Capacity & Details"];
const INDEPENDENT_CLUB_NAME = "Independent Students";

export default function CreateEventPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [organizerType, setOrganizerType] = useState<"club" | "individual">("club");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    clubId: "",
    buildingId: "",
    roomNumber: "",
    startTime: "",
    endTime: "",
    capacity: "50",
    hasFood: false,
    tags: "",
  });

  const { data: categories } = useGetCategories();
  const { data: buildings } = useGetBuildings();
  const { data: myClubs } = useGetClubs({ myClubs: true }, { query: { enabled: !!user } });
  const { data: allClubs } = useGetClubs();
  const preselectedClubId = typeof window !== "undefined"
    ? Number(new URLSearchParams(window.location.search).get("clubId") ?? "")
    : NaN;
  const hasPreselectedClub = Number.isInteger(preselectedClubId) && preselectedClubId > 0;
  const independentClub = allClubs?.find((club) => club.name === INDEPENDENT_CLUB_NAME);
  
  const createEventMutation = useCreateEvent({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        toast({ title: "Event created!", description: "Your event has been successfully created." });
        navigate(`/events/${data.id}`);
      },
      onError: (err: any) => {
        setError(err?.data?.error ?? err?.message ?? "Failed to create event");
      }
    }
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!hasPreselectedClub) return;
    setForm((prev) => ({
      ...prev,
      clubId: String(preselectedClubId),
    }));
  }, [hasPreselectedClub, preselectedClubId]);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const validate = (s: number) => {
    if (s === 0) {
      if (!form.title.trim()) return "Please enter a title";
      if (!form.description.trim()) return "Please enter a description";
      if (!form.categoryId) return "Please select a category";
      if (organizerType === "club" && !form.clubId) return "Please select a club";
      if (organizerType === "individual" && !independentClub) {
        return "Independent club is missing. Reseed the database and try again.";
      }
    }
    if (s === 1) {
      if (!form.buildingId) return "Please select a building";
      if (!form.roomNumber.trim()) return "Please enter a room number";
      if (!form.startTime) return "Please enter a start time";
      if (!form.endTime) return "Please enter an end time";
      if (new Date(form.startTime) >= new Date(form.endTime)) return "End time must be after start time";
    }
    if (s === 2) {
      if (!form.capacity || parseInt(form.capacity) < 1) return "Please enter a valid capacity";
    }
    return null;
  };

  const handleNext = () => {
    const err = validate(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const err = validate(2);
    if (err) { setError(err); return; }
    setError(null);

    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const resolvedClubId =
      organizerType === "individual" ? independentClub?.id : parseInt(form.clubId);
    if (!resolvedClubId || Number.isNaN(resolvedClubId)) {
      setError("Please select a valid club option.");
      return;
    }
    createEventMutation.mutate({
      data: {
        title: form.title,
        description: form.description,
        categoryId: parseInt(form.categoryId),
        clubId: resolvedClubId,
        buildingId: parseInt(form.buildingId),
        roomNumber: form.roomNumber,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        capacity: parseInt(form.capacity),
        hasFood: form.hasFood,
        tags,
      }
    });
  };

  if (authLoading || !user) return null;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 pb-24 md:pb-12 overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Create Event</h1>
        <p className="text-muted-foreground mt-1 font-medium">Host a new event for your club on campus.</p>
      </div>

      <div className="flex items-center justify-between mb-4 relative px-1 sm:px-2">
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-border z-0 rounded-full" />
        <div 
          className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-primary z-0 rounded-full transition-all duration-300"
          style={{ width: `calc(${((step) / 2) * 100}% - 3rem)` }}
        />
        
        {STEPS.map((label, i) => (
          <div key={label} className="relative z-10 flex flex-col items-center gap-2">
            <div 
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-sm border-2",
                step >= i 
                  ? "bg-primary border-primary text-white" 
                  : "bg-card border-border text-muted-foreground"
              )}
            >
              {step > i ? <Check className="w-5 h-5" /> : i + 1}
            </div>
            <span className={cn("text-xs font-bold absolute -bottom-6 w-max text-center hidden sm:block", step >= i ? "text-primary" : "text-muted-foreground")}>{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8 mt-4">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive font-semibold text-sm rounded-xl border border-destructive/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <h2 className="text-xl font-extrabold mb-4 text-foreground">Basic Details</h2>
              {hasPreselectedClub && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary font-medium">
                  This event is being created for a selected club. You can still choose a different host club below.
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground">Event Title</label>
                <input
                  placeholder="e.g. Fall Kickoff Social"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground">Description</label>
                <textarea
                  placeholder="What will happen? What should attendees expect?"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground resize-none"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground">Organizer</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrganizerType("club")}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-sm font-bold text-left transition-colors",
                      organizerType === "club"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-foreground hover:bg-muted"
                    )}
                  >
                    Part of a club
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrganizerType("individual")}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-sm font-bold text-left transition-colors",
                      organizerType === "individual"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-foreground hover:bg-muted"
                    )}
                  >
                    On your own
                  </button>
                </div>
                {organizerType === "individual" && (
                  <p className="text-xs text-muted-foreground">
                    This posts under <span className="font-semibold">{INDEPENDENT_CLUB_NAME}</span>.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Category</label>
                  <select 
                    value={form.categoryId} 
                    onChange={(e) => handleChange("categoryId", e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  >
                    <option value="">Select a category</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {organizerType === "club" ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Host Club</label>
                    <select
                      value={form.clubId}
                      onChange={(e) => handleChange("clubId", e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                    >
                      <option value="">Select your club</option>
                      {myClubs?.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {(!myClubs || myClubs.length === 0) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        You must <button onClick={() => navigate("/clubs")} className="text-primary hover:underline font-bold">join a club</button> first.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Posting As</label>
                    <input
                      value={INDEPENDENT_CLUB_NAME}
                      readOnly
                      className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent text-muted-foreground font-medium"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Location & Time */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-extrabold text-foreground">Location</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Building</label>
                  <select 
                    value={form.buildingId} 
                    onChange={(e) => handleChange("buildingId", e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  >
                    <option value="">Select a building</option>
                    {buildings?.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.abbreviation})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Room Number</label>
                  <input
                    placeholder="e.g., B101, Main Auditorium"
                    value={form.roomNumber}
                    onChange={(e) => handleChange("roomNumber", e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-6 mb-4 pt-6 border-t border-border">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-extrabold text-foreground">Date & Time</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => handleChange("startTime", e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">End Time</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => handleChange("endTime", e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Capacity & Details */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <h2 className="text-xl font-extrabold mb-4 text-foreground">Capacity & Details</h2>
              
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Capacity Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="How many people can attend?"
                    value={form.capacity}
                    onChange={(e) => handleChange("capacity", e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    Tags
                  </label>
                  <input
                    placeholder="e.g., workshop, networking (comma-separated)"
                    value={form.tags}
                    onChange={(e) => handleChange("tags", e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                  />
                </div>
              </div>

              <div className="p-5 mt-4 rounded-xl border border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Food Provided</h4>
                    <p className="text-sm text-muted-foreground font-medium">Will food or drinks be served?</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange("hasFood", !form.hasFood)}
                  className={cn(
                    "w-14 h-8 rounded-full transition-colors relative shadow-inner shrink-0",
                    form.hasFood ? "bg-primary" : "bg-border"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform shadow-sm",
                    form.hasFood ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="p-5 bg-primary/5 rounded-xl border border-primary/20 space-y-2 mt-6">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Event Summary</h3>
                <div className="text-base font-bold text-foreground">{form.title || "Untitled Event"}</div>
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {buildings?.find((b) => b.id === parseInt(form.buildingId))?.name || "No location"} • {form.roomNumber || "No room"}
                </div>
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {form.startTime ? new Date(form.startTime).toLocaleDateString() : "No date"}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-border mt-8">
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="px-4 sm:px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}
            
            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 sm:px-8 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createEventMutation.isPending}
                className="px-6 sm:px-8 py-3 rounded-xl font-bold bg-[#22c55e] text-white hover:bg-[#16a34a] transition-colors shadow-md hover:shadow-lg disabled:opacity-70 flex items-center gap-2"
              >
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
                {!createEventMutation.isPending && <Check className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

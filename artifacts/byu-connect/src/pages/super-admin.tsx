import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useGetBuildings, useGetCategories, useGetClubs } from "@workspace/api-client-react";
import { ShieldCheck, Trash2, UserPlus, CalendarPlus } from "lucide-react";

type AdminUser = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

type ClubAdminRow = {
  id: number;
  name: string;
  admins: AdminUser[];
};

export default function SuperAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [clubs, setClubs] = useState<ClubAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmails, setNewAdminEmails] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [eventBusy, setEventBusy] = useState(false);
  const [eventTargetId, setEventTargetId] = useState("");
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    clubId: "",
    categoryId: "",
    buildingId: "",
    roomNumber: "",
    startTime: "",
    endTime: "",
    capacity: "50",
    hasFood: false,
    tags: "",
    coverImageUrl: "",
  });

  const { data: buildings } = useGetBuildings();
  const { data: categories } = useGetCategories();
  const { data: allClubs } = useGetClubs(undefined, { query: { enabled: isSuperAdmin } });

  const superAdminEmailSet = useMemo(
    () => new Set(["byu_admin@byu.edu", "gunnjake@byu.edu"]),
    []
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?return=${encodeURIComponent("/super-admin")}`);
      return;
    }
    if (user && !superAdminEmailSet.has(user.email.toLowerCase())) {
      navigate("/");
      return;
    }
  }, [authLoading, navigate, superAdminEmailSet, user]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [canManageRes, adminsRes] = await Promise.all([
        fetch("/api/super-admin-can-manage", { credentials: "include" }),
        fetch("/api/super-admin-clubs-admins", { credentials: "include" }),
      ]);

      const canManageData = await canManageRes.json().catch(() => ({ isSuperAdmin: false }));
      setIsSuperAdmin(Boolean(canManageData?.isSuperAdmin));

      const adminsData = await adminsRes.json().catch(() => ({ clubs: [] }));
      if (!adminsRes.ok) {
        throw new Error(adminsData?.error || "Failed to load club admins.");
      }
      setClubs(Array.isArray(adminsData?.clubs) ? adminsData.clubs : []);
    } catch (err: any) {
      setError(err?.message || "Unable to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const assignAdmin = async (clubId: number) => {
    const email = (newAdminEmails[clubId] ?? "").trim().toLowerCase();
    if (!email) return;
    setError(null);
    try {
      const res = await fetch("/api/super-admin-assign-club-admin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to assign admin.");
      setNewAdminEmails((prev) => ({ ...prev, [clubId]: "" }));
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Unable to assign admin.");
    }
  };

  const createEventDirect = async () => {
    setError(null);
    const clubId = parseInt(eventForm.clubId, 10);
    const categoryId = parseInt(eventForm.categoryId, 10);
    const buildingId = parseInt(eventForm.buildingId, 10);
    const capacity = parseInt(eventForm.capacity, 10);
    const title = eventForm.title.trim();
    const description = eventForm.description.trim();
    const roomNumber = eventForm.roomNumber.trim();
    if (!title || !description) {
      setError("Title and description are required.");
      return;
    }
    if (!Number.isInteger(clubId) || !Number.isInteger(categoryId) || !Number.isInteger(buildingId)) {
      setError("Select a club, category, and building.");
      return;
    }
    if (!roomNumber) {
      setError("Room number is required.");
      return;
    }
    if (!eventForm.startTime || !eventForm.endTime) {
      setError("Start and end time are required.");
      return;
    }
    const start = new Date(eventForm.startTime);
    const end = new Date(eventForm.endTime);
    if (start >= end) {
      setError("End time must be after start time.");
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError("Capacity must be a positive integer.");
      return;
    }

    const tags = eventForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
    setEventBusy(true);
    try {
      const res = await fetch("/api/super-admin-create-event", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          buildingId,
          roomNumber,
          categoryId,
          clubId,
          capacity,
          hasFood: eventForm.hasFood,
          tags,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to create event.");
      const id = body?.id;
      if (typeof id === "number") {
        navigate(`/events/${id}`);
      }
    } catch (err: any) {
      setError(err?.message || "Unable to create event.");
    } finally {
      setEventBusy(false);
    }
  };

  const loadEventForEdit = async () => {
    setError(null);
    const id = parseInt(eventTargetId.trim(), 10);
    if (!Number.isInteger(id) || id < 1) {
      setError("Enter a valid event ID to load.");
      return;
    }
    setEventBusy(true);
    try {
      const res = await fetch(`/api/events/${id}`, { credentials: "include" });
      const ev = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(ev?.error || "Failed to load event.");
      const toLocal = (iso: string) => {
        try {
          return new Date(iso).toISOString().slice(0, 16);
        } catch {
          return "";
        }
      };
      setEventForm({
        title: String(ev.title ?? ""),
        description: String(ev.description ?? ""),
        clubId: String(ev.clubId ?? ""),
        categoryId: String(ev.categoryId ?? ""),
        buildingId: String(ev.buildingId ?? ""),
        roomNumber: String(ev.roomNumber ?? ""),
        startTime: ev.startTime ? toLocal(ev.startTime) : "",
        endTime: ev.endTime ? toLocal(ev.endTime) : "",
        capacity: String(ev.capacity ?? "50"),
        hasFood: Boolean(ev.hasFood),
        tags: Array.isArray(ev.tags) ? ev.tags.join(", ") : "",
        coverImageUrl: ev.coverImageUrl != null ? String(ev.coverImageUrl) : "",
      });
      setEventTargetId(String(id));
    } catch (err: any) {
      setError(err?.message || "Unable to load event.");
    } finally {
      setEventBusy(false);
    }
  };

  const updateEventDirect = async () => {
    setError(null);
    const id = parseInt(eventTargetId.trim(), 10);
    if (!Number.isInteger(id) || id < 1) {
      setError("Load an event first or enter its ID.");
      return;
    }
    const clubId = parseInt(eventForm.clubId, 10);
    const categoryId = parseInt(eventForm.categoryId, 10);
    const buildingId = parseInt(eventForm.buildingId, 10);
    const capacity = parseInt(eventForm.capacity, 10);
    const title = eventForm.title.trim();
    const description = eventForm.description.trim();
    const roomNumber = eventForm.roomNumber.trim();
    if (!title || !description) {
      setError("Title and description are required.");
      return;
    }
    if (!Number.isInteger(clubId) || !Number.isInteger(categoryId) || !Number.isInteger(buildingId)) {
      setError("Select a club, category, and building.");
      return;
    }
    if (!roomNumber) {
      setError("Room number is required.");
      return;
    }
    if (!eventForm.startTime || !eventForm.endTime) {
      setError("Start and end time are required.");
      return;
    }
    const start = new Date(eventForm.startTime);
    const end = new Date(eventForm.endTime);
    if (start >= end) {
      setError("End time must be after start time.");
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError("Capacity must be a positive integer.");
      return;
    }

    const tags = eventForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const coverTrim = eventForm.coverImageUrl.trim();
    setEventBusy(true);
    try {
      const res = await fetch("/api/super-admin-update-event", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title,
          description,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          buildingId,
          roomNumber,
          categoryId,
          clubId,
          capacity,
          hasFood: eventForm.hasFood,
          tags,
          coverImageUrl: coverTrim.length ? coverTrim : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to update event.");
      navigate(`/events/${id}`);
    } catch (err: any) {
      setError(err?.message || "Unable to update event.");
    } finally {
      setEventBusy(false);
    }
  };

  const removeAdmin = async (clubId: number, userId: number) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/super-admin-remove-club-admin?clubId=${encodeURIComponent(String(clubId))}&userId=${encodeURIComponent(String(userId))}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to remove admin.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Unable to remove admin.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Access restricted</h2>
        <p className="text-muted-foreground">Super admin access is required.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 pb-24 md:pb-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-primary" />
          Club Admin Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Assign or remove club admins for each BYUconnect club.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <CalendarPlus className="w-5 h-5 text-primary" />
          Create / edit event (direct SQL)
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Super-admin only. Uses parameterized <code className="text-xs">INSERT</code> and <code className="text-xs">UPDATE</code>{" "}
          statements against the database (not the standard create/patch handlers).
        </p>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="number"
            min={1}
            value={eventTargetId}
            onChange={(e) => setEventTargetId(e.target.value)}
            placeholder="Event ID (for load / update)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm sm:w-40"
          />
          <button
            type="button"
            onClick={loadEventForEdit}
            disabled={eventBusy}
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-bold hover:bg-muted/80 disabled:opacity-70"
          >
            Load
          </button>
          <button
            type="button"
            onClick={() => {
              setEventTargetId("");
              setEventForm({
                title: "",
                description: "",
                clubId: "",
                categoryId: "",
                buildingId: "",
                roomNumber: "",
                startTime: "",
                endTime: "",
                capacity: "50",
                hasFood: false,
                tags: "",
                coverImageUrl: "",
              });
            }}
            disabled={eventBusy}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-70"
          >
            Clear form
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={eventForm.title}
            onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title"
            className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-2"
          />
          <textarea
            value={eventForm.description}
            onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description"
            className="rounded-lg border bg-background px-3 py-2 text-sm min-h-24 md:col-span-2"
          />
          <select
            value={eventForm.clubId}
            onChange={(e) => setEventForm((f) => ({ ...f, clubId: e.target.value }))}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Host club</option>
            {allClubs?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={eventForm.categoryId}
            onChange={(e) => setEventForm((f) => ({ ...f, categoryId: e.target.value }))}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={eventForm.buildingId}
            onChange={(e) => setEventForm((f) => ({ ...f, buildingId: e.target.value }))}
            className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-2"
          >
            <option value="">Building</option>
            {buildings?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.abbreviation})
              </option>
            ))}
          </select>
          <input
            value={eventForm.roomNumber}
            onChange={(e) => setEventForm((f) => ({ ...f, roomNumber: e.target.value }))}
            placeholder="Room"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={eventForm.capacity}
            onChange={(e) => setEventForm((f) => ({ ...f, capacity: e.target.value }))}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={eventForm.startTime}
            onChange={(e) => setEventForm((f) => ({ ...f, startTime: e.target.value }))}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={eventForm.endTime}
            onChange={(e) => setEventForm((f) => ({ ...f, endTime: e.target.value }))}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <input
            value={eventForm.coverImageUrl}
            onChange={(e) => setEventForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
            placeholder="Cover image URL (optional)"
            className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={eventForm.tags}
            onChange={(e) => setEventForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="Tags (comma-separated)"
            className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
            <input
              type="checkbox"
              checked={eventForm.hasFood}
              onChange={(e) => setEventForm((f) => ({ ...f, hasFood: e.target.checked }))}
            />
            Food provided
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createEventDirect}
              disabled={eventBusy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-70"
            >
              {eventBusy ? "Working…" : "Create event"}
            </button>
            <button
              type="button"
              onClick={updateEventDirect}
              disabled={eventBusy}
              className="rounded-lg border-2 border-primary bg-background px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-70"
            >
              Update event (SQL)
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {clubs.map((club) => (
          <div key={club.id} className="rounded-2xl border bg-card p-4 md:p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">{club.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Club ID: {club.id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={newAdminEmails[club.id] ?? ""}
                  onChange={(e) =>
                    setNewAdminEmails((prev) => ({ ...prev, [club.id]: e.target.value }))
                  }
                  placeholder="user_email@byu.edu"
                  className="w-64 max-w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() => assignAdmin(club.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Admin
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {club.admins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No admins assigned.</p>
              ) : (
                club.admins.map((admin) => (
                  <div
                    key={`${club.id}-${admin.userId}`}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {admin.firstName} {admin.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {admin.email} • {admin.role}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAdmin(club.id, admin.userId)}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

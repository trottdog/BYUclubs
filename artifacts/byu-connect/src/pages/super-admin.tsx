import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";

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

  const superAdminEmailSet = useMemo(
    () => new Set(["byu_admin@byu.edu", "gunnjake@byu.edu"]),
    []
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
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
        fetch("/api/admin/can-manage", { credentials: "include" }),
        fetch("/api/admin/clubs/admins", { credentials: "include" }),
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
      const res = await fetch(`/api/admin/clubs/${clubId}/admins`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to assign admin.");
      setNewAdminEmails((prev) => ({ ...prev, [clubId]: "" }));
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Unable to assign admin.");
    }
  };

  const removeAdmin = async (clubId: number, userId: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/admins/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
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

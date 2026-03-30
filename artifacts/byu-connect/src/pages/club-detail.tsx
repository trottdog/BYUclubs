import { Link, useLocation, useParams } from "wouter";
import { useGetClub, useJoinClub } from "@workspace/api-client-react";
import { ArrowLeft, Mail, PlusCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { EventCard } from "@/components/event-card";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CLUB_AVATAR_URL } from "@/lib/avatars";

export default function ClubDetailPage({
  routeParams,
}: {
  routeParams?: { id?: string };
}) {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const clubIdFromRouteProps = Number(routeParams?.id);
  const clubIdFromParams = Number(id);
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : location;
  const clubIdFromPathMatch = pathname.match(/\/clubs\/(\d+)(?:\/)?$/);
  const clubId = !Number.isNaN(clubIdFromRouteProps)
    ? clubIdFromRouteProps
    : !Number.isNaN(clubIdFromParams)
      ? clubIdFromParams
      : Number(clubIdFromPathMatch?.[1]);
  const [canManage, setCanManage] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    contactEmail: "",
    coverImageUrl: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: club, isLoading, error } = useGetClub(clubId, {
    query: { enabled: !isNaN(clubId), queryKey: ["/api/clubs", clubId] },
  });

  const joinMutation = useJoinClub({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId] });
        queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      },
    },
  });

  useEffect(() => {
    if (club) {
      setEditForm({
        name: club.name ?? "",
        description: club.description ?? "",
        contactEmail: club.contactEmail ?? "",
        coverImageUrl: club.coverImageUrl ?? "",
      });
    }
  }, [club]);

  useEffect(() => {
    if (isNaN(clubId)) return;
    let isMounted = true;

    fetch(`/api/club-can-manage?id=${encodeURIComponent(String(clubId))}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return { canManage: false };
        return res.json();
      })
      .then((data) => {
        if (isMounted) setCanManage(Boolean(data?.canManage));
      })
      .catch(() => {
        if (isMounted) setCanManage(false);
      });

    return () => {
      isMounted = false;
    };
  }, [clubId]);

  const saveClubChanges = async () => {
    if (!club) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/clubs/${club.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          contactEmail: editForm.contactEmail,
          coverImageUrl: editForm.coverImageUrl || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to update club.");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      setIsEditMode(false);
      toast({ title: "Club updated", description: "Your changes were saved." });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message || "Unable to save club changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Club not found</h2>
        <button onClick={() => setLocation("/clubs")} className="text-primary hover:underline font-medium">
          Back to clubs
        </button>
      </div>
    );
  }

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    setLocation("/clubs");
  };
  return (
    <div className="w-full max-w-4xl mx-auto pb-24 md:pb-12 overflow-x-hidden">
      <div className="bg-card rounded-[2rem] border shadow-sm overflow-hidden relative">
        <div className="h-28 sm:h-36 md:h-56 w-full relative bg-muted">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: club.avatarColor, opacity: club.coverImageUrl ? 0 : 0.4 }}
          />
          {club.coverImageUrl && (
            <img
              src={club.coverImageUrl}
              alt={`${club.name} cover`}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-black/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              {club.categoryName}
            </span>
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col gap-6 -mt-10 sm:-mt-14 md:-mt-[4.5rem]">
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="h-24 w-24 sm:h-28 sm:w-28 md:h-36 md:w-36 shrink-0 overflow-hidden rounded-full border-4 border-card bg-white p-2 shadow-md sm:p-2.5 md:p-3">
                  <img src={DEFAULT_CLUB_AVATAR_URL} alt="" className="h-full w-full object-contain" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <Users className="w-4 h-4" />
                    <span>{club.memberCount} members</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight break-words">
                    {club.name}
                  </h1>
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                  {!canManage && (
                    <button
                      onClick={() => joinMutation.mutate({ id: club.id })}
                      disabled={joinMutation.isPending}
                      className={cn(
                        "px-5 py-3 rounded-xl font-bold transition-all shadow-sm w-full sm:w-auto",
                        club.isMember
                          ? "bg-muted text-foreground hover:bg-destructive hover:text-white"
                          : "bg-primary text-white hover:bg-primary/90 shadow-md"
                      )}
                    >
                      {joinMutation.isPending ? "Loading..." : club.isMember ? "Leave Club" : "Join Club"}
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => setIsEditMode((v) => !v)}
                      className="px-5 py-3 rounded-xl font-bold transition-all shadow-sm w-full sm:w-auto bg-secondary/20 text-secondary hover:bg-secondary hover:text-white"
                    >
                      {isEditMode ? "Cancel Edit" : "Edit Club"}
                    </button>
                  )}
                  {canManage && (
                    <Link href={`/events/new?clubId=${club.id}`}>
                      <span className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-primary/15 bg-primary/10 px-5 py-3 text-sm font-bold text-primary hover:bg-primary/15 cursor-pointer">
                        <PlusCircle className="w-4 h-4" />
                        Create Event
                      </span>
                    </Link>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 border-y border-border/80 py-4">
                  {club.contactEmail ? (
                    <a
                      href={`mailto:${club.contactEmail}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/45 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30 hover:text-primary"
                    >
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {club.contactEmail}
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      Contact info coming soon
                    </div>
                  )}
                </div>
              </div>
            </div>

            {canManage && isEditMode && (
              <div className="rounded-2xl border bg-muted/30 p-4 sm:p-5 space-y-3">
                <p className="text-sm font-bold text-foreground">Admin edit mode</p>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
                  placeholder="Club name"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border bg-card px-3 py-2 text-sm min-h-28"
                  placeholder="Club description"
                />
                <input
                  value={editForm.contactEmail}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
                  placeholder="Contact email"
                />
                <input
                  value={editForm.coverImageUrl}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                  className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
                  placeholder="Cover image URL (optional)"
                />
                <button
                  onClick={saveClubChanges}
                  disabled={isSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}

            <section className="space-y-3">
              <div className="rounded-2xl bg-muted/30 px-4 py-5 sm:px-5">
                <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                  {club.description || "This club has not added an about section yet."}
                </p>
              </div>
            </section>

            {!!club.announcements?.length && (
              <section className="space-y-4">
                <div className="space-y-3">
                  {club.announcements.map((ann) => (
                    <div key={ann.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <h3 className="font-bold text-foreground text-base sm:text-lg leading-tight">{ann.title}</h3>
                        <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0">
                          {format(new Date(ann.createdAt), "MMM d")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{ann.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              {!club.upcomingEvents?.length ? (
                <div className="bg-muted/50 border border-dashed rounded-2xl p-6 text-center">
                  <p className="text-muted-foreground text-sm font-medium">No upcoming events scheduled.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {club.upcomingEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} compact />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

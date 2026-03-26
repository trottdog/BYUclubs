import { Link, useParams, useLocation } from "wouter";
import { useGetClub, useJoinClub } from "@workspace/api-client-react";
import { ArrowLeft, Users, Mail, Bell, Calendar as CalendarIcon, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { EventCard } from "@/components/event-card";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
    query: { enabled: !isNaN(clubId), queryKey: ["/api/clubs", clubId] }
  });

  const joinMutation = useJoinClub({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId] });
        queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      }
    }
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
        <button onClick={() => setLocation("/clubs")} className="text-primary hover:underline font-medium">Back to clubs</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-0 pb-24 md:pb-12 overflow-x-hidden">
      {/* Header with cover image and back button */}
      <div className="relative">
        <div className="h-40 md:h-56 w-full relative bg-muted">
          <div className="absolute inset-0" style={{ backgroundColor: club.avatarColor, opacity: club.coverImageUrl ? 0 : 0.4 }} />
          {club.coverImageUrl && (
            <img 
              src={club.coverImageUrl}
              alt={`${club.name} cover`}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Back button integrated into header */}
          <button 
            onClick={() => history.back()} 
            className="absolute top-4 left-4 flex items-center gap-2 text-white hover:text-white/80 font-semibold transition-colors bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full z-10"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Club info section - compact and Instagram-like */}
      <div className="bg-card border-b px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Avatar and basic info */}
          <div className="flex items-end gap-4 mb-4">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-extrabold text-white border-4 border-card shadow-md shrink-0 -mt-12"
              style={{ backgroundColor: club.avatarColor }}
            >
              {club.avatarInitials}
            </div>
            
            <div className="flex-1 pb-1">
              <h1 className="text-2xl font-extrabold text-foreground mb-1">{club.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-semibold">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {club.memberCount}
                </span>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border" 
                  style={{ color: club.categoryColor, backgroundColor: `${club.categoryColor}15`, borderColor: `${club.categoryColor}30` }}
                >
                  {club.categoryName}
                </span>
              </div>
            </div>

            {/* Action button */}
            {!canManage && (
              <button
                onClick={() => joinMutation.mutate({ id: club.id })}
                disabled={joinMutation.isPending}
                className={cn(
                  "px-6 py-2 rounded-full font-bold text-sm transition-all shadow-sm shrink-0",
                  club.isMember
                    ? "bg-muted text-foreground hover:bg-destructive hover:text-white"
                    : "bg-primary text-white hover:bg-primary/90"
                )}
              >
                {joinMutation.isPending ? "..." : club.isMember ? "Following" : "Follow"}
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setIsEditMode((v) => !v)}
                className="px-6 py-2 rounded-full font-bold text-sm transition-all shadow-sm shrink-0 bg-secondary/20 text-secondary hover:bg-secondary hover:text-white"
              >
                {isEditMode ? "Cancel" : "Edit"}
              </button>
            )}
          </div>

          {/* Create event button for managers */}
          {canManage && (
            <div>
              <Link href={`/events/new?clubId=${club.id}`}>
                <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary/90 cursor-pointer">
                  <PlusCircle className="w-4 h-4" />
                  Create Event
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* About section */}
      <div className="bg-card border-b px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {canManage && isEditMode && (
            <div className="mb-6 rounded-xl border bg-muted/30 p-4 space-y-3">
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
          
          {club.description && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">About</h2>
              <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">{club.description}</p>
            </div>
          )}

          {club.contactEmail && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <a href={`mailto:${club.contactEmail}`} className="hover:text-primary transition-colors">{club.contactEmail}</a>
            </div>
          )}
        </div>
      </div>

      {/* Activity section - combined announcements and events, sorted by most recent */}
      <div className="bg-card px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Activity</h2>
          
          {/* Combined activity feed sorted by date */}
          <div className="space-y-4">
            {/* Create combined activity array */}
            {(() => {
              const activities: Array<{ type: 'announcement' | 'event_upcoming' | 'event_past'; data: any; date: Date }> = [];
              
              club.announcements?.forEach(ann => {
                activities.push({ type: 'announcement', data: ann, date: new Date(ann.createdAt) });
              });
              
              club.upcomingEvents?.forEach(ev => {
                activities.push({ type: 'event_upcoming', data: ev, date: new Date(ev.startDate) });
              });
              
              activities.sort((a, b) => b.date.getTime() - a.date.getTime());
              
              if (activities.length === 0) {
                return (
                  <div className="bg-muted/50 border border-dashed rounded-xl p-8 text-center">
                    <p className="text-muted-foreground text-sm font-medium">No recent activity.</p>
                  </div>
                );
              }
              
              return activities.map((activity, idx) => {
                if (activity.type === 'announcement') {
                  const ann = activity.data;
                  return (
                    <div key={`ann-${ann.id}`} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <h4 className="font-bold text-foreground">{ann.title}</h4>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                          {format(new Date(ann.createdAt), "MMM d")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ml-6">{ann.body}</p>
                    </div>
                  );
                } else if (activity.type === 'event_upcoming') {
                  const ev = activity.data;
                  return (
                    <div key={`evt-${ev.id}`} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <EventCard event={ev} compact />
                    </div>
                  );
                }
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetEvents, useGetUserProfile } from "@workspace/api-client-react";
import { EventCard } from "@/components/event-card";
import { Bookmark, CalendarCheck, History, LogOut, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_USER_AVATAR_URL } from "@/lib/avatars";

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [activeBio, setActiveBio] = useState<string | null>(null);
  const [isSavingBio, setIsSavingBio] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation(`/auth?return=${encodeURIComponent("/profile")}`, { replace: true });
    }
  }, [user, authLoading, setLocation]);

  const { data: profile, isLoading: profileLoading, refetch } = useGetUserProfile({
    query: {
      enabled: !!user,
      staleTime: 0,
      refetchOnMount: "always",
    },
    request: {
      cache: "no-store",
    },
  });

  const { data: allEvents, isLoading: eventsLoading, refetch: refetchEvents } = useGetEvents(undefined, {
    query: {
      enabled: !!user,
      staleTime: 0,
      refetchOnMount: "always",
    },
    request: {
      cache: "no-store",
    },
  });

  useEffect(() => {
    if (user) {
      void refetch();
      void refetchEvents();
    }
  }, [user, refetch, refetchEvents]);

  const getBioStorageKey = (userId: number) => `byuconnect:profile-bio:${userId}`;

  useEffect(() => {
    if (!user) {
      setActiveBio(null);
      setBioDraft("");
      return;
    }

    const fallbackBio = profile?.user?.bio ?? user.bio ?? "";
    if (typeof window === "undefined") {
      setActiveBio(fallbackBio || null);
      setBioDraft(fallbackBio);
      return;
    }

    const storedBio = window.localStorage.getItem(getBioStorageKey(user.id));
    const nextBio = storedBio ?? fallbackBio;
    setActiveBio(nextBio || null);
    setBioDraft(nextBio);
  }, [user, profile?.user?.bio]);

  if (authLoading || !user) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      const trimmedBio = bioDraft.trim();

      if (typeof window !== "undefined") {
        const storageKey = getBioStorageKey(user.id);
        if (trimmedBio.length > 0) {
          window.localStorage.setItem(storageKey, trimmedBio);
        } else {
          window.localStorage.removeItem(storageKey);
        }
      }

      setActiveBio(trimmedBio || null);
      setIsEditingBio(false);
      toast({ title: "Bio saved", description: "Your bio was saved on this device." });
    } catch (err: any) {
      toast({
        title: "Could not save bio",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingBio(false);
    }
  };

  const savedEvents = (allEvents ?? []).filter((event) => event.isSaved);
  const reservationEvents = (allEvents ?? []).filter((event) => event.isReserved);
  const pastEvents = reservationEvents
    .filter((event) => new Date(event.endTime).getTime() < Date.now())
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
    .slice(0, 8);
  const createdClubs = profile?.createdClubs ?? [];
  const savedCount = savedEvents.length;
  const reservationsCount = reservationEvents.length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 overflow-x-hidden pb-24 md:pb-12">
      <div className="connect-card relative flex flex-col items-center gap-6 overflow-hidden border-2 border-border p-6 md:flex-row md:items-start md:p-10">
        <div className="flex h-24 w-24 shrink-0 overflow-hidden border-2 border-primary bg-muted md:h-32 md:w-32">
          <img
            src={DEFAULT_USER_AVATAR_URL}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex-1 pt-2 text-center md:text-left">
          <p className="connect-eyebrow mb-1">Profile</p>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {user.firstName} {user.lastName}
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{user.email}</p>

          <p className="mt-3 text-sm whitespace-pre-wrap break-words text-foreground/90">
            <span className="font-semibold">Bio:</span> {activeBio || "Add a short bio to tell others about yourself."}
          </p>

          <button
            type="button"
            onClick={() => setIsEditingBio(true)}
            className="mt-2 text-sm font-semibold text-primary hover:underline"
          >
            Edit Bio
          </button>

          <div className="mx-auto mb-2 mt-3 max-w-xl md:mx-0">
            {isEditingBio ? (
              <div className="space-y-3">
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value.slice(0, 160))}
                  placeholder="Write a short bio..."
                  rows={3}
                  maxLength={160}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{bioDraft.length}/160</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBioDraft(activeBio ?? "");
                        setIsEditingBio(false);
                      }}
                      className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                      disabled={isSavingBio}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBio}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                      disabled={isSavingBio}
                    >
                      {isSavingBio ? "Saving..." : "Save bio"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {profileLoading || eventsLoading ? (
            <div className="mt-6 flex items-center justify-center gap-4 md:justify-start">
              <div className="h-20 w-32 animate-pulse bg-muted" />
              <div className="h-20 w-32 animate-pulse bg-muted" />
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap justify-center gap-4 md:justify-start">
              <div className="connect-panel flex min-w-[140px] flex-col items-center border-2 bg-white md:items-start">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Saved</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{savedCount}</p>
              </div>

              <div className="connect-panel flex min-w-[140px] flex-col items-center border-2 bg-white md:items-start">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <CalendarCheck className="h-4 w-4 text-[#22c55e]" />
                  <span className="text-sm font-medium text-foreground">Reservations</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{reservationsCount}</p>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-transparent px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:border-destructive/30 hover:bg-destructive/5 md:absolute md:right-6 md:top-6 md:mt-0 md:w-auto"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>

      {profileLoading || eventsLoading ? (
        <div className="flex h-64 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        (
          <div className="space-y-12">
            <section>
              <div className="mb-6 flex items-end gap-3 border-b-4 border-primary pb-4">
                <History className="h-6 w-6 shrink-0 text-[#0ea5e9]" />
                <div>
                  <p className="connect-section-label">History</p>
                  <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    Participated events
                  </h2>
                </div>
              </div>

              {!pastEvents.length ? (
                <div className="border-2 border-dashed border-border bg-muted/20 p-10 text-center">
                  <History className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                  <p className="font-semibold text-muted-foreground">No participated events yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Events you attended will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {pastEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} compact />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-6 flex items-end gap-3 border-b-4 border-primary pb-4">
                <Users className="h-6 w-6 shrink-0 text-[#f97316]" />
                <div>
                  <p className="connect-section-label">Leadership</p>
                  <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    Clubs I created
                  </h2>
                </div>
              </div>

              {!createdClubs.length ? (
                <div className="border-2 border-dashed border-border bg-muted/20 p-10 text-center">
                  <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                  <p className="font-semibold text-muted-foreground">No created clubs found.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Clubs where you are an owner or admin will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {createdClubs.map((club) => (
                    <Link
                      key={club.id}
                      href={`/clubs/${club.id}`}
                      aria-label={`${club.name}. ${club.description?.slice(0, 120) ?? "Open club page"}`}
                      className="block rounded-xl border bg-card p-4 transition-all hover:border-primary/60 hover:shadow-sm"
                    >
                      <p className="text-lg font-bold leading-tight text-foreground">{club.name}</p>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{club.description}</p>
                      <p className="mt-3 text-xs font-semibold text-primary">View club details</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-6 flex items-end gap-3 border-b-4 border-primary pb-4">
                <CalendarCheck className="h-6 w-6 shrink-0 text-[#22c55e]" />
                <div>
                  <p className="connect-section-label">Schedule</p>
                  <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    My reservations
                  </h2>
                </div>
              </div>

              {!reservationEvents.length ? (
                <div className="border-2 border-dashed border-border bg-muted/20 p-10 text-center">
                  <CalendarCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                  <p className="font-semibold text-muted-foreground">No reservations yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Spots you reserve will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {reservationEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} compact />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-6 flex items-end gap-3 border-b-4 border-primary pb-4">
                <Bookmark className="h-6 w-6 shrink-0 text-primary" />
                <div>
                  <p className="connect-section-label">Bookmarks</p>
                  <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    Saved events
                  </h2>
                </div>
              </div>

              {savedEvents.length === 0 ? (
                <div className="border-2 border-dashed border-border bg-muted/20 p-10 text-center">
                  <Bookmark className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                  <p className="font-semibold text-muted-foreground">No saved events.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Events you bookmark will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {savedEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} compact />
                  ))}
                </div>
              )}
            </section>
          </div>
        )
      )}
    </div>
  );
}

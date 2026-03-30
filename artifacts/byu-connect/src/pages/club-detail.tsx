import { Link, useLocation, useParams } from "wouter";
import { useGetClub, useJoinClub } from "@workspace/api-client-react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Mail,
  PlusCircle,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { EventCard } from "@/components/event-card";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CLUB_AVATAR_URL } from "@/lib/avatars";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ClubPhoto = {
  id: number;
  clubId: number;
  imageUrl: string;
  caption?: string | null;
  addedByUserId?: number | null;
  createdAt: string;
};

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
  const [activeTab, setActiveTab] = useState("about");
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    contactEmail: "",
    coverImageUrl: "",
  });
  const [photoForm, setPhotoForm] = useState({
    imageUrl: "",
    caption: "",
  });
  const [selectedPhotoName, setSelectedPhotoName] = useState("");
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

  const photos = useMemo<ClubPhoto[]>(
    () => (Array.isArray((club as any)?.photos) ? ((club as any).photos as ClubPhoto[]) : []),
    [club],
  );

  const selectedPhoto =
    selectedPhotoIndex != null && selectedPhotoIndex >= 0 && selectedPhotoIndex < photos.length
      ? photos[selectedPhotoIndex]
      : null;

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

  const addPhoto = async () => {
    if (!club) return;
    setIsAddingPhoto(true);
    try {
      const res = await fetch(`/api/clubs/${club.id}/photos`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: photoForm.imageUrl.trim(),
          caption: photoForm.caption.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to add photo.");
      }

      setPhotoForm({ imageUrl: "", caption: "" });
      setSelectedPhotoName("");
      await queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId] });
      toast({ title: "Photo added", description: "The club gallery has been updated." });
    } catch (err: any) {
      toast({
        title: "Unable to add photo",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingPhoto(false);
    }
  };

  const handlePhotoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoForm((prev) => ({ ...prev, imageUrl: "" }));
      setSelectedPhotoName("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      event.target.value = "";
      setPhotoForm((prev) => ({ ...prev, imageUrl: "" }));
      setSelectedPhotoName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setPhotoForm((prev) => ({ ...prev, imageUrl: result }));
      setSelectedPhotoName(file.name);
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Could not read that file. Please try another image.",
        variant: "destructive",
      });
      setPhotoForm((prev) => ({ ...prev, imageUrl: "" }));
      setSelectedPhotoName("");
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = async (photoId: number) => {
    if (!club) return;
    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(`/api/clubs/${club.id}/photos/${photoId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to remove photo.");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId] });
      setSelectedPhotoIndex((current) => {
        if (current == null) return current;
        const currentPhoto = photos[current];
        if (!currentPhoto) return null;
        if (currentPhoto.id === photoId) return null;
        return current;
      });
      toast({ title: "Photo removed", description: "The photo has been deleted from the gallery." });
    } catch (err: any) {
      toast({
        title: "Unable to remove photo",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const openPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const showPrevPhoto = () => {
    setSelectedPhotoIndex((current) => {
      if (current == null || photos.length === 0) return current;
      return (current - 1 + photos.length) % photos.length;
    });
  };

  const showNextPhoto = () => {
    setSelectedPhotoIndex((current) => {
      if (current == null || photos.length === 0) return current;
      return (current + 1) % photos.length;
    });
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
    <>
      <div className="w-full max-w-5xl mx-auto pb-24 md:pb-12 overflow-x-hidden">
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

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                <TabsList className="h-auto w-full justify-start rounded-2xl bg-muted/50 p-1.5 overflow-x-auto">
                  <TabsTrigger value="about" className="rounded-xl px-4 py-2.5 font-semibold">
                    About
                  </TabsTrigger>
                  <TabsTrigger value="photos" className="rounded-xl px-4 py-2.5 font-semibold">
                    Club Photos
                  </TabsTrigger>
                  <TabsTrigger value="announcements" className="rounded-xl px-4 py-2.5 font-semibold">
                    Announcements
                  </TabsTrigger>
                  <TabsTrigger value="events" className="rounded-xl px-4 py-2.5 font-semibold">
                    Upcoming Events
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="mt-0">
                  <section className="space-y-3">
                    <div className="rounded-2xl bg-muted/30 px-4 py-5 sm:px-5">
                      <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                        {club.description || "This club has not added an about section yet."}
                      </p>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="photos" className="mt-0 space-y-5">
                  {canManage && (
                    <div className="rounded-2xl border bg-muted/30 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <ImagePlus className="w-4 h-4 text-primary" />
                        <p className="text-sm font-bold text-foreground">Add to club gallery</p>
                      </div>
                      <label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-dashed bg-card px-4 py-4 text-sm transition hover:border-primary/40">
                        <span className="font-medium text-foreground">Choose photo from your computer</span>
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG, WEBP, or GIF. Smaller images upload faster.
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileChange}
                          className="sr-only"
                        />
                        <span className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs font-semibold text-foreground">
                          <ImagePlus className="h-4 w-4 text-primary" />
                          {selectedPhotoName || "Select image"}
                        </span>
                      </label>
                      <textarea
                        value={photoForm.caption}
                        onChange={(e) => setPhotoForm((prev) => ({ ...prev, caption: e.target.value }))}
                        className="w-full rounded-lg border bg-card px-3 py-2 text-sm min-h-24"
                        placeholder="Caption (optional)"
                      />
                      <button
                        onClick={addPhoto}
                        disabled={isAddingPhoto || !photoForm.imageUrl}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-70"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {isAddingPhoto ? "Adding..." : "Add photo"}
                      </button>
                    </div>
                  )}

                  {photos.length === 0 ? (
                    <div className="bg-muted/50 border border-dashed rounded-2xl p-10 text-center">
                      <p className="text-muted-foreground text-sm font-medium">
                        No club photos yet. {canManage ? "Add the first one above." : "Check back soon."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {photos.map((photo, index) => (
                        <div
                          key={photo.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openPhoto(index)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openPhoto(index);
                            }
                          }}
                          className="group relative aspect-square overflow-hidden rounded-2xl border bg-muted text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <img
                            src={photo.imageUrl}
                            alt={photo.caption || `${club.name} photo ${index + 1}`}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-80" />
                          {photo.caption ? (
                            <div className="absolute inset-x-0 bottom-0 p-3">
                              <p className="line-clamp-2 text-xs font-medium text-white">{photo.caption}</p>
                            </div>
                          ) : null}
                          {canManage && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                removePhoto(photo.id);
                              }}
                              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:bg-destructive"
                              disabled={deletingPhotoId === photo.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="announcements" className="mt-0">
                  {!!club.announcements?.length ? (
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
                  ) : (
                    <div className="bg-muted/50 border border-dashed rounded-2xl p-10 text-center">
                      <p className="text-muted-foreground text-sm font-medium">No announcements yet.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="events" className="mt-0">
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
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={selectedPhotoIndex !== null} onOpenChange={(open) => !open && setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-5xl border-none bg-black/95 p-0 text-white shadow-2xl sm:rounded-[2rem]">
          {selectedPhoto && (
            <div className="relative overflow-hidden rounded-[inherit]">
              <button
                type="button"
                onClick={() => setSelectedPhotoIndex(null)}
                className="absolute right-5 top-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
              >
                <X className="h-5 w-5" />
              </button>
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={showPrevPhoto}
                    className="absolute left-5 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={showNextPhoto}
                    className="absolute right-5 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              <div className="max-h-[78vh] bg-black">
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.caption || `${club.name} photo`}
                  className="h-full max-h-[78vh] w-full object-contain"
                />
              </div>

              <div className="border-t border-white/10 bg-black/75 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/55">
                      Club Photos
                    </p>
                    <p className="mt-2 text-sm text-white/90">
                      {selectedPhoto.caption || "No caption provided."}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs font-semibold text-white/60">
                    {(selectedPhotoIndex ?? 0) + 1} / {photos.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

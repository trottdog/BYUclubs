import { useParams, useLocation } from "wouter";
import { useGetClub, useJoinClub } from "@workspace/api-client-react";
import { ArrowLeft, Users, Mail, Bell, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { EventCard } from "@/components/event-card";
import { format } from "date-fns";

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clubId = Number(id);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"about" | "activity" | "contact">("about");
  const queryClient = useQueryClient();

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
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 pb-12">
      <button 
        onClick={() => history.back()} 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-semibold transition-colors w-fit bg-card px-4 py-2 rounded-lg border shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden relative">
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
        </div>

        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-16 md:-mt-20 mb-6">
            <div className="flex items-end gap-5">
              <div 
                className="w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center text-4xl md:text-5xl font-extrabold text-white border-4 border-card shadow-md shrink-0"
                style={{ backgroundColor: club.avatarColor }}
              >
                {club.avatarInitials}
              </div>
            </div>
            
            <button
              onClick={() => joinMutation.mutate({ id: club.id })}
              disabled={joinMutation.isPending}
              className={cn(
                "px-8 py-3 rounded-xl font-bold transition-all shadow-sm w-full md:w-auto",
                club.isMember 
                  ? "bg-muted text-foreground hover:bg-destructive hover:text-white" 
                  : "bg-primary text-white hover:bg-primary/90 shadow-md"
              )}
            >
              {joinMutation.isPending ? "Loading..." : club.isMember ? "Leave Club" : "Join Club"}
            </button>
          </div>

          <div className="mb-8">
            <div className="mb-3">
              <span 
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border border-border" 
                style={{ color: club.categoryColor, backgroundColor: `${club.categoryColor}15` }}
              >
                {club.categoryName}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">{club.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground font-semibold bg-muted w-fit px-3 py-1 rounded-md">
              <Users className="w-4 h-4" />
              <span>{club.memberCount} members</span>
            </div>
          </div>

          <div className="flex border-b border-border mb-6">
            {(["about", "activity", "contact"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "px-6 py-3 font-bold text-sm capitalize transition-all border-b-2",
                  activeTab === t 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="py-2 min-h-[300px]">
            {activeTab === "about" && (
              <div className="prose max-w-none">
                <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">{club.description}</p>
              </div>
            )}

            {activeTab === "contact" && (
              <div className="flex flex-col gap-4 max-w-md">
                <div className="flex items-center gap-4 p-5 rounded-xl bg-card border shadow-sm">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Primary Email</p>
                    <a href={`mailto:${club.contactEmail}`} className="text-lg font-bold text-foreground hover:text-primary transition-colors">{club.contactEmail}</a>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Upcoming Events */}
                <div>
                  <h3 className="text-lg font-extrabold flex items-center gap-2 mb-4 text-foreground">
                    <CalendarIcon className="w-5 h-5 text-primary" /> Upcoming Events
                  </h3>
                  <div className="space-y-4">
                    {!club.upcomingEvents?.length ? (
                      <div className="bg-muted/50 border border-dashed rounded-xl p-6 text-center">
                        <p className="text-muted-foreground text-sm font-medium">No upcoming events scheduled.</p>
                      </div>
                    ) : (
                      club.upcomingEvents.map(ev => <EventCard key={ev.id} event={ev} compact />)
                    )}
                  </div>
                </div>

                {/* Announcements */}
                <div>
                  <h3 className="text-lg font-extrabold flex items-center gap-2 mb-4 text-foreground">
                    <Bell className="w-5 h-5 text-amber-500" /> Announcements
                  </h3>
                  <div className="space-y-4">
                    {!club.announcements?.length ? (
                      <div className="bg-muted/50 border border-dashed rounded-xl p-6 text-center">
                        <p className="text-muted-foreground text-sm font-medium">No recent announcements.</p>
                      </div>
                    ) : (
                      club.announcements.map(ann => (
                        <div key={ann.id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2 gap-4">
                            <h4 className="font-bold text-foreground text-lg leading-tight">{ann.title}</h4>
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0">
                              {format(new Date(ann.createdAt), "MMM d")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{ann.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

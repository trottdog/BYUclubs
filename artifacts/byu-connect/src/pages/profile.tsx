import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserProfile } from "@workspace/api-client-react";
import { EventCard } from "@/components/event-card";
import { Bookmark, CalendarCheck, LogOut, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [user, authLoading, setLocation]);

  const { data: profile, isLoading: profileLoading } = useGetUserProfile({
    query: {
      enabled: !!user
    }
  });

  if (authLoading || !user) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 pb-24 md:pb-12 overflow-x-hidden">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary flex items-center justify-center text-4xl font-extrabold text-white shadow-md shrink-0 border-4 border-white">
          {user.firstName[0]}{user.lastName[0]}
        </div>
        
        <div className="flex-1 text-center md:text-left pt-2">
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{user.firstName} {user.lastName}</h2>
          <p className="text-muted-foreground font-medium mb-6">{user.email}</p>
          
          {profileLoading ? (
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="h-20 w-32 bg-muted rounded-xl animate-pulse" />
              <div className="h-20 w-32 bg-muted rounded-xl animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="bg-muted/30 border rounded-xl p-4 min-w-[140px] flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Bookmark className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Saved</span>
                </div>
                <p className="text-3xl font-extrabold text-foreground">{profile?.savedCount || 0}</p>
              </div>
              
              <div className="bg-muted/30 border rounded-xl p-4 min-w-[140px] flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CalendarCheck className="w-4 h-4 text-[#22c55e]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Reservations</span>
                </div>
                <p className="text-3xl font-extrabold text-foreground">{profile?.reservationsCount || 0}</p>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleLogout}
          className="md:absolute top-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors w-full md:w-auto justify-center mt-4 md:mt-0 border border-transparent hover:border-destructive/20"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {profileLoading ? (
        <div className="w-full h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : profile && (
        <div className="space-y-12">
          <section>
            <h3 className="text-2xl font-extrabold flex items-center gap-2 mb-6 text-foreground border-b pb-3">
              <CalendarCheck className="w-6 h-6 text-[#22c55e]" /> My Reservations
            </h3>
            
            {!profile.reservations || profile.reservations.length === 0 ? (
              <div className="bg-card rounded-2xl border border-dashed p-10 text-center">
                <CalendarCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium text-lg">No reservations yet.</p>
                <p className="text-sm mt-1">Spots you reserve will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.reservations.map(ev => <EventCard key={ev.id} event={ev} compact />)}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-2xl font-extrabold flex items-center gap-2 mb-6 text-foreground border-b pb-3">
              <Bookmark className="w-6 h-6 text-primary" /> Saved Events
            </h3>
            
            {!profile.savedEvents || profile.savedEvents.length === 0 ? (
              <div className="bg-card rounded-2xl border border-dashed p-10 text-center">
                <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium text-lg">No saved events.</p>
                <p className="text-sm mt-1">Events you bookmark will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.savedEvents.map(ev => <EventCard key={ev.id} event={ev} compact />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

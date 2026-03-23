import { useParams, useLocation } from "wouter";
import { useGetEvent, useSaveEvent, useReserveEvent } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MapPin, Tag, Users, Bookmark, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function EventDetailPage({
  routeParams,
}: {
  routeParams?: { id?: string };
}) {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const eventIdFromRouteProps = Number(routeParams?.id);
  const eventIdFromParams = Number(id);
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : location;
  const eventIdFromPathMatch = pathname.match(/\/events\/(\d+)(?:\/)?$/);
  const eventId = !Number.isNaN(eventIdFromRouteProps)
    ? eventIdFromRouteProps
    : !Number.isNaN(eventIdFromParams)
      ? eventIdFromParams
      : Number(eventIdFromPathMatch?.[1]);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: event, isLoading, error } = useGetEvent(eventId, {
    query: { enabled: !isNaN(eventId), queryKey: ["/api/events", eventId] }
  });

  const saveMutation = useSaveEvent({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] })
    }
  });

  const reserveMutation = useReserveEvent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
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

  if (error || !event) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Event not found</h2>
        <button onClick={() => setLocation("/")} className="text-primary hover:underline font-medium">Go back home</button>
      </div>
    );
  }

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const capacityPercent = Math.min(100, Math.round((event.reservedCount / event.capacity) * 100));
  const isFull = event.reservedCount >= event.capacity;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 pb-32">
      <button 
        onClick={() => history.back()} 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-semibold transition-colors w-fit bg-card px-4 py-2 rounded-lg border shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero Section */}
      <div className="relative w-full h-[250px] md:h-[350px] rounded-2xl overflow-hidden shadow-sm border border-border bg-muted">
        <div className="absolute inset-0" style={{ backgroundColor: event.categoryColor || '#cbd5e1', opacity: event.coverImageUrl ? 0 : 0.3 }} />
        {event.coverImageUrl && (
          <img 
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button 
            onClick={() => saveMutation.mutate({ id: event.id })}
            className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors border border-white/20"
          >
            <Bookmark className={cn("w-5 h-5", event.isSaved && "fill-current text-white")} />
          </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="mb-3">
             <span 
              className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-sm border border-white/20"
              style={{ backgroundColor: event.categoryColor }}
            >
              {event.categoryName}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2 leading-tight">{event.title}</h1>
          <p className="text-white/90 font-medium flex items-center gap-2">
            Hosted by <span className="font-bold underline decoration-white/40 underline-offset-4">{event.clubName}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          <div className="bg-card rounded-2xl p-6 md:p-8 border shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-foreground">About this event</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
            
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
                {event.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-muted text-muted-foreground rounded-md text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <Tag className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-5 border shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">{format(start, "EEEE, MMMM d")}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                <Clock className="w-3.5 h-3.5" /> {format(start, "h:mm a")} - {format(end, "h:mm a")}
              </p>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 border shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">{event.buildingName}</p>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Room {event.roomNumber}</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" /> Capacity
              </h4>
              <span className="text-sm font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">{event.reservedCount} / {event.capacity}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-3">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", isFull ? "bg-destructive" : "bg-primary")} 
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
            <p className={cn("text-sm font-semibold text-right", isFull ? "text-destructive" : "text-primary")}>
              {isFull ? "Event is full" : `${event.capacity - event.reservedCount} spots remaining`}
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 md:bottom-6 left-0 md:left-1/2 md:-translate-x-1/2 w-full md:w-auto md:min-w-[450px] bg-card/95 backdrop-blur-xl border-t md:border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 md:rounded-2xl flex items-center justify-between z-40">
        <div className="px-2 hidden sm:block">
          <p className="font-bold text-foreground">{event.isReserved ? "You're going!" : "Want to join?"}</p>
          <p className="text-xs text-muted-foreground font-medium">{event.isReserved ? "Spot reserved" : isFull ? "Waitlist available" : "Secure your spot now"}</p>
        </div>
        
        {!user ? (
          <button
            onClick={() => setLocation("/auth")}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold transition-all shadow-sm bg-primary text-white hover:bg-primary/90"
          >
            Sign in to reserve
          </button>
        ) : (
          <button
            onClick={() => reserveMutation.mutate({ id: event.id })}
            disabled={!event.isReserved && isFull}
            className={cn(
              "w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              event.isReserved 
                ? "bg-secondary/10 text-secondary hover:bg-destructive hover:text-white" 
                : isFull 
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
            )}
          >
            {reserveMutation.isPending ? "Loading..." : event.isReserved ? <><CheckCircle className="w-5 h-5" /> Cancel Reservation</> : "Reserve Spot"}
          </button>
        )}
      </div>
    </div>
  );
}

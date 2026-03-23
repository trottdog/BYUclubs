import { Link } from "wouter";
import { Event, useSaveEvent, useReserveEvent } from "@workspace/api-client-react";
import { Clock, MapPin, Users, Utensils, Bookmark } from "lucide-react";
import { format, isSameDay, isWithinInterval, addHours, isBefore } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function EventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  const queryClient = useQueryClient();

  const saveMutation = useSaveEvent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
      }
    }
  });

  const reserveMutation = useReserveEvent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
      }
    }
  });

  const now = new Date();
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  let statusColor = "border-primary";
  let statusText = "";

  if (isWithinInterval(now, { start, end })) {
    statusColor = "border-[#22c55e]"; // Green
    statusText = "Happening Now";
  } else if (isBefore(now, start) && isBefore(start, addHours(now, 2))) {
    statusColor = "border-[#f59e0b]"; // Amber
    statusText = "Starting Soon";
  } else if (isBefore(now, start) && isSameDay(start, now)) {
    statusColor = "border-primary"; // Blue
    statusText = `Today ${format(start, "h a")}`;
  } else {
    statusColor = "border-primary";
    statusText = format(start, "MMM d, h:mm a");
  }

  const capacityPercent = Math.min(100, Math.round((event.reservedCount / event.capacity) * 100));
  const isFull = event.reservedCount >= event.capacity;

  return (
    <div className={cn(
      "group relative bg-card rounded-xl border border-border overflow-hidden transition-all duration-300",
      "hover:shadow-hover hover:border-primary/20 flex flex-col",
      compact ? "h-32 flex-row" : ""
    )}>
      {/* Accent border left */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 z-10 bg-current", statusColor.replace("border-", "text-"))} />
      
      {!compact && (
        <div className="relative h-44 w-full overflow-hidden bg-muted">
          <div 
            className="absolute inset-0 z-0" 
            style={{ 
              backgroundColor: event.categoryColor || '#cbd5e1',
              opacity: event.coverImageUrl ? 0 : 0.2
            }} 
          />
          {event.coverImageUrl && (
            <img 
              src={event.coverImageUrl}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="absolute top-3 right-3 z-20">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveMutation.mutate({ id: event.id }); }}
              className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors border border-white/10"
              aria-label={event.isSaved ? "Unsave event" : "Save event"}
            >
              <Bookmark className={cn("w-4 h-4", event.isSaved && "fill-current text-white")} />
            </button>
          </div>
          
          <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between z-10">
            <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-xs font-semibold text-white flex items-center gap-1.5 border border-white/10 shadow-sm">
              {statusText.includes("Now") && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              {statusText}
            </span>
          </div>
        </div>
      )}

      <div className={cn("flex flex-col flex-1 pl-5", compact ? "p-4" : "p-5")}>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link href={`/events/${event.id}`} className="block group-hover:text-primary transition-colors flex-1 z-10">
              <h3 className={cn("font-bold text-foreground line-clamp-1", compact ? "text-base" : "text-lg")}>
                {event.title}
              </h3>
            </Link>
            {compact && (
               <button 
                 onClick={(e) => { e.preventDefault(); saveMutation.mutate({ id: event.id }); }}
                 className="text-muted-foreground hover:text-primary transition-colors z-20"
               >
                 <Bookmark className={cn("w-5 h-5", event.isSaved && "fill-current text-primary")} />
               </button>
            )}
          </div>
          
          <p className="text-sm font-medium text-muted-foreground mb-3 line-clamp-1">{event.clubName}</p>
          
          <div className="space-y-1.5 mb-4">
            {compact && (
              <div className="flex items-center text-xs text-muted-foreground gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{statusText}</span>
              </div>
            )}
            <div className="flex items-center text-xs text-foreground font-medium gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="truncate">{event.buildingName} {event.roomNumber}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2">
            {event.hasFood && (
              <span className="flex items-center justify-center w-7 h-7 bg-amber-100 text-amber-600 rounded-full" title="Food provided">
                <Utensils className="w-3.5 h-3.5" />
              </span>
            )}
            <span 
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
              style={{ backgroundColor: `${event.categoryColor}20`, color: event.categoryColor }}
            >
              {event.categoryName}
            </span>
          </div>

          {!compact && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1">
                  {event.reservedCount}/{event.capacity}
                </div>
                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", isFull ? "bg-destructive" : "bg-primary")} 
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {compact && (
            <div className="flex items-center">
               <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", isFull ? "bg-destructive" : "bg-primary")} 
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
            </div>
          )}
        </div>

        {/* Absolute link overlay */}
        <Link href={`/events/${event.id}`} className="absolute inset-0 z-0" aria-label={`View ${event.title}`} />
      </div>
    </div>
  );
}

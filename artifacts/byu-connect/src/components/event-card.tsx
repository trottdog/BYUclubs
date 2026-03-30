import { Link } from "wouter";
import { Event, useSaveEvent } from "@workspace/api-client-react";
import { Clock, MapPin, Bookmark, ArrowUpRight } from "lucide-react";
import { format, isSameDay, isWithinInterval, addHours, isBefore } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

  const now = new Date();
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  let statusText = "";
  let isLive = false;

  if (isWithinInterval(now, { start, end })) {
    statusText = "LIVE NOW";
    isLive = true;
  } else if (isBefore(now, start) && isBefore(start, addHours(now, 2))) {
    statusText = "STARTING SOON";
  } else if (isBefore(now, start) && isSameDay(start, now)) {
    statusText = `TODAY ${format(start, "HH:mm")}`;
  } else {
    statusText = format(start, "MMM d, HH:mm").toUpperCase();
  }

  const capacityPercent = Math.min(100, Math.round((event.reservedCount / event.capacity) * 100));

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={cn(
        "connect-card group relative flex flex-col overflow-hidden border-t-primary bg-white",
        compact ? "h-32 flex-row" : "h-full"
      )}
    >
      {!compact && (
        <div className="relative h-48 w-full overflow-hidden rounded-t-[inherit] bg-muted">
          {event.coverImageUrl && (
            <img 
              src={event.coverImageUrl}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
          
          <div className="absolute top-4 right-4 z-20">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveMutation.mutate({ id: event.id }); }}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-white text-primary shadow-sm transition-colors hover:bg-primary hover:text-white"
            >
              <Bookmark className={cn("w-4 h-4", event.isSaved && "fill-current")} />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-20">
             <div className="flex gap-2">
                <span className={cn(
                  "px-2 py-1 text-[11px] font-semibold flex items-center gap-2 border bg-white/90 backdrop-blur-md",
                  "rounded-xl",
                  isLive ? "text-accent border-accent" : "text-primary border-primary"
                )}>
                  {isLive && <span className="w-1.5 h-1.5 bg-accent animate-pulse" />}
                  {statusText}
                </span>
             </div>
          </div>
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        <div className="flex-1">
          <p className="connect-eyebrow mb-2">{event.clubName.toUpperCase()}</p>
          <h3 className="text-xl font-bold mb-4 leading-tight group-hover:text-primary transition-colors text-foreground">
            {event.title}
          </h3>
          
          <div className="space-y-2 mb-6">
            <div className="flex items-center text-xs font-medium text-muted-foreground gap-3">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>{event.buildingName} / {event.roomNumber}</span>
            </div>
            <div className="flex items-center text-xs font-medium text-muted-foreground gap-3">
              <Clock className="w-3.5 h-3.5" />
              <span>{format(start, "HH:mm")} - {format(end, "HH:mm")}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
             <div className="text-[11px] font-medium text-muted-foreground">
                Capacity
             </div>
             <div className="flex items-center gap-3">
                <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${capacityPercent}%` }}
                     className="h-full bg-primary" 
                   />
                </div>
                <span className="text-xs font-semibold text-primary">{capacityPercent}%</span>
             </div>
          </div>
          
          <Link href={`/events/${event.id}`} className="text-xs font-semibold text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
             View <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <Link href={`/events/${event.id}`} className="absolute inset-0 z-0" aria-label={`View ${event.title}`} />
      </div>
    </motion.div>
  );
}

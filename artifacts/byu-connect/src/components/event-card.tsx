import { Link } from "wouter";
import { Event, useSaveEvent } from "@workspace/api-client-react";
import { Clock, MapPin, Bookmark, ArrowUpRight } from "lucide-react";
import { format, isSameDay, isWithinInterval, addHours, isBefore } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getProfileQueryKey, updateProfileAfterSave } from "@/lib/profile-cache";

export function EventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  const queryClient = useQueryClient();

  const saveMutation = useSaveEvent({
    mutation: {
      onSuccess: (result) => {
        queryClient.setQueryData(getProfileQueryKey(), (current: any) =>
          updateProfileAfterSave(current, event, result.saved),
        );
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        queryClient.invalidateQueries({ queryKey: getProfileQueryKey() });
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
    <div
      className={cn(
        "connect-card group relative flex flex-col overflow-hidden border-t-primary bg-white",
        compact ? "min-h-[8rem] flex-row" : "h-full min-h-[24rem]",
      )}
    >
      {!compact && (
        <div className="relative h-48 w-full overflow-hidden rounded-t-[inherit] bg-muted">
            {event.coverImageUrl && (
            <img 
              src={event.coverImageUrl}
              alt=""
              decoding="async"
              loading="lazy"
              className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
          
          <div className="absolute top-4 right-4 z-20">
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveMutation.mutate({ id: event.id }); }}
              className="relative z-30 flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-white text-primary shadow-sm transition-colors hover:bg-primary hover:text-white"
              aria-label={event.isSaved ? `Remove “${event.title}” from saved events` : `Save “${event.title}” to your profile`}
            >
              <Bookmark className={cn("w-4 h-4", event.isSaved && "fill-current")} aria-hidden />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-20">
             <div className="flex gap-2">
                <span className={cn(
                  "px-2 py-1 text-[11px] font-semibold flex items-center gap-2 border bg-white/95",
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

      <Link
        href={`/events/${event.id}`}
        aria-labelledby={`event-card-title-${event.id}`}
        className="relative z-10 flex min-h-0 flex-1 flex-col p-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="min-h-0 flex-1">
          <p className="connect-eyebrow mb-2">{event.clubName.toUpperCase()}</p>
          <h3
            id={`event-card-title-${event.id}`}
            className="mb-4 line-clamp-2 text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary"
          >
            {event.title}
          </h3>

          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{event.buildingName} / {event.roomNumber}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{format(start, "HH:mm")} - {format(end, "HH:mm")}</span>
            </div>
          </div>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="text-[11px] font-medium text-muted-foreground">Capacity</div>
            <div className="flex items-center gap-3">
              <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full origin-left bg-primary motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-primary">{capacityPercent}%</span>
            </div>
          </div>

          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary transition-all group-hover:gap-2.5" aria-hidden="true">
            View <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </div>
  );
}

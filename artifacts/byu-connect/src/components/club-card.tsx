import { Link } from "wouter";
import { Club } from "@workspace/api-client-react";
import { CalendarClock, Users } from "lucide-react";

export function ClubCard({
  club,
  tags = [],
  lastEventText = "No events yet",
}: {
  club: Club;
  tags?: string[];
  lastEventText?: string;
}) {
  return (
    <Link href={`/clubs/${club.id}`}>
      <span className="group flex cursor-pointer flex-col gap-4 rounded-[1.75rem] border border-border bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-hover">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-extrabold text-white shadow-sm"
            style={{ backgroundColor: club.avatarColor }}
          >
            {club.avatarInitials}
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
              {club.name}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/70 bg-muted/45 px-3 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{club.memberCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 truncate">
            <CalendarClock className="h-4 w-4 shrink-0" />
            <span className="truncate">{lastEventText}</span>
          </span>
        </div>
      </span>
    </Link>
  );
}

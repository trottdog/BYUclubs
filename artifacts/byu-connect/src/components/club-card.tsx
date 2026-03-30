import { Link } from "wouter";
import { Club } from "@workspace/api-client-react";
import { Users, ArrowUpRight } from "lucide-react";
import { DEFAULT_CLUB_AVATAR_URL } from "@/lib/avatars";

export function ClubCard({
  club,
  tags = [],
  lastEventText,
}: {
  club: Club;
  tags?: string[];
  lastEventText?: string;
}) {
  return (
    <Link href={`/clubs/${club.id}`}>
      <div className="connect-card border-t-primary group flex h-full min-h-[20rem] flex-col gap-5 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary bg-white p-1 transition-colors duration-200 group-hover:border-accent">
            <img src={DEFAULT_CLUB_AVATAR_URL} alt="" decoding="async" loading="lazy" className="h-full w-full object-contain" />
          </div>
          <div className="text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <p className="connect-eyebrow mb-2">{club.categoryName.toUpperCase()}</p>
          <h3 className="line-clamp-2 text-xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
            {club.name}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {club.description}
          </p>
        </div>

        <div className="flex min-h-[2rem] flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-5">
          <div className="min-w-0 flex items-center gap-3">
             <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted">
                <Users className="w-3 h-3 text-primary" />
             </div>
             <div className="min-w-0">
               <p className="text-xs font-medium text-muted-foreground">{club.memberCount} members</p>
               {lastEventText ? (
                 <p className="truncate text-[11px] text-muted-foreground/80">{lastEventText}</p>
               ) : null}
             </div>
          </div>
          <div className="shrink-0 text-xs font-semibold text-primary transition-all">
            View club
          </div>
        </div>
      </div>
    </Link>
  );
}

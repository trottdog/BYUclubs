import { useEffect, useMemo, useState } from "react";
import { useGetCategories, useGetClubs, useGetEvents } from "@workspace/api-client-react";
import { ClubCard } from "@/components/club-card";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Compass,
  Search as SearchIcon,
  Users,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MyClubsPage() {
  const [tab, setTab] = useState<"discover" | "my">("discover");
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [manageableClubIds, setManageableClubIds] = useState<Set<number>>(new Set());
  const debouncedQuery = useDebounce(query, 250);
  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  const { data: clubs, isLoading: clubsLoading } = useGetClubs();
  const { data: categories } = useGetCategories();
  const { data: events, isLoading: eventsLoading } = useGetEvents();

  const myClubs = useMemo(
    () => (clubs ?? []).filter((club) => club.isMember),
    [clubs],
  );

  useEffect(() => {
    if (!myClubs.length) {
      setManageableClubIds(new Set());
      return;
    }

    let mounted = true;
    Promise.all(
      myClubs.map(async (club) => {
        try {
          const res = await fetch(
            `/api/club-can-manage?id=${encodeURIComponent(String(club.id))}`,
            { credentials: "include" },
          );
          if (!res.ok) return null;
          const data = await res.json();
          return data?.canManage ? club.id : null;
        } catch {
          return null;
        }
      }),
    ).then((ids) => {
      if (!mounted) return;
      setManageableClubIds(new Set(ids.filter((id): id is number => typeof id === "number")));
    });

    return () => {
      mounted = false;
    };
  }, [myClubs]);

  const latestEventByClub = useMemo(() => {
    const byClub = new Map<number, string>();
    if (!events?.length) return byClub;

    const now = Date.now();
    const latestPast = new Map<number, number>();
    const nearestFuture = new Map<number, number>();

    events.forEach((event) => {
      const start = new Date(event.startTime).getTime();
      if (start <= now) {
        const current = latestPast.get(event.clubId);
        if (current === undefined || start > current) {
          latestPast.set(event.clubId, start);
        }
        return;
      }

      const current = nearestFuture.get(event.clubId);
      if (current === undefined || start < current) {
        nearestFuture.set(event.clubId, start);
      }
    });

    clubs?.forEach((club) => {
      const past = latestPast.get(club.id);
      if (past !== undefined) {
        byClub.set(club.id, formatDistanceToNow(new Date(past), { addSuffix: true }));
        return;
      }

      const upcoming = nearestFuture.get(club.id);
      if (upcoming !== undefined) {
        byClub.set(club.id, formatDistanceToNow(new Date(upcoming), { addSuffix: true }));
        return;
      }

      byClub.set(club.id, "No events yet");
    });

    return byClub;
  }, [clubs, events]);

  const filteredClubs = useMemo(() => {
    const baseClubs =
      tab === "discover"
        ? (clubs ?? []).filter((club) => !club.isMember)
        : myClubs;

    return baseClubs.filter((club) => {
      if (selectedCategoryId && club.categoryId !== selectedCategoryId) return false;
      if (!normalizedQuery) return true;

      const text = `${club.name} ${club.description} ${club.categoryName}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [clubs, myClubs, normalizedQuery, selectedCategoryId, tab]);

  const isLoading = clubsLoading || eventsLoading;
  const activeFilterCount = Number(!!normalizedQuery) + Number(selectedCategoryId !== null);

  return (
    <div className="w-full min-w-0 max-w-full flex flex-col gap-6 overflow-x-hidden">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clubs..."
          className="w-full rounded-xl border bg-card py-3 pl-12 pr-12 text-sm md:text-base outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center rounded-full border bg-card p-1 shadow-sm">
          <button
            onClick={() => setTab("discover")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm",
              tab === "discover" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Discover</span>
          </button>
          <button
            onClick={() => setTab("my")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm",
              tab === "my" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>My clubs</span>
          </button>
        </div>

        <Select
          value={selectedCategoryId === null ? "all" : String(selectedCategoryId)}
          onValueChange={(value) => {
            if (value === "all") {
              setSelectedCategoryId(null);
              return;
            }

            const id = parseInt(value, 10);
            setSelectedCategoryId(Number.isFinite(id) ? id : null);
          }}
        >
          <SelectTrigger className="h-9 w-[132px] rounded-full border bg-card px-3 text-xs font-semibold sm:w-[160px] sm:text-sm">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-50 max-h-[min(70vh,24rem)]">
            <SelectItem value="all" className="text-sm font-medium">
              All categories
            </SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={String(category.id)} className="text-sm font-medium">
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedCategoryId(null);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground sm:text-sm"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="min-h-[500px]">
        {isLoading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              {tab === "discover" ? (
                <Compass className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Users className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <p className="text-lg font-bold text-foreground">
              {tab === "discover" ? "No clubs to discover" : "No clubs here yet"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {tab === "discover"
                ? "Try a different search or category."
                : "Join a club from discover to build your list."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredClubs.map((club) => {
              const tags = [club.categoryName];
              if (tab === "my" && manageableClubIds.has(club.id)) {
                tags.push("Admin");
              }

              return (
                <ClubCard
                  key={club.id}
                  club={club}
                  tags={tags}
                  lastEventText={latestEventByClub.get(club.id) ?? "No events yet"}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

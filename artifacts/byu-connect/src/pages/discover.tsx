import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  getGetClubQueryOptions,
  useGetBuildings,
  useGetCategories,
  useGetClubs,
  useGetEvents,
} from "@workspace/api-client-react";
import { EventCard } from "@/components/event-card";
import { ClubCard } from "@/components/club-card";
import { MapView } from "@/components/map-view";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import {
  CalendarClock,
  Coffee,
  List,
  Map as MapIcon,
  Search as SearchIcon,
  ArrowUpRight,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueries } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

type TimeFilter = "all" | "now" | "today" | "week" | "upcoming";

const TIME_FILTERS: Array<{ id: TimeFilter; label: string }> = [
  { id: "all", label: "ALL TIME" },
  { id: "now", label: "LIVE NOW" },
  { id: "today", label: "TODAY" },
  { id: "week", label: "THIS WEEK" },
  { id: "upcoming", label: "UPCOMING" },
];

export default function DiscoverPage() {
  const { user } = useAuth();
  const [view, setView] = useState<"events" | "map" | "clubs">("events");
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [foodOnly, setFoodOnly] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  const { data: events, isLoading: eventsLoading } = useGetEvents();
  const { data: clubs, isLoading: clubsLoading } = useGetClubs();
  const { data: categories } = useGetCategories();
  const { data: buildings, isLoading: buildingsLoading } = useGetBuildings();
  
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date().getTime();

    const matchesQuery = (event: (typeof events)[number]) => {
      if (!normalizedQuery) return true;
      const text = [
        event.title,
        event.description,
        event.buildingName,
        event.clubName,
        event.categoryName,
        event.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(normalizedQuery);
    };

    const matchesTime = (event: (typeof events)[number]) => {
      const start = new Date(event.startTime).getTime();
      const end = new Date(event.endTime).getTime();
      const eventDate = new Date(event.startTime);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      const weekAhead = new Date(startOfToday);
      weekAhead.setDate(weekAhead.getDate() + 7);

      if (timeFilter === "all") return true;
      if (timeFilter === "now") return start <= now && now <= end;
      if (timeFilter === "today") return eventDate >= startOfToday && eventDate < endOfToday;
      if (timeFilter === "week") return eventDate >= startOfToday && eventDate < weekAhead;
      return start >= now;
    };

    return events
      .filter((event) => {
        if (selectedCategoryId && event.categoryId !== selectedCategoryId) return false;
        if (foodOnly && !event.hasFood) return false;
        return matchesQuery(event) && matchesTime(event);
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, foodOnly, normalizedQuery, selectedCategoryId, timeFilter]);

  const filteredClubs = useMemo(() => {
    if (!clubs) return [];
    return clubs.filter((club) => {
      if (selectedCategoryId && club.categoryId !== selectedCategoryId) return false;
      if (!normalizedQuery) return true;
      const text = `${club.name} ${club.description} ${club.categoryName}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [clubs, normalizedQuery, selectedCategoryId]);

  const filteredBuildings = useMemo(() => {
    if (!buildings) return [];
    if (!normalizedQuery) return buildings;
    return buildings.filter((building) => {
      const text = `${building.name} ${building.abbreviation} ${building.address}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [buildings, normalizedQuery]);

  const isLoading = eventsLoading || clubsLoading || buildingsLoading;
  const normalizedLiveQuery = query.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedLiveQuery) return [];
    const eventSuggestions = (events || [])
      .filter((event) => event.title.toLowerCase().includes(normalizedLiveQuery))
      .slice(0, 4)
      .map((event) => ({
        key: `event-${event.id}`,
        label: event.title.toUpperCase(),
        subtitle: event.clubName.toUpperCase(),
        type: "EVENT",
        value: event.title,
      }));
    const clubSuggestions = (clubs || [])
      .filter((club) => club.name.toLowerCase().includes(normalizedLiveQuery))
      .slice(0, 3)
      .map((club) => ({
        key: `club-${club.id}`,
        label: club.name.toUpperCase(),
        subtitle: club.categoryName.toUpperCase(),
        type: "CLUB",
        value: club.name,
      }));
    return [...eventSuggestions, ...clubSuggestions].slice(0, 8);
  }, [clubs, events, normalizedLiveQuery]);

  const activeFilterCount =
    Number(timeFilter !== "all") +
    Number(selectedCategoryId !== null) +
    Number(foodOnly);

  return (
    <div className="w-full flex flex-col gap-24 overflow-x-hidden">
      {/* Official header — LinkedIn-style wide cover (photo stays vivid; gradient only anchors text at bottom) */}
      <div className="relative w-full overflow-hidden rounded-[1.75rem] border border-border shadow-[0_24px_60px_-20px_rgba(0,35,90,0.35)] min-h-[min(42vw,280px)] sm:min-h-[260px] md:min-h-[300px]">
        <img
          src="/images/discover-campus-life.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Read lane: opaque enough for white type; right side of banner stays mostly the raw photo */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/78 from-[-5%] via-black/35 via-45% to-transparent to-100%"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-black/70 to-transparent sm:h-[38%]"
          aria-hidden
        />

        <div className="relative z-10 flex min-h-[min(42vw,280px)] flex-col justify-between gap-8 p-6 sm:min-h-[260px] sm:p-8 md:min-h-[300px] md:p-10">
          <div className="flex items-center gap-4 text-white">
            <ShieldCheck className="h-5 w-5 shrink-0 fill-current text-white" />
            <p className="connect-eyebrow !text-white/95">BYU CONNECT</p>
          </div>

          <div className="flex flex-col gap-8">
            <h1 className="connect-display-title text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
              DISCOVER <span className="text-[color:rgb(147,197,253)]">CAMPUS</span> LIFE
            </h1>
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:gap-12">
              <p className="max-w-xl border-l-2 border-white/70 pl-6 text-sm font-medium leading-relaxed text-white/95">
                Find events, clubs, and places on campus. Student organizations keep the community connected—browse what&apos;s
                happening and where.
              </p>
              <div className="flex shrink-0 gap-8">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold leading-none tracking-tight text-[color:rgb(147,197,253)]">Live</span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/80">Status</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold leading-none tracking-tight text-white">{events?.length ?? 0}</span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/80">Events</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Industrial Search & Filter */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md py-6 -mx-8 px-8 border-y border-border">
        <div className="flex flex-col gap-6">
          <div className="relative">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder="SEARCH EVENTS, CLUBS & BUILDINGS..."
              className="connect-search-input"
            />
            
            <AnimatePresence>
              {isSearchFocused && normalizedLiveQuery.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto border-2 border-primary bg-white p-2 shadow-xl"
                >
                  {suggestions.length === 0 ? (
                    <div className="px-6 py-4 text-sm font-medium text-muted-foreground">No matches found.</div>
                  ) : (
                    suggestions.map((suggestion) => (
                      <button
                        key={suggestion.key}
                        onClick={() => {
                          setQuery(suggestion.value);
                          setIsSearchFocused(false);
                          if (suggestion.type === "CLUB") setView("clubs");
                          else setView("events");
                        }}
                        className="flex w-full items-start justify-between gap-6 px-6 py-4 text-left hover:bg-primary group transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground group-hover:text-white">{suggestion.label}</p>
                          <p className="truncate text-[11px] font-medium text-muted-foreground mt-0.5 group-hover:text-white/60">{suggestion.subtitle}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground group-hover:bg-white/20 group-hover:text-white">
                          {suggestion.type}
                        </span>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex shrink-0 items-center rounded-2xl border border-border bg-white p-1">
              <button
                type="button"
                onClick={() => setView("events")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all sm:px-6",
                  view === "events" ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"
                )}
              >
                <List className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">EVENTS</span>
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all sm:px-6",
                  view === "map" ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"
                )}
              >
                <MapIcon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">MAP</span>
              </button>
              <button
                type="button"
                onClick={() => setView("clubs")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all sm:px-6",
                  view === "clubs" ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">CLUBS</span>
              </button>
            </div>

            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="h-10 w-[160px] rounded-2xl border border-border bg-white px-6 text-sm font-medium hover:border-primary text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border border-primary bg-white">
                {TIME_FILTERS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id} className="text-sm font-medium hover:bg-primary hover:text-white">
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() => setFoodOnly((v) => !v)}
              className={cn(
                "flex h-10 items-center gap-3 rounded-2xl border px-6 text-sm font-medium transition-all",
                foodOnly ? "bg-primary text-white border-primary" : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
              )}
            >
              <Coffee className="h-4 w-4" />
              FOOD
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={() => { setTimeFilter("all"); setSelectedCategoryId(null); setFoodOnly(false); }}
                className="h-10 rounded-2xl border border-destructive/40 px-6 text-destructive text-sm font-medium hover:bg-destructive hover:text-white transition-all"
              >
                RESET
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="w-full h-96 flex flex-col items-center justify-center gap-8">
            <div className="w-16 h-1 bg-muted relative overflow-hidden">
               <motion.div 
                 initial={{ left: "-100%" }}
                 animate={{ left: "100%" }}
                 transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                 className="absolute inset-0 bg-primary" 
               />
            </div>
            <p className="connect-eyebrow">LOADING CAMPUS DATA...</p>
          </div>
        ) : view === "map" ? (
          <div className="h-[700px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <MapView events={filteredEvents} buildings={filteredBuildings} />
          </div>
        ) : view === "clubs" ? (
          <section>
            <div className="mb-12 flex items-center justify-between border-b-2 border-border pb-6">
              <div className="flex flex-col gap-2">
                <p className="connect-eyebrow">COMMUNITY</p>
                <h2 className="text-5xl font-bold tracking-tight text-foreground">Active Clubs</h2>
              </div>
              <div className="bg-muted border border-border px-6 py-3 text-sm font-medium text-muted-foreground">
                {filteredClubs.length} CLUBS
              </div>
            </div>
            {filteredClubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/10 py-40">
                <p className="text-xl font-semibold text-muted-foreground">No clubs found</p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">Try adjusting search or filters</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {filteredClubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="mb-12 flex items-end justify-between border-b-4 border-primary pb-6">
              <div className="flex flex-col gap-2">
                <p className="connect-eyebrow">FEATURED</p>
                <h2 className="text-5xl font-bold tracking-tight text-foreground">Live Events</h2>
              </div>
              <Link
                href="/events"
                className="hidden items-center gap-3 text-sm font-medium text-primary transition-colors hover:text-accent md:flex"
              >
                SEE ALL EVENTS <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-1px overflow-hidden rounded-2xl border border-border bg-border shadow-sm md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center border-2 border-dashed border-border bg-muted/10 py-40">
                  <p className="text-xl font-semibold text-muted-foreground">No events found</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div key={event.id} className="bg-background">
                    <EventCard event={event} />
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

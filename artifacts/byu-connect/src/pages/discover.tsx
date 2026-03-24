import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
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
  Building2,
  CalendarClock,
  Coffee,
  Filter,
  List,
  Map as MapIcon,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TimeFilter = "all" | "now" | "today" | "week" | "upcoming";

const TIME_FILTERS: Array<{ id: TimeFilter; label: string }> = [
  { id: "all", label: "All time" },
  { id: "now", label: "Happening now" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "upcoming", label: "Upcoming" },
];

export default function DiscoverPage() {
  const [view, setView] = useState<"list" | "map">("list");
  const [showMapFilters, setShowMapFilters] = useState(false);
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
      if (timeFilter === "today") {
        return eventDate >= startOfToday && eventDate < endOfToday;
      }
      if (timeFilter === "week") {
        return eventDate >= startOfToday && eventDate < weekAhead;
      }
      return start >= now;
    };

    return events
      .filter((event) => {
        if (selectedCategoryId && event.categoryId !== selectedCategoryId) return false;
        if (foodOnly && !event.hasFood) return false;
        return matchesQuery(event) && matchesTime(event);
      })
      .sort((a, b) => {
      const startA = new Date(a.startTime).getTime();
      const endA = new Date(a.endTime).getTime();
      const startB = new Date(b.startTime).getTime();
      const endB = new Date(b.endTime).getTime();

      const isNowA = startA <= now && now <= endA;
      const isNowB = startB <= now && now <= endB;

      if (isNowA && !isNowB) return -1;
      if (!isNowA && isNowB) return 1;

      return startA - startB;
    });
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
      .filter((event) => {
        const text = `${event.title} ${event.description} ${event.buildingName} ${event.clubName}`.toLowerCase();
        return text.includes(normalizedLiveQuery);
      })
      .slice(0, 4)
      .map((event) => ({
        key: `event-${event.id}`,
        label: event.title,
        subtitle: `${event.buildingName} • ${event.clubName}`,
        type: "Event",
        value: event.title,
      }));

    const clubSuggestions = (clubs || [])
      .filter((club) => {
        const text = `${club.name} ${club.description}`.toLowerCase();
        return text.includes(normalizedLiveQuery);
      })
      .slice(0, 3)
      .map((club) => ({
        key: `club-${club.id}`,
        label: club.name,
        subtitle: club.categoryName,
        type: "Club",
        value: club.name,
      }));

    const buildingSuggestions = (buildings || [])
      .filter((building) => {
        const text = `${building.name} ${building.abbreviation} ${building.address}`.toLowerCase();
        return text.includes(normalizedLiveQuery);
      })
      .slice(0, 3)
      .map((building) => ({
        key: `building-${building.id}`,
        label: building.name,
        subtitle: `${building.abbreviation} • ${building.address}`,
        type: "Building",
        value: building.name,
      }));

    return [...eventSuggestions, ...clubSuggestions, ...buildingSuggestions].slice(0, 8);
  }, [buildings, clubs, events, normalizedLiveQuery]);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Discover</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Find what's happening on campus today.</p>
        </div>
        
        <div className="flex items-center p-1 bg-card rounded-lg border shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all",
              view === "list" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button
            onClick={() => setView("map")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all",
              view === "map" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapIcon className="w-4 h-4" /> Map
          </button>
        </div>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsSearchFocused(false), 100);
          }}
          placeholder="Search events, clubs, or buildings..."
          className="w-full rounded-xl border bg-card py-3 pl-12 pr-12 text-sm md:text-base outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isSearchFocused && normalizedLiveQuery.length > 0 && (
          <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border bg-card p-2 shadow-lg">
            {suggestions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No suggestions yet.</div>
            ) : (
              suggestions.map((suggestion) => (
                <button
                  key={suggestion.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(suggestion.value);
                    setView("list");
                    setIsSearchFocused(false);
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{suggestion.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{suggestion.subtitle}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
                    {suggestion.type}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {view !== "map" && (
        <>
          {/* Mobile list view: compact dropdowns */}
          <div className="flex flex-col gap-3 md:hidden pb-1">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">When</p>
              <Select
                value={timeFilter}
                onValueChange={(v) => setTimeFilter(v as TimeFilter)}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border bg-card text-left font-semibold shadow-sm">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 max-h-[min(70vh,24rem)]">
                  {TIME_FILTERS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id} className="font-medium">
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Category</p>
              <Select
                value={selectedCategoryId === null ? "all" : String(selectedCategoryId)}
                onValueChange={(v) => {
                  if (v === "all") setSelectedCategoryId(null);
                  else {
                    const id = parseInt(v, 10);
                    setSelectedCategoryId(Number.isFinite(id) ? id : null);
                  }
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border bg-card text-left font-semibold shadow-sm">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 max-h-[min(70vh,24rem)]">
                  <SelectItem value="all" className="font-medium">
                    All categories
                  </SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)} className="font-medium">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Food</p>
              <Select
                value={foodOnly ? "food" : "any"}
                onValueChange={(v) => setFoodOnly(v === "food")}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border bg-card text-left font-semibold shadow-sm">
                  <span className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" className="z-50">
                  <SelectItem value="any" className="font-medium">
                    All events
                  </SelectItem>
                  <SelectItem value="food" className="font-medium">
                    Food provided only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* md+: chip filters (list view) */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            {TIME_FILTERS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setTimeFilter(preset.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold sm:text-sm",
                  timeFilter === preset.id
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {preset.label}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFoodOnly((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold sm:text-sm",
                foodOnly
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <span className="inline-flex items-center gap-1">
                <Coffee className="w-3.5 h-3.5" />
                Food provided
              </span>
            </button>
          </div>

          <div className="hidden md:flex flex-wrap items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm border",
                selectedCategoryId === null
                  ? "bg-primary border-primary text-white"
                  : "bg-card border-border text-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold border transition-all shadow-sm flex items-center gap-2",
                  selectedCategoryId === cat.id
                    ? "text-white"
                    : "bg-card border-border text-foreground hover:bg-muted"
                )}
                style={{
                  backgroundColor: selectedCategoryId === cat.id ? cat.color : undefined,
                  borderColor: selectedCategoryId === cat.id ? cat.color : undefined
                }}
              >
                {selectedCategoryId !== cat.id && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                )}
                {cat.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex-1 min-h-[600px] relative">
        {isLoading ? (
          <div className="w-full h-64 flex flex-col items-center justify-center gap-4 text-primary">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : view === "map" ? (
          <div className="absolute inset-0 h-[640px]">
            <MapView
              events={filteredEvents}
              buildings={buildings || []}
              filterOverlay={
                <div className="space-y-2">
                  <button
                    onClick={() => setShowMapFilters((v) => !v)}
                    className="flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white/92 px-3.5 text-sm font-semibold text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm transition hover:bg-white"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {(timeFilter !== "all" || selectedCategoryId !== null || foodOnly) && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Active</span>
                    )}
                  </button>

                  {showMapFilters && (
                    <div className="max-h-[220px] w-[min(360px,calc(100vw-8rem))] overflow-y-auto rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {TIME_FILTERS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => setTimeFilter(preset.id)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-bold sm:text-sm",
                              timeFilter === preset.id
                                ? "border-primary bg-primary text-white"
                                : "border-border bg-card text-foreground hover:bg-muted"
                            )}
                          >
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="w-3.5 h-3.5" />
                              {preset.label}
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={() => setFoodOnly((v) => !v)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-bold sm:text-sm",
                            foodOnly
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-card text-foreground hover:bg-muted"
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Coffee className="w-3.5 h-3.5" />
                            Food provided
                          </span>
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedCategoryId(null)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm border",
                            selectedCategoryId === null
                              ? "bg-primary border-primary text-white"
                              : "bg-card border-border text-foreground hover:bg-muted"
                          )}
                        >
                          All
                        </button>
                        {categories?.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                            className={cn(
                              "px-4 py-2 rounded-full text-sm font-bold border transition-all shadow-sm flex items-center gap-2",
                              selectedCategoryId === cat.id
                                ? "text-white"
                                : "bg-card border-border text-foreground hover:bg-muted"
                            )}
                            style={{
                              backgroundColor: selectedCategoryId === cat.id ? cat.color : undefined,
                              borderColor: selectedCategoryId === cat.id ? cat.color : undefined
                            }}
                          >
                            {selectedCategoryId !== cat.id && (
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            )}
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-10 pb-8">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-foreground">Events</h2>
                <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">
                  {filteredEvents.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.length === 0 ? (
                  <div className="col-span-full py-14 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border border-dashed">
                    <Filter className="w-10 h-10 mb-3 text-border" />
                    <p className="font-semibold text-base text-foreground">No events found</p>
                    <p className="text-sm">Try adjusting filters or search text.</p>
                  </div>
                ) : (
                  filteredEvents.map((event) => <EventCard key={event.id} event={event} />)
                )}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-foreground">Clubs</h2>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-white">
                  {filteredClubs.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClubs.length === 0 ? (
                  <div className="col-span-full py-10 rounded-2xl border border-dashed bg-card text-center text-sm text-muted-foreground">
                    No clubs match your current filters.
                  </div>
                ) : (
                  filteredClubs.map((club) => <ClubCard key={club.id} club={club} />)
                )}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-foreground">Buildings</h2>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
                  {filteredBuildings.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBuildings.length === 0 ? (
                  <div className="col-span-full py-10 rounded-2xl border border-dashed bg-card text-center text-sm text-muted-foreground">
                    No buildings match your search.
                  </div>
                ) : (
                  filteredBuildings.map((building) => (
                    <div key={building.id} className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="font-bold text-foreground leading-tight">{building.name}</p>
                        <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-bold">
                          {building.abbreviation}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{building.address}</p>
                      <Link href={`/?building=${building.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                        <Building2 className="w-4 h-4" />
                        View on map
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

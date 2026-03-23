import { useState, useMemo } from "react";
import { useGetEvents, useGetCategories, useGetBuildings } from "@workspace/api-client-react";
import { EventCard } from "@/components/event-card";
import { MapView } from "@/components/map-view";
import { Map as MapIcon, List, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DiscoverPage() {
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const { data: events, isLoading: eventsLoading } = useGetEvents({
    categoryId: selectedCategoryId || undefined,
  });
  
  const { data: categories } = useGetCategories();
  const { data: buildings } = useGetBuildings();

  const sortedEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date().getTime();
    
    // Sort by closest start time, put "happening now" first
    return [...events].sort((a, b) => {
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
  }, [events]);

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

      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={cn(
            "shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm border",
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
              "shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-all shadow-sm flex items-center gap-2",
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

      <div className="flex-1 min-h-[600px] relative">
        {eventsLoading ? (
          <div className="w-full h-64 flex flex-col items-center justify-center gap-4 text-primary">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : view === "map" ? (
          <div className="absolute inset-0 h-[600px] rounded-2xl overflow-hidden shadow-sm border">
             <MapView events={sortedEvents} buildings={buildings || []} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {sortedEvents.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border border-dashed">
                <Filter className="w-12 h-12 mb-4 text-border" />
                <p className="font-semibold text-lg text-foreground">No events found</p>
                <p className="text-sm">Try adjusting your category filters</p>
              </div>
            ) : (
              sortedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

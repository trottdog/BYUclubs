import { useState } from "react";
import { useSearch } from "@workspace/api-client-react";
import { Search as SearchIcon, X, Calendar, Users } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { ClubCard } from "@/components/club-card";
import { useDebounce } from "@/hooks/use-debounce";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useSearch(
    { q: debouncedQuery },
    { query: { enabled: debouncedQuery.length > 1 } }
  );

  return (
    <div className="w-full flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Search</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Find specific events, clubs, or topics.</p>
      </div>

      <div className="relative max-w-3xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try 'Coding' or 'Intramural'..."
          className="w-full pl-14 pr-12 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-lg font-semibold shadow-sm outline-none placeholder:text-muted-foreground/50 text-foreground"
        />
        {query && (
          <button 
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {debouncedQuery.length <= 1 ? (
        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground text-center bg-card rounded-2xl border border-dashed max-w-3xl">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <SearchIcon className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-bold text-foreground">Type to start searching</p>
          <p className="text-sm mt-1">Enter at least 2 characters to see results.</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20 max-w-3xl">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : results ? (
        <div className="space-y-12 pb-12">
          {/* Events Section */}
          <section>
            <h2 className="text-2xl font-extrabold flex items-center gap-2 mb-6 text-foreground border-b pb-2">
              <Calendar className="w-6 h-6 text-primary" /> Events
              <span className="text-sm font-bold bg-primary text-white px-2.5 py-0.5 rounded-full ml-2 shadow-sm">
                {results.events.length}
              </span>
            </h2>
            {results.events.length === 0 ? (
              <p className="text-muted-foreground font-medium bg-card p-6 rounded-xl border border-dashed text-center">No events found for "{debouncedQuery}".</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.events.map(ev => <EventCard key={ev.id} event={ev} compact />)}
              </div>
            )}
          </section>

          {/* Clubs Section */}
          <section>
            <h2 className="text-2xl font-extrabold flex items-center gap-2 mb-6 text-foreground border-b pb-2">
              <Users className="w-6 h-6 text-secondary" /> Clubs
              <span className="text-sm font-bold bg-secondary text-white px-2.5 py-0.5 rounded-full ml-2 shadow-sm">
                {results.clubs.length}
              </span>
            </h2>
            {results.clubs.length === 0 ? (
              <p className="text-muted-foreground font-medium bg-card p-6 rounded-xl border border-dashed text-center">No clubs found for "{debouncedQuery}".</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.clubs.map(club => <ClubCard key={club.id} club={club} />)}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

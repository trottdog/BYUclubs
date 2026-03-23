import { useState } from "react";
import { useGetClubs, useGetCategories } from "@workspace/api-client-react";
import { ClubCard } from "@/components/club-card";
import { cn } from "@/lib/utils";
import { Users, Filter } from "lucide-react";

export default function MyClubsPage() {
  const [tab, setTab] = useState<"my" | "discover">("my");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const { data: clubs, isLoading } = useGetClubs({
    myClubs: tab === "my" ? true : undefined,
    categoryId: tab === "discover" ? (selectedCategoryId || undefined) : undefined,
  });
  
  const { data: categories } = useGetCategories();

  return (
    <div className="w-full flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Clubs</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Connect with students who share your interests.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-card p-1 rounded-lg border shadow-sm w-full sm:w-auto">
          <button
            onClick={() => setTab("my")}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 rounded-md text-sm font-bold transition-all",
              tab === "my" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            My Clubs
          </button>
          <button
            onClick={() => setTab("discover")}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 rounded-md text-sm font-bold transition-all",
              tab === "discover" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Discover
          </button>
        </div>

        {tab === "discover" && (
          <select 
            className="w-full sm:w-auto bg-card border border-border text-foreground text-sm rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-sm"
            value={selectedCategoryId || ""}
            onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">All Categories</option>
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      <div className="min-h-[500px]">
        {isLoading ? (
          <div className="w-full h-64 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {!clubs || clubs.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-card rounded-2xl border border-dashed">
                {tab === "my" ? (
                  <>
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-xl text-foreground">You haven't joined any clubs</p>
                    <p className="text-muted-foreground mt-2 mb-6">Explore the discover tab to find your community.</p>
                    <button 
                      onClick={() => setTab("discover")}
                      className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      Discover Clubs
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Filter className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-xl text-foreground">No clubs found</p>
                    <p className="text-muted-foreground mt-2">Try selecting a different category.</p>
                  </>
                )}
              </div>
            ) : (
              clubs.map((club) => <ClubCard key={club.id} club={club} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

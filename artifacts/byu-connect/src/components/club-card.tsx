import { Link } from "wouter";
import { Club, useJoinClub } from "@workspace/api-client-react";
import { Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function ClubCard({ club }: { club: Club }) {
  const queryClient = useQueryClient();
  
  const joinMutation = useJoinClub({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      }
    }
  });

  return (
    <div className="group flex flex-col bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:shadow-hover hover:border-primary/20 p-6 relative">
      <Link href={`/clubs/${club.id}`} className="absolute inset-0 z-0" />
      
      <div className="flex items-start justify-between mb-5 z-10 relative pointer-events-none">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-sm border-2 border-white"
          style={{ backgroundColor: club.avatarColor, color: '#ffffff' }}
        >
          {club.avatarInitials}
        </div>
        <span 
          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white shadow-sm border border-border/50"
          style={{ color: club.categoryColor }}
        >
          {club.categoryName}
        </span>
      </div>

      <div className="z-10 relative pointer-events-none mb-5 flex-1">
        <h3 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-1">{club.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{club.description}</p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/50 z-10 relative">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>{club.memberCount} <span className="text-muted-foreground font-normal">members</span></span>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); joinMutation.mutate({ id: club.id }); }}
          disabled={joinMutation.isPending}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 pointer-events-auto",
            club.isMember 
              ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive" 
              : "bg-primary text-white shadow-sm hover:shadow-md hover:bg-primary/90"
          )}
        >
          {joinMutation.isPending ? "..." : club.isMember ? "Leave" : "Join"}
        </button>
      </div>
    </div>
  );
}

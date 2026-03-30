import { Link } from "wouter";
import { Club } from "@workspace/api-client-react";
import { Users, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

export function ClubCard({
  club,
  tags = [],
}: {
  club: Club;
  tags?: string[];
}) {
  return (
    <Link href={`/clubs/${club.id}`}>
      <motion.div 
        whileHover={{ y: -2 }}
        className="connect-card border-t-primary group flex flex-col gap-6 bg-white p-8"
      >
        <div className="flex items-start justify-between">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center text-lg font-bold border border-primary text-white bg-primary group-hover:bg-accent group-hover:border-accent transition-colors duration-200"
          >
            {club.avatarInitials}
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="text-primary"
          >
            <ArrowUpRight className="w-5 h-5" />
          </motion.div>
        </div>

        <div>
          <p className="connect-eyebrow mb-2">{club.categoryName.toUpperCase()}</p>
          <h3 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors text-foreground">
            {club.name}
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 border border-border flex items-center justify-center bg-muted">
                <Users className="w-3 h-3 text-primary" />
             </div>
             <span className="text-xs font-medium text-muted-foreground">{club.memberCount} members</span>
          </div>
          <div className="text-xs font-semibold text-primary transition-all">
            View club
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

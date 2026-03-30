import { ReactNode, useEffect, useMemo, useState, useCallback } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Event, Building } from "@workspace/api-client-react";
import { Building2, CalendarClock } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type SidebarMode = "events" | "buildings";

interface MapViewProps {
  events: Event[];
  buildings: Building[];
  filterOverlay?: ReactNode;
}

export function MapView({ events, buildings, filterOverlay }: MapViewProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("events");

  const groupedEvents = useMemo(() => {
    const group: Record<number, Event[]> = {};
    events.forEach((e) => {
      if (!group[e.buildingId]) group[e.buildingId] = [];
      group[e.buildingId].push(e);
    });
    return group;
  }, [events]);

  const activeBuildings = useMemo(
    () => buildings.filter((b) => groupedEvents[b.id] && groupedEvents[b.id].length > 0),
    [buildings, groupedEvents],
  );

  const markersSource = sidebarMode === "events" ? activeBuildings : buildings;

  const selectedBuilding =
    buildings.find((b) => b.id === selectedBuildingId) ??
    activeBuildings.find((b) => b.id === selectedBuildingId) ??
    null;
  const selectedBuildingEvents = selectedBuilding ? groupedEvents[selectedBuilding.id] ?? [] : [];

  const syncSelectionToMode = useCallback(() => {
    if (sidebarMode === "events") {
      if (!activeBuildings.length) {
        setSelectedBuildingId(null);
        return;
      }
      setSelectedBuildingId((id) =>
        id !== null && activeBuildings.some((b) => b.id === id) ? id : activeBuildings[0].id,
      );
      return;
    }
    if (!buildings.length) {
      setSelectedBuildingId(null);
      return;
    }
    setSelectedBuildingId((id) =>
      id !== null && buildings.some((b) => b.id === id) ? id : buildings[0].id,
    );
  }, [sidebarMode, activeBuildings, buildings]);

  useEffect(() => {
    syncSelectionToMode();
  }, [syncSelectionToMode]);

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="relative h-[360px] min-h-0 border-b border-border bg-muted lg:h-full lg:border-b-0 lg:border-r">
        {filterOverlay ? (
          <div className="absolute top-3 right-20 z-10 max-w-[calc(100%-6rem)]">
            {filterOverlay}
          </div>
        ) : null}

        <Map
          initialViewState={{
            longitude: -111.6493,
            latitude: 40.2518,
            zoom: 14.5,
          }}
          mapStyle="https://api.maptiler.com/maps/019ac349-d5ee-795c-85cf-2cc023e13ad5/style.json?key=HalOFfShOFGRip19eGRc"
        >
          <NavigationControl position="top-right" />

          {markersSource.map((building) => {
            const bEvents = groupedEvents[building.id] ?? [];
            const isSelected = building.id === selectedBuildingId;
            const eventCount = bEvents.length;

            return (
              <Marker
                key={`${sidebarMode}-${building.id}`}
                longitude={building.longitude}
                latitude={building.latitude}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedBuildingId(building.id);
                }}
              >
                <button
                  type="button"
                  className="group relative cursor-pointer transition-transform duration-200 hover:scale-105"
                  aria-label={
                    sidebarMode === "events"
                      ? `Show ${eventCount} events at ${building.name}`
                      : `Building ${building.name}`
                  }
                >
                  <div
                    className={`relative flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white px-2 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-all duration-200 ${
                      isSelected
                        ? "bg-foreground text-white"
                        : "bg-white/95 text-foreground group-hover:bg-white"
                    }`}
                  >
                    {sidebarMode === "buildings" ? (
                      <Building2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          isSelected ? "bg-white" : "bg-[#ef476f]"
                        }`}
                      />
                    )}
                  </div>
                  {sidebarMode === "events" && eventCount > 0 ? (
                    <div
                      className={`absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full border-2 border-white px-1.5 py-0.5 text-center text-[10px] font-bold leading-none shadow-sm ${
                        isSelected ? "bg-[#ef476f] text-white" : "bg-slate-900 text-white"
                      }`}
                    >
                      {eventCount}
                    </div>
                  ) : null}
                </button>
              </Marker>
            );
          })}
        </Map>
      </div>

      <aside className="flex h-[320px] min-h-0 flex-col overflow-hidden bg-card lg:h-full">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex gap-1 rounded-lg border-2 border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setSidebarMode("events")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all",
                sidebarMode === "events"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              Events
            </button>
            <button
              type="button"
              onClick={() => setSidebarMode("buildings")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all",
                sidebarMode === "buildings"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              Buildings
            </button>
          </div>
        </div>

        {sidebarMode === "events" ? (
          <>
            <div className="shrink-0 border-b border-border px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Building events
              </p>
              {selectedBuilding ? (
                <div className="mt-3">
                  <h3 className="text-xl font-extrabold text-foreground">{selectedBuilding.name}</h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {selectedBuilding.abbreviation} • {selectedBuilding.address}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <h3 className="text-lg font-bold text-foreground">No buildings with events</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adjust filters or switch to the Buildings tab to browse all locations.
                  </p>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!selectedBuilding ? (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 px-6 text-center">
                  <Building2 className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold text-foreground">Nothing to show yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try the Buildings tab to explore campus locations.
                  </p>
                </div>
              ) : selectedBuildingEvents.length === 0 ? (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 px-6 text-center">
                  <CalendarClock className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold text-foreground">No events in this building</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try another pin or adjust your discover filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedBuildingEvents.map((ev) => (
                    <Link key={ev.id} href={`/events/${ev.id}`} className="block">
                      <div className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-extrabold text-foreground">{ev.title}</p>
                            <p className="mt-1 text-xs font-medium text-muted-foreground">
                              {new Date(ev.startTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              • {ev.clubName}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                            style={{
                              backgroundColor: `${ev.categoryColor}20`,
                              color: ev.categoryColor,
                            }}
                          >
                            {ev.categoryName}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 border-b border-border px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Campus buildings
              </p>
              {selectedBuilding ? (
                <div className="mt-3">
                  <h3 className="text-xl font-extrabold text-foreground">{selectedBuilding.name}</h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {selectedBuilding.abbreviation} • {selectedBuilding.address}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <h3 className="text-lg font-bold text-foreground">Select a building</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tap a pin or choose a location from the list.
                  </p>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {buildings.length === 0 ? (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 px-6 text-center">
                  <p className="font-semibold text-foreground">No buildings match your search</p>
                  <p className="mt-1 text-sm text-muted-foreground">Clear filters on Discover to see more.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {buildings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBuildingId(b.id)}
                      className={cn(
                        "w-full rounded-2xl border-2 bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5",
                        selectedBuildingId === b.id
                          ? "border-primary shadow-sm"
                          : "border-border",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-extrabold text-foreground">{b.name}</p>
                        <span className="shrink-0 rounded-sm bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                          {b.abbreviation}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-relaxed">
                        {b.address}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

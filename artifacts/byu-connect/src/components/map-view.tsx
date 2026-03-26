import { ReactNode, useEffect, useMemo, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Event, Building } from "@workspace/api-client-react";
import { Building2, CalendarClock } from "lucide-react";
import { Link } from "wouter";

interface MapViewProps {
  events: Event[];
  buildings: Building[];
  filterOverlay?: ReactNode;
}

export function MapView({ events, buildings, filterOverlay }: MapViewProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);

  // Group events by building
  const groupedEvents = useMemo(() => {
    const group: Record<number, Event[]> = {};
    events.forEach(e => {
      if (!group[e.buildingId]) group[e.buildingId] = [];
      group[e.buildingId].push(e);
    });
    return group;
  }, [events]);

  const activeBuildings = buildings.filter(b => groupedEvents[b.id] && groupedEvents[b.id].length > 0);
  const selectedBuilding = activeBuildings.find((building) => building.id === selectedBuildingId) ?? null;
  const selectedBuildingEvents = selectedBuilding ? groupedEvents[selectedBuilding.id] ?? [] : [];

  useEffect(() => {
    if (!activeBuildings.length) {
      setSelectedBuildingId(null);
      return;
    }

    if (selectedBuildingId === null || !activeBuildings.some((building) => building.id === selectedBuildingId)) {
      setSelectedBuildingId(activeBuildings[0].id);
    }
  }, [activeBuildings, selectedBuildingId]);

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
            zoom: 14.5
          }}
          mapStyle="https://api.maptiler.com/maps/019ac349-d5ee-795c-85cf-2cc023e13ad5/style.json?key=HalOFfShOFGRip19eGRc"
        >
          <NavigationControl position="top-right" />
          
          {activeBuildings.map((building) => {
            const bEvents = groupedEvents[building.id];
            const isSelected = building.id === selectedBuildingId;

            return (
              <Marker
                key={building.id}
                longitude={building.longitude}
                latitude={building.latitude}
                anchor="bottom"
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  setSelectedBuildingId(building.id);
                }}
              >
                <button
                  type="button"
                  className="group relative cursor-pointer transition-transform duration-200 hover:scale-105"
                  aria-label={`Show ${bEvents.length} events at ${building.name}`}
                >
                  <div
                    className={`relative flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white px-2 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-all duration-200 ${
                      isSelected
                        ? "bg-foreground text-white"
                        : "bg-white/95 text-foreground group-hover:bg-white"
                    }`}
                  >
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        isSelected ? "bg-white" : "bg-[#ef476f]"
                      }`}
                    />
                  </div>
                  <div
                    className={`absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full border-2 border-white px-1.5 py-0.5 text-center text-[10px] font-bold leading-none shadow-sm ${
                      isSelected ? "bg-[#ef476f] text-white" : "bg-slate-900 text-white"
                    }`}
                  >
                    {bEvents.length}
                  </div>
                </button>
              </Marker>
            );
          })}
        </Map>
      </div>

      <aside className="flex h-[320px] min-h-0 flex-col overflow-hidden bg-card lg:h-full">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Building Events
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
              <h3 className="text-lg font-bold text-foreground">Select a pin</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Click a building marker to see the events happening there.
              </p>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!selectedBuilding ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 px-6 text-center">
              <Building2 className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">No building selected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick any solid pin on the map to load its event list here.
              </p>
            </div>
          ) : selectedBuildingEvents.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 px-6 text-center">
              <CalendarClock className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">No events in this building</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try another building or adjust your discover filters.
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
                          {new Date(ev.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {ev.clubName}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                        style={{ backgroundColor: `${ev.categoryColor}20`, color: ev.categoryColor }}
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
      </aside>
    </div>
  );
}

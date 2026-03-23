import { useMemo, useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Event, Building } from "@workspace/api-client-react";
import { MapPin } from "lucide-react";
import { Link } from "wouter";

interface MapViewProps {
  events: Event[];
  buildings: Building[];
}

export function MapView({ events, buildings }: MapViewProps) {
  const [popupInfo, setPopupInfo] = useState<{ building: Building; buildingEvents: Event[] } | null>(null);

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

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm border border-border bg-muted relative">
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
          return (
            <Marker
              key={building.id}
              longitude={building.longitude}
              latitude={building.latitude}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setPopupInfo({ building, buildingEvents: bEvents });
              }}
            >
              <div className="relative cursor-pointer group hover:scale-110 transition-transform duration-200">
                <MapPin className="w-10 h-10 text-primary drop-shadow-md fill-primary/20" />
                <div className="absolute top-1 right-0 translate-x-1/2 -translate-y-1/2 bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border-2 border-white min-w-[20px] text-center">
                  {bEvents.length}
                </div>
              </div>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            anchor="bottom"
            longitude={popupInfo.building.longitude}
            latitude={popupInfo.building.latitude}
            offset={[0, -40]}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="rounded-2xl overflow-hidden"
            maxWidth="300px"
          >
            <div className="p-3">
              <h4 className="font-bold text-base mb-1 text-foreground border-b pb-2">{popupInfo.building.name}</h4>
              <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {popupInfo.buildingEvents.map(ev => (
                  <Link key={ev.id} href={`/events/${ev.id}`} className="block group">
                    <div className="p-2 bg-muted/50 rounded-lg group-hover:bg-primary/5 transition-colors border border-transparent group-hover:border-primary/20">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary line-clamp-1">{ev.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{new Date(ev.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {ev.clubName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

import type { Event, UserProfile } from "@workspace/api-client-react";

const PROFILE_QUERY_KEY = ["/api/users/profile"] as const;

function normalizeSavedEvent(event: Event): Event {
  return {
    ...event,
    isSaved: true,
  };
}

function normalizeReservedEvent(event: Event, reservedCount?: number): Event {
  return {
    ...event,
    isReserved: true,
    reservedCount: reservedCount ?? event.reservedCount,
  };
}

export function getProfileQueryKey() {
  return PROFILE_QUERY_KEY;
}

export function updateProfileAfterSave(
  profile: UserProfile | undefined,
  event: Event,
  saved: boolean,
): UserProfile | undefined {
  if (!profile) return profile;

  const nextSavedEvents = saved
    ? profile.savedEvents.some((savedEvent) => savedEvent.id === event.id)
      ? profile.savedEvents.map((savedEvent) =>
          savedEvent.id === event.id ? normalizeSavedEvent(savedEvent) : savedEvent,
        )
      : [normalizeSavedEvent(event), ...profile.savedEvents]
    : profile.savedEvents.filter((savedEvent) => savedEvent.id !== event.id);

  return {
    ...profile,
    savedEvents: nextSavedEvents,
    savedCount: nextSavedEvents.length,
  };
}

export function updateProfileAfterReservation(
  profile: UserProfile | undefined,
  event: Event,
  reserved: boolean,
  reservedCount?: number,
): UserProfile | undefined {
  if (!profile) return profile;

  const nextReservations = reserved
    ? profile.reservations.some((reservedEvent) => reservedEvent.id === event.id)
      ? profile.reservations.map((reservedEvent) =>
          reservedEvent.id === event.id
            ? normalizeReservedEvent(reservedEvent, reservedCount)
            : reservedEvent,
        )
      : [normalizeReservedEvent(event, reservedCount), ...profile.reservations]
    : profile.reservations.filter((reservedEvent) => reservedEvent.id !== event.id);

  return {
    ...profile,
    reservations: nextReservations,
    reservationsCount: nextReservations.length,
  };
}

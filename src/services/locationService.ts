import { SABAH_LANDMARKS } from '../constants/sabahData';
import { haversineDistanceMeters } from '../engines/domainEngines';
import { SabahLandmark } from '../types/repairbah';

export interface DeviceGpsResult {
  lat: number;
  lng: number;
  accuracyMeters: number;
}

export class GeolocationError extends Error {
  public readonly code:
    | 'INSECURE_CONTEXT'
    | 'UNSUPPORTED'
    | 'PERMISSION_DENIED'
    | 'POSITION_UNAVAILABLE'
    | 'TIMEOUT';

  constructor(
    code:
      | 'INSECURE_CONTEXT'
      | 'UNSUPPORTED'
      | 'PERMISSION_DENIED'
      | 'POSITION_UNAVAILABLE'
      | 'TIMEOUT',
    message: string
  ) {
    super(message);
    this.name = 'GeolocationError';
    this.code = code;
  }
}

function getCurrentPositionPromise(
  options: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function mapPositionError(err: unknown): GeolocationError {
  const geoErr = err as { code?: number; message?: string } | null;
  switch (geoErr?.code) {
    case 1:
      return new GeolocationError(
        'PERMISSION_DENIED',
        'GPS permission denied. Enable location access or drag the Sabah map pin.'
      );
    case 2:
      return new GeolocationError(
        'POSITION_UNAVAILABLE',
        'GPS signal unavailable right now. Drag the map pin or pick a Sabah landmark.'
      );
    case 3:
      return new GeolocationError(
        'TIMEOUT',
        'GPS fix timed out. Drag the map pin or pick a nearby Sabah landmark.'
      );
    default:
      return new GeolocationError(
        'POSITION_UNAVAILABLE',
        geoErr?.message ||
          'Unable to read device GPS. Please position the Sabah map pin manually.'
      );
  }
}

/**
 * Dual-stage device GPS acquisition mirroring Android's DefaultLocationTracker:
 * 1) High-accuracy GNSS fix (8s timeout, 15s maxAge).
 * 2) Automatic fallback to network/Wi-Fi positioning (6s timeout, 60s maxAge) if GNSS times out.
 */
export async function acquireDeviceGpsLocation(): Promise<DeviceGpsResult> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new GeolocationError(
      'INSECURE_CONTEXT',
      'Live GPS requires a secure HTTPS connection.'
    );
  }

  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    throw new GeolocationError(
      'UNSUPPORTED',
      'Geolocation is not supported on this device or browser.'
    );
  }

  try {
    const pos = await getCurrentPositionPromise({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 15000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracyMeters: Math.max(1, Math.round(pos.coords.accuracy || 15)),
    };
  } catch (err) {
    const geoErr = err as { code?: number } | null;
    if (geoErr?.code === 3) {
      try {
        const fallbackPos = await getCurrentPositionPromise({
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 60000,
        });
        return {
          lat: fallbackPos.coords.latitude,
          lng: fallbackPos.coords.longitude,
          accuracyMeters: Math.max(
            1,
            Math.round(fallbackPos.coords.accuracy || 50)
          ),
        };
      } catch (retryErr) {
        throw mapPositionError(retryErr);
      }
    }
    throw mapPositionError(err);
  }
}

export function findNearestSabahLandmark(
  lat: number,
  lng: number
): SabahLandmark {
  let nearest = SABAH_LANDMARKS[0];
  let bestDist = Infinity;
  for (const lm of SABAH_LANDMARKS) {
    const d = haversineDistanceMeters(lat, lng, lm.lat, lm.lng);
    if (d < bestDist) {
      bestDist = d;
      nearest = lm;
    }
  }
  return nearest;
}

/**
 * Reverse geocode Sabah coordinates via Nominatim (3.5s timeout) with
 * offline fallback to the nearest Sabah landmark.
 */
export async function reverseGeocodeSabah(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string> {
  const nearest = findNearestSabahLandmark(lat, lng);
  const offlineFallback = `Pinned: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Near ${
    nearest.name
  })`;

  if (signal?.aborted) {
    return offlineFallback;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}`,
      { signal: controller.signal }
    );
    if (!res.ok) {
      return offlineFallback;
    }
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        road?: string;
        suburb?: string;
        neighbourhood?: string;
        town?: string;
        city?: string;
        village?: string;
      };
    };

    const addr = data.address;
    const road = addr?.road?.trim();
    const locality = (
      addr?.suburb ||
      addr?.neighbourhood ||
      addr?.town ||
      addr?.city ||
      addr?.village ||
      ''
    ).trim();

    const shortLabel =
      road && locality
        ? `${road}, ${locality}`
        : road ||
          locality ||
          data.display_name?.split(',').slice(0, 2).join(', ').trim();

    if (shortLabel) {
      return `Pinned: ${lat.toFixed(4)}, ${lng.toFixed(4)} (${shortLabel})`;
    }
    return offlineFallback;
  } catch {
    return offlineFallback;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

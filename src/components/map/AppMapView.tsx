import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Minus, Plus } from 'lucide-react';
import { getMapboxAccessToken, MAPBOX_DEMO_TOKEN } from '../../config/env';
import { KOLOMBONG_HQ_LAT, KOLOMBONG_HQ_LNG } from '../../constants/sabahData';
import { latLngToMapCoords, mapCoordsToLatLng } from '../../engines/domainEngines';
import { LocationSource, RescueStage } from '../../types/repairbah';

function resolveMapStyle(isLight: boolean): string | mapboxgl.StyleSpecification {
  const token = getMapboxAccessToken();
  const hasRealToken =
    Boolean(token) &&
    token !== MAPBOX_DEMO_TOKEN &&
    !token.includes('demo_sabah_kk');

  if (hasRealToken) {
    return isLight
      ? 'mapbox://styles/mapbox/navigation-day-v1'
      : 'mapbox://styles/mapbox/navigation-night-v1';
  }

  return {
    version: 8,
    sources: {
      'sabah-basemap': {
        type: 'raster',
        tiles: [
          isLight
            ? 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
            : 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: 'sabah-bg',
        type: 'background',
        paint: {
          'background-color': isLight ? '#E2E8F0' : '#090D14',
        },
      },
      {
        id: 'sabah-tiles',
        type: 'raster',
        source: 'sabah-basemap',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  };
}

export interface AppMapViewProps {
  centerX: number;
  centerY: number;
  zoom: number;
  stage?: RescueStage;
  pinLat?: number;
  pinLng?: number;
  locationSource?: LocationSource;
  responderLat?: number;
  responderLng?: number;
  interactive?: boolean;
  showResponder?: boolean;
  responderProgress?: number;
  flyToTrigger?: number;
  onPanUpdate?: (
    newX: number,
    newY: number,
    lat?: number,
    lng?: number
  ) => void;
  onZoomChange?: (newZoom: number) => void;
  isLight: boolean;
}

export const AppMapView: React.FC<AppMapViewProps> = ({
  centerX,
  centerY,
  zoom,
  stage,
  pinLat,
  pinLng,
  locationSource,
  responderLat,
  responderLng,
  interactive = true,
  showResponder = false,
  responderProgress = 0.1,
  flyToTrigger = 0,
  onPanUpdate,
  onZoomChange,
  isLight,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const gpsMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const responderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hqMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const programmaticMoveRef = useRef(false);
  const onPanUpdateRef = useRef(onPanUpdate);
  onPanUpdateRef.current = onPanUpdate;

  const fallbackPinCoords = mapCoordsToLatLng(centerX, centerY);
  const resolvedPinLat = pinLat ?? fallbackPinCoords.lat;
  const resolvedPinLng = pinLng ?? fallbackPinCoords.lng;
  const resolvedRespLat =
    responderLat ??
    KOLOMBONG_HQ_LAT + (resolvedPinLat - KOLOMBONG_HQ_LAT) * responderProgress;
  const resolvedRespLng =
    responderLng ??
    KOLOMBONG_HQ_LNG + (resolvedPinLng - KOLOMBONG_HQ_LNG) * responderProgress;

  const targetCoordsRef = useRef({
    pinLat: resolvedPinLat,
    pinLng: resolvedPinLng,
    respLat: resolvedRespLat,
    respLng: resolvedRespLng,
    responderVisible: showResponder || (stage !== undefined && stage >= 3),
    isGpsLocked: locationSource === 'gps',
  });
  targetCoordsRef.current = {
    pinLat: resolvedPinLat,
    pinLng: resolvedPinLng,
    respLat: resolvedRespLat,
    respLng: resolvedRespLng,
    responderVisible: showResponder || (stage !== undefined && stage >= 3),
    isGpsLocked: locationSource === 'gps',
  };

  const interpRespRef = useRef({
    lat: resolvedRespLat,
    lng: resolvedRespLng,
  });
  const [interpPos, setInterpPos] = useState({
    lat: resolvedRespLat,
    lng: resolvedRespLng,
  });
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [mapboxFallback, setMapboxFallback] = useState(false);
  const lastAppliedIsLightRef = useRef(isLight);

  const toMapboxZoom = (z: number) =>
    Math.max(10.5, Math.min(18, 12.2 + (z - 0.85) * 2.2));

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let isUnmounted = false;
    mapboxgl.accessToken = getMapboxAccessToken();
    lastAppliedIsLightRef.current = isLight;

    let map: mapboxgl.Map | null = null;
    try {
      map = new mapboxgl.Map({
        container,
        style: resolveMapStyle(isLight),
        center: [resolvedPinLng, resolvedPinLat],
        zoom: toMapboxZoom(zoom),
        interactive,
        attributionControl: false,
      });
      mapRef.current = map;

      const hqEl = document.createElement('div');
      hqEl.className =
        'w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-950 shadow-lg';
      hqEl.title = 'Kolombong HQ';
      hqMarkerRef.current = new mapboxgl.Marker({ element: hqEl })
        .setLngLat([KOLOMBONG_HQ_LNG, KOLOMBONG_HQ_LAT])
        .addTo(map);

      const gpsEl = document.createElement('div');
      gpsEl.className = 'relative flex items-center justify-center pointer-events-none';
      gpsEl.innerHTML =
        '<span class="absolute w-7 h-7 rounded-full bg-blue-500/30 animate-ping"></span><span class="relative w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_14px_rgba(59,130,246,0.9)]"></span>';
      const gpsMarker = new mapboxgl.Marker({ element: gpsEl }).setLngLat([
        resolvedPinLng,
        resolvedPinLat,
      ]);
      if (targetCoordsRef.current.isGpsLocked) {
        gpsMarker.addTo(map);
      }
      gpsMarkerRef.current = gpsMarker;

      const respEl = document.createElement('div');
      respEl.className = 'flex flex-col items-center pointer-events-none';
      respEl.innerHTML =
        '<span class="px-1.5 py-0.5 rounded bg-blue-950/90 border border-blue-400/60 text-[10px] font-black text-blue-300 whitespace-nowrap mb-1">KK-204 ROY</span><div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-[0_0_16px_rgba(37,99,235,0.85)]"></div>';
      const respMarker = new mapboxgl.Marker({ element: respEl }).setLngLat([
        resolvedRespLng,
        resolvedRespLat,
      ]);
      if (targetCoordsRef.current.responderVisible) {
        respMarker.addTo(map);
      }
      responderMarkerRef.current = respMarker;

      const ensureRouteLayer = () => {
        if (isUnmounted || !map || mapRef.current !== map || !map.isStyleLoaded()) {
          return;
        }
        try {
          if (!map.getSource('rescue-route')) {
            map.addSource('rescue-route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [KOLOMBONG_HQ_LNG, KOLOMBONG_HQ_LAT],
                    [resolvedPinLng, resolvedPinLat],
                  ],
                },
              },
            });
          }
          if (!map.getLayer('rescue-route-line')) {
            map.addLayer({
              id: 'rescue-route-line',
              type: 'line',
              source: 'rescue-route',
              paint: {
                'line-color': '#EF4444',
                'line-width': 4,
                'line-dasharray': [2, 2],
              },
            });
          }
        } catch {
          // Ignore transient style-switching errors
        }
      };

      map.on('load', () => {
        if (isUnmounted || mapRef.current !== map) return;
        setStyleLoaded(true);
        setMapboxFallback(false);
        ensureRouteLayer();
      });

      map.on('style.load', () => {
        if (isUnmounted || mapRef.current !== map) return;
        setStyleLoaded(true);
        ensureRouteLayer();
      });

      map.on('error', () => {
        if (isUnmounted) return;
        setMapboxFallback(true);
      });

      map.on('moveend', () => {
        if (isUnmounted) return;
        if (programmaticMoveRef.current) {
          programmaticMoveRef.current = false;
          return;
        }
        if (!interactive || !map || !onPanUpdateRef.current) return;
        const c = map.getCenter();
        const clampedLat = Math.max(4.0, Math.min(7.2, c.lat));
        const clampedLng = Math.max(115.0, Math.min(119.5, c.lng));
        const coords = latLngToMapCoords(clampedLat, clampedLng);
        onPanUpdateRef.current(
          coords.mapX,
          coords.mapY,
          Number(clampedLat.toFixed(5)),
          Number(clampedLng.toFixed(5))
        );
      });
    } catch {
      setMapboxFallback(true);
    }

    return () => {
      isUnmounted = true;
      gpsMarkerRef.current?.remove();
      responderMarkerRef.current?.remove();
      hqMarkerRef.current?.remove();
      try {
        map?.remove();
      } catch {
        // Ignore teardown race in WebGL/Mapbox
      }
      mapRef.current = null;
      gpsMarkerRef.current = null;
      responderMarkerRef.current = null;
      hqMarkerRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || lastAppliedIsLightRef.current === isLight) return;
    lastAppliedIsLightRef.current = isLight;

    const applyStyle = () => {
      if (!mapRef.current || mapRef.current !== map) return;
      try {
        setStyleLoaded(false);
        map.setStyle(resolveMapStyle(isLight));
      } catch {
        setMapboxFallback(true);
      }
    };

    if (map.isStyleLoaded()) {
      applyStyle();
    } else {
      map.once('style.load', applyStyle);
      return () => {
        map.off('style.load', applyStyle);
      };
    }
  }, [isLight]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const targetZoom = toMapboxZoom(zoom);
    programmaticMoveRef.current = true;
    try {
      if (flyToTrigger > 0) {
        map.flyTo({
          center: [resolvedPinLng, resolvedPinLat],
          zoom: targetZoom,
          duration: 850,
        });
      } else {
        map.easeTo({
          center: [resolvedPinLng, resolvedPinLat],
          zoom: targetZoom,
          duration: 280,
        });
      }
    } catch {
      programmaticMoveRef.current = false;
    }
  }, [resolvedPinLat, resolvedPinLng, zoom, flyToTrigger]);

  useEffect(() => {
    let frameId = 0;
    let lastNow = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      const targets = targetCoordsRef.current;
      const lerpAlpha = Math.min(1, dt * 10);

      interpRespRef.current.lat +=
        (targets.respLat - interpRespRef.current.lat) * lerpAlpha;
      interpRespRef.current.lng +=
        (targets.respLng - interpRespRef.current.lng) * lerpAlpha;

      const curLat = interpRespRef.current.lat;
      const curLng = interpRespRef.current.lng;

      const map = mapRef.current;
      const gpsMarker = gpsMarkerRef.current;
      if (map && gpsMarker) {
        gpsMarker.setLngLat([targets.pinLng, targets.pinLat]);
        const gpsAttached = Boolean(gpsMarker.getElement().parentElement);
        if (targets.isGpsLocked && !gpsAttached) {
          gpsMarker.addTo(map);
        } else if (!targets.isGpsLocked && gpsAttached) {
          gpsMarker.remove();
        }
      }

      const respMarker = responderMarkerRef.current;
      if (map && respMarker) {
        respMarker.setLngLat([curLng, curLat]);
        const isAttached = Boolean(respMarker.getElement().parentElement);
        if (targets.responderVisible && !isAttached) {
          respMarker.addTo(map);
        } else if (!targets.responderVisible && isAttached) {
          respMarker.remove();
        }
        if (styleLoaded && map.isStyleLoaded()) {
          try {
            const routeSrc = map.getSource('rescue-route') as
              | mapboxgl.GeoJSONSource
              | undefined;
            if (routeSrc) {
              routeSrc.setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: targets.responderVisible
                    ? [
                        [KOLOMBONG_HQ_LNG, KOLOMBONG_HQ_LAT],
                        [curLng, curLat],
                        [targets.pinLng, targets.pinLat],
                      ]
                    : [
                        [KOLOMBONG_HQ_LNG, KOLOMBONG_HQ_LAT],
                        [targets.pinLng, targets.pinLat],
                      ],
                },
              });
            }
          } catch {
            // Ignore transient style updates
          }
        }
      }

      if (mapboxFallback) {
        setInterpPos({ lat: curLat, lng: curLng });
      }

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [styleLoaded, mapboxFallback]);

  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const handleFallbackPointerDown = (e: React.PointerEvent) => {
    if (!mapboxFallback || !interactive) return;
    draggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handleFallbackPointerMove = (e: React.PointerEvent) => {
    if (!mapboxFallback || !interactive || !draggingRef.current || !onPanUpdate)
      return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    const nextX = Math.max(40, Math.min(960, centerX - dx / zoom));
    const nextY = Math.max(40, Math.min(960, centerY - dy / zoom));
    onPanUpdate(nextX, nextY);
  };
  const handleFallbackPointerUp = () => {
    draggingRef.current = false;
  };

  const interpMapPos = latLngToMapCoords(interpPos.lat, interpPos.lng);
  const showResp = showResponder || (stage !== undefined && stage >= 3);

  return (
    <div
      onPointerDown={handleFallbackPointerDown}
      onPointerMove={handleFallbackPointerMove}
      onPointerUp={handleFallbackPointerUp}
      onPointerCancel={handleFallbackPointerUp}
      className={`relative w-full h-full overflow-hidden select-none touch-none ${
        interactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isLight ? 'bg-[#E2E8F0]' : 'bg-[#090D14]'}`}
    >
      {mapboxFallback && (
        <div
          className={`absolute inset-0 pointer-events-none ${
            isLight
              ? 'bg-[radial-gradient(circle_at_30%_30%,#E0F2FE_0%,#E2E8F0_60%,#CBD5E1_100%)]'
              : 'bg-[radial-gradient(circle_at_30%_30%,#0B192C_0%,#090D14_65%,#05070B_100%)]'
          }`}
        >
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: isLight
                ? 'linear-gradient(#94A3B8 1px, transparent 1px), linear-gradient(90deg, #94A3B8 1px, transparent 1px)'
                : 'linear-gradient(#1E293B 1px, transparent 1px), linear-gradient(90deg, #1E293B 1px, transparent 1px)',
              backgroundSize: `${Math.round(36 * zoom)}px ${Math.round(36 * zoom)}px`,
            }}
          />
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] font-mono text-gray-300">
            Mapbox {isLight ? 'Day' : 'Night'} • {resolvedPinLat.toFixed(4)},{' '}
            {resolvedPinLng.toFixed(4)}
          </div>
          {showResp && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-none"
              style={{
                left: `${Math.max(
                  12,
                  Math.min(88, 50 + (interpMapPos.mapX - centerX) * 0.25)
                )}%`,
                top: `${Math.max(
                  12,
                  Math.min(88, 50 + (interpMapPos.mapY - centerY) * 0.25)
                )}%`,
              }}
            >
              <span className="px-1.5 py-0.5 rounded bg-blue-950/90 border border-blue-400/60 text-[10px] font-black text-blue-300 whitespace-nowrap mb-1">
                KK-204 ROY
              </span>
              <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-[0_0_16px_rgba(37,99,235,0.85)]" />
            </div>
          )}
        </div>
      )}

      <div
        ref={mapContainerRef}
        className={`w-full h-full ${
          mapboxFallback ? 'opacity-20 pointer-events-none' : 'opacity-100'
        }`}
      />

      {mapboxFallback && locationSource === 'gps' && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10">
          <span className="absolute w-7 h-7 rounded-full bg-blue-500/30 animate-ping" />
          <span className="relative w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_14px_rgba(59,130,246,0.9)]" />
        </div>
      )}

      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center z-10">
        <div className="relative flex flex-col items-center animate-bounce">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-white shadow-[0_8px_24px_rgba(220,38,38,0.65)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white" />
          </div>
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-red-700 -mt-1" />
        </div>
        <div className="w-5 h-1.5 rounded-full bg-black/60 blur-[1.5px] mt-0.5" />
      </div>

      {interactive && onZoomChange && (
        <div className="absolute right-3 top-16 flex flex-col gap-2 z-10">
          <button
            onClick={() =>
              onZoomChange(Math.min(2.2, Number((zoom + 0.25).toFixed(2))))
            }
            aria-label="Zoom in"
            className={`w-10 h-10 rounded-full border shadow-lg flex items-center justify-center ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-[#141923]/90 border-[#282C37] text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              onZoomChange(Math.max(0.85, Number((zoom - 0.25).toFixed(2))))
            }
            aria-label="Zoom out"
            className={`w-10 h-10 rounded-full border shadow-lg flex items-center justify-center ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-[#141923]/90 border-[#282C37] text-white'
            }`}
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

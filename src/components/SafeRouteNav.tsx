import React, { useState, useEffect, useRef, useMemo } from "react";
import L from "../utils/initLeaflet";
import { 
  Navigation, ShieldCheck, AlertTriangle, MapPin, 
  Sparkles, Compass, Info, Route, Car, Bike, Footprints, Activity,
  Search, X, Check, ArrowRight, RotateCcw, AlertOctagon, CheckCircle2,
  ChevronRight, SlidersHorizontal, Home, GraduationCap, Briefcase, Clock,
  Eye, CornerDownRight, Play, Square, RefreshCw, Crosshair
} from "lucide-react";
import { Report, SafeRouteOption } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { calculateHaversineDistanceMeters } from "../services/spatialClustering";
import { 
  searchLocationSuggestions, 
  fetchOsrmRoutes, 
  analyzeRoutesWithHazards, 
  LocationSuggestion,
  RoutePreferences,
  DEFAULT_PREFERENCES,
  CANONICAL_LANDMARKS
} from "../services/safeRouteService";

interface SafeRouteNavProps {
  reports: Report[];
}

const STORAGE_KEY_RECENT = "UP_RECENT_DESTINATIONS";
const STORAGE_KEY_MAP_TYPE = "UP_SAFE_ROUTE_MAP_TYPE";

export default function SafeRouteNav({ reports }: SafeRouteNavProps) {
  const { t, isHindi } = useLanguage();

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayersRef = useRef<{ [routeId: string]: L.Polyline }>({});
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const hazardMarkersRef = useRef<{ [hazardKey: string]: L.Marker }>({});
  const activeNavMarkerRef = useRef<L.Marker | null>(null);
  const zoneLayersRef = useRef<L.Layer[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const lastCenteredCoordRef = useRef<[number, number] | null>(null);

  // Map basemap type: Road (default) vs Satellite
  const [mapType, setMapType] = useState<"road" | "satellite">(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAP_TYPE);
      if (saved === "satellite" || saved === "road") return saved;
    } catch {}
    return "road";
  });
  const [mapReady, setMapReady] = useState(false);

  // Origin & Destination State
  const [originStr, setOriginStr] = useState("My Current Location");
  const [destinationStr, setDestinationStr] = useState("");
  const [originCoord, setOriginCoord] = useState<[number, number] | null>(null);
  const [destCoord, setDestCoord] = useState<[number, number] | null>(null);
  const [originAccuracy, setOriginAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Live GPS Tracking State (Authoritative real-time coordinates)
  const [currentGpsCoord, setCurrentGpsCoord] = useState<[number, number] | null>(null);
  const [currentGpsAccuracy, setCurrentGpsAccuracy] = useState<number | null>(null);
  const [gpsUnavailable, setGpsUnavailable] = useState(false);

  // Authoritative user location (Live GPS when available, otherwise origin coordinate)
  const authoritativeUserPos = useMemo<[number, number] | null>(() => {
    return currentGpsCoord || originCoord;
  }, [currentGpsCoord, originCoord]);

  // Autocomplete Suggestions State
  const [originSuggestions, setOriginSuggestions] = useState<LocationSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<LocationSuggestion[]>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  // Travel Mode & Route Preferences
  const [selectedTravelMode, setSelectedTravelMode] = useState<"car" | "bike" | "walk">("car");
  const [preferences, setPreferences] = useState<RoutePreferences>(DEFAULT_PREFERENCES);
  const [showPreferences, setShowPreferences] = useState(false);

  // Computed Routes State
  const [computedRoutes, setComputedRoutes] = useState<SafeRouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [calculating, setCalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Navigation State (No fake simulated progress)
  const [isNavigating, setIsNavigating] = useState(false);
  const [showRerouteBanner, setShowRerouteBanner] = useState(false);
  const [highlightedHazardId, setHighlightedHazardId] = useState<string | null>(null);

  // Recent Searches State
  const [recentDestinations, setRecentDestinations] = useState<Array<{ label: string; lat: number; lng: number }>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RECENT);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { label: "Knowledge Park III, Greater Noida", lat: 28.4608, lng: 77.4631 },
      { label: "NIET Institute of Engineering, Greater Noida", lat: 28.4635, lng: 77.4885 },
      { label: "Connaught Place (CP), New Delhi", lat: 28.6315, lng: 77.2167 }
    ];
  });

  // Current Selected Route
  const currentRoute = useMemo(() => {
    return computedRoutes.find(r => r.id === selectedRouteId) || computedRoutes[0] || null;
  }, [computedRoutes, selectedRouteId]);

  // Alternative route for rerouting comparison
  const alternativeRoute = useMemo(() => {
    if (!currentRoute) return null;
    return computedRoutes.find(r => r.id !== currentRoute.id) || null;
  }, [computedRoutes, currentRoute]);

  // Save to recent destinations
  const saveRecentDestination = (label: string, lat: number, lng: number) => {
    setRecentDestinations(prev => {
      const filtered = prev.filter(p => p.label.toLowerCase() !== label.toLowerCase());
      const updated = [{ label, lat, lng }, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearRecentHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_RECENT);
    } catch {}
    setRecentDestinations([]);
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.4608, 77.4631], // Default: Knowledge Park III / NCR
      zoom: 13,
      zoomControl: false
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    // Trigger initial geolocation check
    requestCurrentLocation();

    return () => {
      setMapReady(false);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 1b. Manage Dynamic Basemap Layer (Road vs Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Clean up existing basemap layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    // Clean up existing labels layer
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    if (mapType === "road") {
      const roadLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      roadLayer.addTo(map);
      roadLayer.bringToBack();
      tileLayerRef.current = roadLayer;
    } else {
      const satUrl = (import.meta as any).env?.VITE_SATELLITE_TILE_URL || "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      const satLayer = L.tileLayer(satUrl, {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      });
      satLayer.addTo(map);
      satLayer.bringToBack();
      tileLayerRef.current = satLayer;

      // Add high-resolution reference labels overlay for roads & landmarks on top of satellite
      const labelsLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19
      });
      labelsLayer.addTo(map);
      labelsLayerRef.current = labelsLayer;
    }
  }, [mapType, mapReady]);

  // Map layer toggle handler
  const handleToggleMapType = (type: "road" | "satellite") => {
    setMapType(type);
    try {
      localStorage.setItem(STORAGE_KEY_MAP_TYPE, type);
    } catch {}
  };

  // 2. Geolocation Request
  const requestCurrentLocation = () => {
    setIsLocatingGps(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setIsLocatingGps(false);
      // Fallback to Knowledge Park / Delhi reference point without pretending it's GPS
      setOriginStr("Pari Chowk, Greater Noida (Manual Selection)");
      setOriginCoord([28.4764, 77.5037]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 15;
        setOriginCoord([lat, lng]);
        setOriginAccuracy(acc);
        setOriginStr("Current Location");
        setIsLocatingGps(false);
        setGpsError(null);

        if (mapInstanceRef.current && !destCoord) {
          mapInstanceRef.current.setView([lat, lng], 14);
        }
      },
      (err) => {
        setIsLocatingGps(false);
        setGpsError("Location permission denied. Please enter your starting point manually above.");
        // Set an explicit starting fallback landmark so the user is never stuck
        if (!originCoord) {
          setOriginStr("Pari Chowk, Greater Noida");
          setOriginCoord([28.4764, 77.5037]);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  // 3. Autocomplete Search Handler for Destination
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (destinationStr.trim().length >= 2) {
        setIsSearchingDest(true);
        const results = await searchLocationSuggestions(destinationStr, reports);
        setDestSuggestions(results);
        setIsSearchingDest(false);
      } else {
        setDestSuggestions([]);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [destinationStr, reports]);

  // Autocomplete Search Handler for Origin (when manual origin is typed)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (originStr.trim().length >= 2 && originStr !== "Current Location") {
        const results = await searchLocationSuggestions(originStr, reports);
        setOriginSuggestions(results);
      } else {
        setOriginSuggestions([]);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [originStr, reports]);

  // Handle selecting a destination suggestion
  const handleSelectDestination = (sug: LocationSuggestion) => {
    setDestinationStr(sug.label);
    setDestCoord([sug.lat, sug.lng]);
    setShowDestDropdown(false);
    saveRecentDestination(sug.label, sug.lat, sug.lng);
  };

  // Handle selecting an origin suggestion
  const handleSelectOrigin = (sug: LocationSuggestion) => {
    setOriginStr(sug.label);
    setOriginCoord([sug.lat, sug.lng]);
    setOriginAccuracy(null);
    setShowOriginDropdown(false);
  };

  // Quick Select Saved Place
  const handleQuickSelectPlace = (place: { label: string; lat: number; lng: number }) => {
    setDestinationStr(place.label);
    setDestCoord([place.lat, place.lng]);
    saveRecentDestination(place.label, place.lat, place.lng);
  };

  // 4. Calculate Route Function
  const handleCalculateRoute = async () => {
    if (!destinationStr.trim()) {
      setErrorMessage("Please enter a destination to calculate a safe route.");
      return;
    }

    setCalculating(true);
    setErrorMessage(null);
    setIsNavigating(false);
    setShowRerouteBanner(false);

    // Resolve Origin coordinates if needed
    let orig = originCoord;
    if (!orig) {
      if (originStr === "Current Location") {
        requestCurrentLocation();
        setCalculating(false);
        return;
      }
      const resolvedOrigin = await searchLocationSuggestions(originStr, reports);
      if (resolvedOrigin.length > 0) {
        orig = [resolvedOrigin[0].lat, resolvedOrigin[0].lng];
        setOriginCoord(orig);
      } else {
        setErrorMessage("Starting location not found. Please select a valid origin suggestion.");
        setCalculating(false);
        return;
      }
    }

    // Resolve Destination coordinates if needed
    let dest = destCoord;
    if (!dest) {
      const resolvedDest = await searchLocationSuggestions(destinationStr, reports);
      if (resolvedDest.length > 0) {
        dest = [resolvedDest[0].lat, resolvedDest[0].lng];
        setDestCoord(dest);
        setDestinationStr(resolvedDest[0].label);
        saveRecentDestination(resolvedDest[0].label, dest[0], dest[1]);
      } else {
        setErrorMessage("Destination location not found. Try selecting one of the suggested places.");
        setCalculating(false);
        return;
      }
    }

    try {
      // 1. Query the existing OSRM routing provider with real coordinates and travel mode
      const rawRoutes = await fetchOsrmRoutes(orig, dest, selectedTravelMode);

      // 2. Perform hazard analysis against actual UrbanPulse reports
      const analyzedRoutes = analyzeRoutesWithHazards(
        rawRoutes, 
        reports, 
        selectedTravelMode, 
        preferences
      );

      setComputedRoutes(analyzedRoutes);
      setSelectedRouteId(analyzedRoutes[0]?.id || "");

      // If top route has high severity hazards, prepare reroute suggestion
      if (analyzedRoutes[0]?.hazardsOnRoute.length > 0 && analyzedRoutes.length > 1) {
        setShowRerouteBanner(true);
      }
    } catch (err: any) {
      console.error("Routing error:", err);
      setErrorMessage(err.message || "Unable to calculate route. Please try again or select another destination.");
      setComputedRoutes([]);
    } finally {
      setCalculating(false);
    }
  };

  // Recalculate routes when travel mode or preferences change
  useEffect(() => {
    if (originCoord && destCoord && destinationStr) {
      handleCalculateRoute();
    }
  }, [selectedTravelMode, preferences.preferFastest, preferences.preferSafer, preferences.avoidHighRisk]);

  // 5. Draw Markers (Authoritative User Location & Destination)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const createPin = (color: string, label: string, isPulsing: boolean = false) => L.divIcon({
      className: "custom-pin",
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          ${isPulsing ? `
            <div style="position: absolute; top: -6px; width: 34px; height: 34px; background: rgba(37,99,235,0.35); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          ` : ''}
          <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 2;">
            <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
          </div>
          <span style="background: white; color: #1E293B; font-family: sans-serif; font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 4px; border: 1px solid #CBD5E1; margin-top: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); white-space: nowrap; z-index: 2;">
            ${label}
          </span>
        </div>
      `,
      iconSize: [30, 42],
      iconAnchor: [15, 26]
    });

    // Authoritative User GPS marker (🔵 User / Current GPS Position)
    if (authoritativeUserPos) {
      const userLabel = isNavigating ? "LIVE GPS" : "START / YOU";
      if (!originMarkerRef.current) {
        originMarkerRef.current = L.marker(authoritativeUserPos, { 
          icon: createPin("#2563EB", userLabel, isNavigating) 
        }).addTo(map);
      } else {
        originMarkerRef.current.setLatLng(authoritativeUserPos);
        originMarkerRef.current.setIcon(createPin("#2563EB", userLabel, isNavigating));
      }
    } else if (originMarkerRef.current) {
      map.removeLayer(originMarkerRef.current);
      originMarkerRef.current = null;
    }

    // Destination Marker (🔴 Destination)
    if (destCoord) {
      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker(destCoord, { 
          icon: createPin("#DC2626", "DESTINATION") 
        }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng(destCoord);
      }
    } else if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
  }, [authoritativeUserPos, destCoord, isNavigating]);

  // 6. Draw Routes & Hazard Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous route polylines
    Object.values(routeLayersRef.current).forEach(layer => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    routeLayersRef.current = {};

    // Clear previous hazard markers
    Object.values(hazardMarkersRef.current).forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    hazardMarkersRef.current = {};

    // Clear previous risk zones and safe segments
    zoneLayersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    zoneLayersRef.current = [];

    if (computedRoutes.length === 0) return;

    // Draw unselected routes first (background)
    computedRoutes.forEach(route => {
      const isSelected = route.id === selectedRouteId;
      if (!isSelected) {
        const polyline = L.polyline(route.pathCoordinates, {
          color: "#94A3B8",
          weight: 4,
          opacity: 0.55,
          dashArray: "6, 8"
        }).addTo(map);
        routeLayersRef.current[route.id] = polyline;
      }
    });

    // Draw selected route (prominent foreground)
    const selected = computedRoutes.find(r => r.id === selectedRouteId) || computedRoutes[0];
    if (selected) {
      // 1. Draw 🟢 Safe route segments underlay (segments with no close hazards)
      const safePolyline = L.polyline(selected.pathCoordinates, {
        color: "#10B981", // 🟢 Safe route segments
        weight: 8,
        opacity: 0.4
      }).addTo(map);
      zoneLayersRef.current.push(safePolyline);

      // 2. Draw 🟦 Selected route
      const polyline = L.polyline(selected.pathCoordinates, {
        color: "#2563EB", // 🟦 Selected route
        weight: 5,
        opacity: 0.95
      }).addTo(map);
      routeLayersRef.current[selected.id] = polyline;

      // Fit map bounds to show full route comfortably
      try {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      } catch {}

      // 3. Draw 🟠 High-risk zones & ⚠ Hazard markers along selected route
      selected.hazardsOnRoute.forEach(hazard => {
        const isCritical = (hazard.severity || 0) >= 80 || (hazard.type || "").toUpperCase().includes("SOS");
        const isHigh = (hazard.severity || 0) >= 50;
        const color = isCritical ? "#DC2626" : isHigh ? "#EA580C" : "#D97706";

        // Draw 🟠 High-risk buffer zone circle around severe hazards
        if (isHigh || isCritical) {
          const riskCircle = L.circle([hazard.lat, hazard.lng], {
            radius: 80,
            color: "#EA580C",
            fillColor: "#F97316",
            fillOpacity: 0.25,
            weight: 1.5,
            dashArray: "4, 4"
          }).addTo(map);
          zoneLayersRef.current.push(riskCircle);
        }

        const hazardIcon = L.divIcon({
          className: "custom-hazard-marker",
          html: `
            <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 8px ${color}88, 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 11px;">
              ⚠
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([hazard.lat, hazard.lng], { icon: hazardIcon })
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 11px; max-width: 220px; color: #1E293B; line-height: 1.4;">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <span style="background: ${color}20; color: ${color}; font-weight: 800; font-size: 9px; padding: 1px 5px; border-radius: 4px; text-transform: uppercase;">
                  ⚠ ${hazard.type}
                </span>
                <span style="font-size: 9px; color: #64748B;">• Severity ${hazard.severity}/100</span>
              </div>
              <strong style="font-size: 12px; display: block; margin-bottom: 2px;">${hazard.description}</strong>
              <div style="color: #64748B; font-size: 10px; margin-top: 4px; border-top: 1px solid #E2E8F0; padding-top: 4px;">
                <span>Distance ahead: <strong>${((hazard.distanceAlongRouteMeters || 0) / 1000).toFixed(1)} km</strong></span><br/>
                <span>Offset from route: <strong>${hazard.distanceFromRouteMeters || 0} m</strong></span><br/>
                <span>Status: <strong>${hazard.status || "Pending"}</strong></span>
              </div>
            </div>
          `)
          .addTo(map);

        const key = `${hazard.lat}_${hazard.lng}`;
        hazardMarkersRef.current[key] = marker;
      });
    }
  }, [computedRoutes, selectedRouteId]);

  // 7. Live GPS Navigation Engine (Strictly authoritative, real-time device coordinates)
  const handleStartNavigation = () => {
    if (!currentRoute) return;

    setIsNavigating(true);
    setGpsUnavailable(false);

    if (!navigator.geolocation) {
      setGpsUnavailable(true);
      return;
    }

    setIsLocatingGps(true);

    // 1. Request current geolocation immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
        setCurrentGpsCoord([lat, lng]);
        setCurrentGpsAccuracy(acc);
        setIsLocatingGps(false);
        setGpsUnavailable(false);

        // Center map once on starting GPS position
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
          lastCenteredCoordRef.current = [lat, lng];
        }
      },
      (err) => {
        console.warn("GPS acquire notice:", err);
        setIsLocatingGps(false);
        if (!currentGpsCoord && !originCoord) {
          setGpsUnavailable(true);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    // 2. Clear existing watch if active
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // 3. Start live watchPosition
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
          setCurrentGpsCoord([lat, lng]);
          setCurrentGpsAccuracy(acc);
          setGpsUnavailable(false);

          // Auto-center ONLY when user has physically moved significantly (> 100m)
          if (mapInstanceRef.current) {
            const last = lastCenteredCoordRef.current;
            if (!last) {
              mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
              lastCenteredCoordRef.current = [lat, lng];
            } else {
              const movedDist = calculateHaversineDistanceMeters(last[0], last[1], lat, lng);
              if (movedDist > 100) {
                mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
                lastCenteredCoordRef.current = [lat, lng];
              }
            }
          }
        },
        (err) => {
          console.warn("Live watchPosition error:", err);
          setGpsUnavailable(true);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    } catch (e) {
      console.error("Failed to start watchPosition:", e);
      setGpsUnavailable(true);
    }
  };

  const handleStopNavigation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsNavigating(false);
    setIsLocatingGps(false);
  };

  // Explicit user map centering on their authoritative GPS position
  const handleCenterOnMe = () => {
    if (mapInstanceRef.current && authoritativeUserPos) {
      mapInstanceRef.current.setView(authoritativeUserPos, 16, { animate: true });
      lastCenteredCoordRef.current = authoritativeUserPos;
    }
  };

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Compute Route Progress from Real User Coordinates (No artificial timer decrements)
  const navProgress = useMemo(() => {
    if (!currentRoute || currentRoute.pathCoordinates.length === 0 || !authoritativeUserPos) {
      return {
        nearestStepIndex: 0,
        currentStep: 1,
        totalSteps: currentRoute?.pathCoordinates.length || 0,
        remainingKm: currentRoute?.distanceKm || 0,
        remainingMinutes: currentRoute?.durationMinutes || 0
      };
    }

    const coords = currentRoute.pathCoordinates;
    const [userLat, userLng] = authoritativeUserPos;

    let nearestIndex = 0;
    let minDistanceMeters = Infinity;

    for (let i = 0; i < coords.length; i++) {
      const dist = calculateHaversineDistanceMeters(userLat, userLng, coords[i][0], coords[i][1]);
      if (dist < minDistanceMeters) {
        minDistanceMeters = dist;
        nearestIndex = i;
      }
    }

    // Calculate real remaining distance along path from nearest route step to destination
    let remainingMeters = minDistanceMeters;
    for (let i = nearestIndex; i < coords.length - 1; i++) {
      remainingMeters += calculateHaversineDistanceMeters(
        coords[i][0], coords[i][1],
        coords[i + 1][0], coords[i + 1][1]
      );
    }

    const remainingKm = Number((remainingMeters / 1000).toFixed(1));
    const remainingMinutes = currentRoute.distanceKm > 0
      ? Math.max(1, Math.round((remainingMeters / (currentRoute.distanceKm * 1000)) * currentRoute.durationMinutes))
      : currentRoute.durationMinutes;

    return {
      nearestStepIndex: nearestIndex,
      currentStep: nearestIndex + 1,
      totalSteps: coords.length,
      remainingKm,
      remainingMinutes
    };
  }, [currentRoute, authoritativeUserPos]);

  // Compute Nearest Active Hazard from Authoritative Real GPS Coordinates (Not simulated)
  const nextHazardInfo = useMemo(() => {
    if (!currentRoute || currentRoute.hazardsOnRoute.length === 0 || !authoritativeUserPos) return null;

    const [uLat, uLng] = authoritativeUserPos;
    let closestHazard = currentRoute.hazardsOnRoute[0];
    let minHazardMeters = calculateHaversineDistanceMeters(uLat, uLng, closestHazard.lat, closestHazard.lng);

    for (let i = 1; i < currentRoute.hazardsOnRoute.length; i++) {
      const h = currentRoute.hazardsOnRoute[i];
      const dist = calculateHaversineDistanceMeters(uLat, uLng, h.lat, h.lng);
      if (dist < minHazardMeters) {
        minHazardMeters = dist;
        closestHazard = h;
      }
    }

    return {
      hazard: closestHazard,
      distanceKm: (minHazardMeters / 1000).toFixed(1),
      distanceMeters: Math.round(minHazardMeters)
    };
  }, [currentRoute, authoritativeUserPos]);

  // Focus on specific hazard from the hazard list
  const handleFocusHazard = (hazard: SafeRouteOption["hazardsOnRoute"][0]) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setHighlightedHazardId(hazard.id || `${hazard.lat}_${hazard.lng}`);

    map.setView([hazard.lat, hazard.lng], 16, { animate: true });
    const key = `${hazard.lat}_${hazard.lng}`;
    const marker = hazardMarkersRef.current[key];
    if (marker) {
      marker.openPopup();
    }
  };

  // Switch to alternative route when rerouting is accepted
  const handleApplyReroute = () => {
    if (alternativeRoute) {
      setSelectedRouteId(alternativeRoute.id);
      setShowRerouteBanner(false);
    }
  };

  // Backward-compatible reference for next hazard
  const nextHazardAhead = useMemo(() => {
    return nextHazardInfo?.hazard || null;
  }, [nextHazardInfo]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 text-left">
      
      {/* Top Engine Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl p-5 md:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight font-sans">
                  SAFE ROUTE NAVIGATION
                </h1>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                  Hazard-Aware
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Evaluates active road craters, structural fissures, and verified civic hazards from UrbanPulse live feeds to compute hazard-minimized commuter corridors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-auto">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-300" />
              <span>Preferences</span>
            </button>
            <button
              onClick={requestCurrentLocation}
              disabled={isLocatingGps}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Compass className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
              <span>{isLocatingGps ? "Acquiring GPS..." : "GPS Sync"}</span>
            </button>
          </div>
        </div>

        {/* Route Preferences Dropdown Panel */}
        {showPreferences && (
          <div className="mt-4 pt-4 border-t border-indigo-900/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-fadeIn">
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 p-2 rounded-xl border border-white/5 hover:bg-white/10 transition">
              <input
                type="checkbox"
                checked={preferences.avoidHighRisk}
                onChange={e => setPreferences(p => ({ ...p, avoidHighRisk: e.target.checked }))}
                className="rounded accent-indigo-500"
              />
              <span>Avoid high-risk roads</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 p-2 rounded-xl border border-white/5 hover:bg-white/10 transition">
              <input
                type="checkbox"
                checked={preferences.avoidIncidents}
                onChange={e => setPreferences(p => ({ ...p, avoidIncidents: e.target.checked }))}
                className="rounded accent-indigo-500"
              />
              <span>Avoid active incidents</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 p-2 rounded-xl border border-white/5 hover:bg-white/10 transition">
              <input
                type="checkbox"
                checked={preferences.avoidWaterlogging}
                onChange={e => setPreferences(p => ({ ...p, avoidWaterlogging: e.target.checked }))}
                className="rounded accent-indigo-500"
              />
              <span>Avoid waterlogged roads</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 p-2 rounded-xl border border-white/5 hover:bg-white/10 transition">
              <input
                type="checkbox"
                checked={preferences.preferFastest}
                onChange={e => setPreferences(p => ({ ...p, preferFastest: e.target.checked, preferSafer: !e.target.checked }))}
                className="rounded accent-indigo-500"
              />
              <span>Prefer fastest route</span>
            </label>
          </div>
        )}
      </div>

      {/* GPS Warning Banner if Permission Denied */}
      {gpsError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button 
            onClick={() => setGpsError(null)} 
            className="text-amber-800 hover:text-amber-950 font-bold text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 text-xs rounded-2xl flex items-center justify-between shadow-2xs animate-shake">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={handleCalculateRoute} 
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main Grid: Controls + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Control Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Starting Point & Destination Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            
            {/* STARTING POINT INPUT */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-wider">
                  STARTING POINT
                </span>
                {originAccuracy && (
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    GPS accuracy: ±{originAccuracy} m
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl px-3.5 py-3 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <input
                  type="text"
                  value={originStr}
                  onFocus={() => setShowOriginDropdown(true)}
                  onChange={e => {
                    setOriginStr(e.target.value);
                    setShowOriginDropdown(true);
                  }}
                  placeholder="Enter starting location or landmark..."
                  className="w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={requestCurrentLocation}
                  title="Use My Current Location"
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition cursor-pointer shadow-3xs"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </div>

              {/* Origin Autocomplete Suggestions Dropdown */}
              {showOriginDropdown && originSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100">
                  <div className="p-2 bg-slate-50 text-[10px] font-mono uppercase font-bold text-slate-500">
                    Suggested Starting Points
                  </div>
                  {originSuggestions.map(sug => (
                    <div
                      key={sug.id}
                      onClick={() => handleSelectOrigin(sug)}
                      className="p-3 hover:bg-indigo-50/60 cursor-pointer transition text-left"
                    >
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{sug.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 ml-5 line-clamp-1">{sug.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DESTINATION INPUT (WITH ROBUST AUTOCOMPLETE) */}
            <div className="relative">
              <span className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                DESTINATION
              </span>
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl px-3.5 py-3 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                <Search className="w-4 h-4 text-indigo-600 shrink-0" />
                <input
                  type="text"
                  value={destinationStr}
                  onFocus={() => setShowDestDropdown(true)}
                  onChange={e => {
                    setDestinationStr(e.target.value);
                    setShowDestDropdown(true);
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      setShowDestDropdown(false);
                      handleCalculateRoute();
                    }
                  }}
                  placeholder="Search location, sector, college, or landmark..."
                  className="w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden"
                />
                {destinationStr && (
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationStr("");
                      setDestCoord(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Destination Autocomplete Suggestions Dropdown */}
              {showDestDropdown && destSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  <div className="p-2.5 bg-slate-50 flex items-center justify-between text-[10px] font-mono uppercase font-bold text-slate-500">
                    <span>Suggestions for "{destinationStr}"</span>
                    {isSearchingDest && <span className="text-indigo-600">Searching...</span>}
                  </div>
                  {destSuggestions.map(sug => (
                    <div
                      key={sug.id}
                      onClick={() => handleSelectDestination(sug)}
                      className="p-3 hover:bg-indigo-50/80 cursor-pointer transition text-left group"
                    >
                      <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="group-hover:text-indigo-600 transition-colors">{sug.label}</span>
                        </div>
                        <span className="text-[9px] font-mono bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 px-1.5 py-0.5 rounded">
                          {sug.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 ml-5 line-clamp-1">{sug.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QUICK SAVED PLACES SHORTCUTS */}
            <div>
              <span className="text-[9.5px] font-mono font-bold uppercase text-slate-400 block mb-2">
                Quick Shortcuts
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleQuickSelectPlace({ label: "Knowledge Park III, Greater Noida", lat: 28.4608, lng: 77.4631 })}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                  <span>College (KP III)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectPlace({ label: "DLF Cyber City, Gurugram", lat: 28.4952, lng: 77.0891 })}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Work (Cyber City)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelectPlace({ label: "Connaught Place, New Delhi", lat: 28.6315, lng: 77.2167 })}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Central (CP)</span>
                </button>
              </div>
            </div>

            {/* TRAVEL MODE SELECTION */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-black uppercase text-slate-500">
                  TRAVEL MODE
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedTravelMode === "car" ? "Vehicular Arterials" : selectedTravelMode === "bike" ? "Two-Wheeler Urban Pace" : "Footpath & Walkway"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTravelMode("car")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedTravelMode === "car"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Car</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTravelMode("bike")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedTravelMode === "bike"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Bike</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTravelMode("walk")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedTravelMode === "walk"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Walk</span>
                </button>
              </div>
            </div>

            {/* ACTION: FIND SAFE ROUTE BUTTON */}
            <button
              onClick={handleCalculateRoute}
              disabled={calculating || !destinationStr}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {calculating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CALCULATING SAFE ROUTE...</span>
                </>
              ) : (
                <>
                  <Route className="w-4 h-4" />
                  <span>FIND SAFE ROUTE</span>
                </>
              )}
            </button>
          </div>

          {/* RECENT SEARCHES PANEL */}
          {recentDestinations.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs text-left">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Recent Destinations</span>
                </span>
                <button
                  onClick={clearRecentHistory}
                  className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition cursor-pointer"
                >
                  Clear History
                </button>
              </div>
              <div className="space-y-1">
                {recentDestinations.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setDestinationStr(item.label);
                      setDestCoord([item.lat, item.lng]);
                    }}
                    className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-700 truncate">{item.label}</span>
                    <span className="text-[10px] font-mono text-indigo-600 font-bold">Use →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROUTE ALTERNATIVES LIST */}
          {computedRoutes.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono font-black uppercase text-slate-500 px-1 block">
                AVAILABLE ROUTE OPTIONS ({computedRoutes.length})
              </span>

              {computedRoutes.map((rt) => {
                const isSelected = rt.id === selectedRouteId;
                const isRec = rt.summaryLabel === "RECOMMENDED" || rt.id.includes("recommended");
                const isFast = rt.summaryLabel === "FASTEST";

                return (
                  <div
                    key={rt.id}
                    onClick={() => {
                      setSelectedRouteId(rt.id);
                      setIsNavigating(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? isRec
                          ? "bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                          : "bg-indigo-50/60 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black uppercase tracking-wider ${
                            isRec
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isFast
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {rt.summaryLabel || "ALTERNATIVE"}
                          </span>
                          <h4 className="text-xs font-black text-slate-900">{rt.name}</h4>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="font-bold text-slate-900">{rt.durationMinutes} min</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">{rt.distanceKm} km</span>
                          <span className="text-slate-300">•</span>
                          <span className={`font-bold ${
                            rt.safetyScore >= 80 ? "text-emerald-600" : rt.safetyScore >= 60 ? "text-amber-600" : "text-rose-600"
                          }`}>
                            Safety {rt.safetyScore}/100
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          rt.hazardsOnRoute.length === 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {rt.hazardsOnRoute.length} hazard{rt.hazardsOnRoute.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Column (7 Cols): Map & Live Navigation HUD */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* MAP WRAPPER WITH NAVIGATION OVERLAY */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-md">
            
            {/* Map Top Telemetry Bar */}
            <div className="p-2.5 sm:p-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-white z-10 relative">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                <span className="font-mono font-bold text-slate-200">URBANPULSE GIS TELEMETRY</span>
              </div>

              {/* Map View Switcher in Bar */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-700/80">
                <span className="text-[9px] font-mono font-black text-slate-400 uppercase px-1.5 hidden md:inline">
                  MAP VIEW:
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleMapType("road")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
                    mapType === "road"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                  aria-pressed={mapType === "road"}
                  title="Switch to Road Basemap"
                >
                  <span>🗺</span>
                  <span>Road</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMapType("satellite")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
                    mapType === "satellite"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                  aria-pressed={mapType === "satellite"}
                  title="Switch to Satellite Basemap"
                >
                  <span>🛰</span>
                  <span>Satellite</span>
                </button>
              </div>

              <div className="flex items-center gap-3 font-mono text-[10.5px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  OSRM + Live Reports
                </span>
              </div>
            </div>

            {/* FLOATING ON-MAP MAP VIEW SWITCHER (Road / Satellite) */}
            {!isNavigating && (
              <div className="absolute top-14 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-xl flex items-center gap-1">
                <span className="text-[9px] font-mono font-black text-slate-400 uppercase px-1.5 hidden sm:inline tracking-wider">
                  MAP VIEW
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleMapType("road")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
                    mapType === "road"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                  aria-pressed={mapType === "road"}
                  title="Switch to Road Basemap"
                >
                  <span>🗺</span>
                  <span>Road</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMapType("satellite")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
                    mapType === "satellite"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                  aria-pressed={mapType === "satellite"}
                  title="Switch to Satellite Basemap"
                >
                  <span>🛰</span>
                  <span>Satellite</span>
                </button>
              </div>
            )}

            {/* LIVE ACTIVE NAVIGATION HUD */}
            {isNavigating && currentRoute && (
              <div className="absolute top-12 left-4 right-4 z-20 bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 rounded-2xl p-4 text-white shadow-2xl animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-mono font-black animate-pulse">
                      NAVIGATING
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      Step {navProgress.currentStep}/{navProgress.totalSteps}
                    </span>
                    {gpsUnavailable ? (
                      <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded text-[10px] font-mono font-bold">
                        Live GPS unavailable
                      </span>
                    ) : currentGpsAccuracy !== null ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center gap-1 ${
                        currentGpsAccuracy > 50
                          ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                          : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                      }`}>
                        <span>GPS accuracy: ±{currentGpsAccuracy}m</span>
                        {currentGpsAccuracy > 50 && (
                          <span className="font-bold text-amber-400">LOW ACCURACY</span>
                        )}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Compact Map Switcher inside Navigation HUD */}
                    <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-700/80">
                      <button
                        type="button"
                        onClick={() => handleToggleMapType("road")}
                        className={`px-2 py-1 rounded text-[11px] font-bold font-mono transition flex items-center gap-1 cursor-pointer ${
                          mapType === "road"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                        title="Switch to Road Basemap"
                      >
                        <span>🗺</span>
                        <span className="hidden sm:inline">Road</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleMapType("satellite")}
                        className={`px-2 py-1 rounded text-[11px] font-bold font-mono transition flex items-center gap-1 cursor-pointer ${
                          mapType === "satellite"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                        title="Switch to Satellite Basemap"
                      >
                        <span>🛰</span>
                        <span className="hidden sm:inline">Satellite</span>
                      </button>
                    </div>

                    <button
                      onClick={handleCenterOnMe}
                      title="Center map on current GPS location"
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Center on Me</span>
                    </button>
                    <button
                      onClick={handleStopNavigation}
                      className="p-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block">REMAINING TIME</span>
                    <span className="text-base font-black text-white">
                      {navProgress.remainingMinutes} min
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block">REMAINING DISTANCE</span>
                    <span className="text-base font-black text-white">
                      {navProgress.remainingKm} km
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 font-mono block">NEXT HAZARD</span>
                    <span className="text-xs font-bold text-amber-400 truncate block">
                      {nextHazardInfo
                        ? `${nextHazardInfo.hazard.type} • ${nextHazardInfo.distanceKm} km`
                        : "All Clear Ahead"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* REROUTE NOTIFICATION BANNER */}
            {showRerouteBanner && alternativeRoute && (
              <div className="absolute top-12 left-4 right-4 z-20 bg-amber-500 text-slate-950 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-slate-950 shrink-0" />
                  <div className="text-left leading-tight">
                    <span className="text-xs font-black uppercase tracking-wider block">
                      ⚠ HAZARDS DETECTED ON CURRENT ROUTE
                    </span>
                    <span className="text-[11px] font-medium opacity-90">
                      Safer alternative available (Safety {alternativeRoute.safetyScore}/100, +{Math.max(1, alternativeRoute.durationMinutes - (currentRoute?.durationMinutes || 0))} min)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleApplyReroute}
                    className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold transition hover:bg-slate-800 cursor-pointer shadow-sm"
                  >
                    REROUTE
                  </button>
                  <button
                    onClick={() => setShowRerouteBanner(false)}
                    className="p-1.5 text-slate-950 hover:bg-black/10 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Map Container */}
            <div 
              ref={mapContainerRef} 
              className="relative w-full h-80 sm:h-96 bg-slate-950 z-0" 
              style={{ minHeight: "360px" }}
            />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-2.5 py-1.5 text-[9.5px] font-mono text-slate-300 flex flex-wrap items-center gap-2.5 shadow-lg pointer-events-none">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block border border-white"></span> Start</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block border border-white"></span> Destination</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-1 bg-blue-600 rounded inline-block"></span> Selected Route</span>
              <span className="flex items-center gap-1"><span className="text-amber-400 font-bold">⚠</span> Hazard</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500/50 border border-orange-500 inline-block"></span> High-Risk Zone</span>
              <span className="flex items-center gap-1"><span className="w-3.5 h-1 bg-emerald-500 rounded inline-block"></span> Safe Segment</span>
              <span className="flex items-center gap-1 text-slate-400 border-l border-slate-700 pl-2">
                <span>Layer: {mapType === "satellite" ? "🛰 Satellite" : "🗺 Road"}</span>
              </span>
            </div>
          </div>

          {/* ROUTE SUMMARY CARD & NAVIGATION STARTER */}
          {currentRoute && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 text-left">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {currentRoute.summaryLabel || "RECOMMENDED ROUTE"}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {currentRoute.name}
                  </h3>
                </div>

                {!isNavigating ? (
                  <button
                    onClick={handleStartNavigation}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>START NAVIGATION</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopNavigation}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>EXIT NAVIGATION</span>
                  </button>
                )}
              </div>

              {/* Key Route Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">DURATION</span>
                  <span className="text-xl font-black text-slate-900">{currentRoute.durationMinutes} min</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">DISTANCE</span>
                  <span className="text-xl font-black text-slate-900">{currentRoute.distanceKm} km</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">SAFETY SCORE</span>
                  <span className={`text-xl font-black ${
                    currentRoute.safetyScore >= 80 ? "text-emerald-600" : currentRoute.safetyScore >= 60 ? "text-amber-600" : "text-rose-600"
                  }`}>
                    {currentRoute.safetyScore}/100
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">ACTIVE HAZARDS</span>
                  <span className="text-xl font-black text-slate-900">{currentRoute.hazardsOnRoute.length} active</span>
                </div>
              </div>

              {/* ROUTE SAFETY ANALYSIS & BREAKDOWN */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider font-mono">
                    ROUTE SAFETY ANALYSIS
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    UrbanPulse Route Safety Score
                  </span>
                </div>

                {/* Visual Segment Bar */}
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                  <div 
                    style={{ width: `${Math.max(15, currentRoute.safetyBreakdown?.hazardExposure || 80)}%` }} 
                    className="bg-emerald-500 h-full"
                    title="Safe segments"
                  />
                  <div 
                    style={{ width: `${Math.min(40, (currentRoute.hazardsOnRoute.length * 8))}%` }} 
                    className="bg-amber-500 h-full"
                    title="Moderate hazard zones"
                  />
                  <div 
                    style={{ width: `${Math.min(30, currentRoute.hazardsOnRoute.filter(h => (h.severity || 0) >= 80).length * 15)}%` }} 
                    className="bg-rose-500 h-full"
                    title="High-risk segments"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[9.5px] text-slate-400 uppercase block">Hazard Exposure</span>
                    <strong className="text-slate-800">{currentRoute.safetyBreakdown?.hazardExposure || 92}%</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[9.5px] text-slate-400 uppercase block">Road Risk</span>
                    <strong className="text-slate-800">{currentRoute.safetyBreakdown?.roadRisk || 88}%</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[9.5px] text-slate-400 uppercase block">Active Incidents</span>
                    <strong className="text-slate-800">{currentRoute.safetyBreakdown?.activeIncidents || 96}%</strong>
                  </div>
                </div>

                <p className="text-[10.5px] text-slate-500 leading-relaxed italic">
                  Based on currently available incident reports within a 65-meter buffer of this road corridor.
                </p>
              </div>

              {/* HAZARDS ON THIS ROUTE SECTION */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider font-mono">
                    HAZARDS ON THIS ROUTE ({currentRoute.hazardsOnRoute.length})
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Click to inspect on map
                  </span>
                </div>

                {currentRoute.hazardsOnRoute.length === 0 ? (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No active reported hazards found along this commuter corridor. Corridor clear.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentRoute.hazardsOnRoute.map((h, i) => {
                      const isHighSev = (h.severity || 0) >= 75;
                      const distKm = ((h.distanceAlongRouteMeters || 0) / 1000).toFixed(1);
                      const isHighlighted = highlightedHazardId === (h.id || `${h.lat}_${h.lng}`);

                      return (
                        <div
                          key={i}
                          onClick={() => handleFocusHazard(h)}
                          className={`p-3 rounded-2xl border transition cursor-pointer text-left ${
                            isHighlighted
                              ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/20"
                              : "bg-slate-50 hover:bg-slate-100/80 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className={`w-3.5 h-3.5 ${isHighSev ? 'text-rose-600' : 'text-amber-600'}`} />
                              <span className="text-xs font-bold text-slate-900">{h.type}</span>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isHighSev ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {isHighSev ? "HIGH" : "MEDIUM"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-1">"{h.description}"</p>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-1.5 border-t border-slate-200/60">
                            <span>{distKm} km ahead</span>
                            <span className="text-indigo-600 font-bold hover:underline">Inspect →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

import L from "leaflet";

if (typeof window !== "undefined") {
  (window as any).L = L;
}

// Ensure L.Util.stamp and layer management are resilient against undefined/null arguments
if (L && L.Util) {
  let lastStampId = 10000;

  L.Util.stamp = function (obj: any) {
    if (!obj || (typeof obj !== "object" && typeof obj !== "function")) {
      return ++lastStampId;
    }
    try {
      if (!("_leaflet_id" in obj)) {
        obj["_leaflet_id"] = ++lastStampId;
      }
      return obj._leaflet_id;
    } catch {
      return ++lastStampId;
    }
  };

  (L as any).stamp = L.Util.stamp;

  // Safeguard LayerGroup removeLayer & hasLayer against undefined
  if (L.LayerGroup && L.LayerGroup.prototype) {
    const origRemoveLayer = L.LayerGroup.prototype.removeLayer;
    L.LayerGroup.prototype.removeLayer = function (layer: any) {
      if (!layer) return this;
      try {
        return origRemoveLayer.call(this, layer);
      } catch {
        return this;
      }
    };

    const origHasLayer = L.LayerGroup.prototype.hasLayer;
    L.LayerGroup.prototype.hasLayer = function (layer: any) {
      if (!layer) return false;
      try {
        return origHasLayer.call(this, layer);
      } catch {
        return false;
      }
    };
  }

  // Safeguard Map removeLayer & hasLayer against undefined
  if (L.Map && L.Map.prototype) {
    const origMapRemoveLayer = L.Map.prototype.removeLayer;
    L.Map.prototype.removeLayer = function (layer: any) {
      if (!layer) return this;
      try {
        return origMapRemoveLayer.call(this, layer);
      } catch {
        return this;
      }
    };

    const origMapHasLayer = L.Map.prototype.hasLayer;
    L.Map.prototype.hasLayer = function (layer: any) {
      if (!layer) return false;
      try {
        return origMapHasLayer.call(this, layer);
      } catch {
        return false;
      }
    };
  }
}

export default L;


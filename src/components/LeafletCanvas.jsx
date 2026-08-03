import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const TBILISI = [41.7151, 44.8271];

function markerHtml(marker) {
  const content = marker.kind === "courier" ? "<b>კ</b>" : "";
  return `<span class="leaflet-pin-core ${marker.kind === "courier" ? "courier" : "order"}">${content}</span>`;
}

function popupNode(marker) {
  const container = document.createElement("div");
  container.className = "leaflet-safe-popup";
  const title = document.createElement("strong");
  title.textContent = marker.title;
  const detail = document.createElement("span");
  detail.textContent = marker.detail || "";
  container.append(title, detail);
  return container;
}

export function LeafletCanvas({
  center = TBILISI,
  zoom = 12,
  markers = [],
  selectedPosition = null,
  onPositionChange,
  onMarkerSelect,
  fitMarkers = false,
  className = "",
  testId,
}) {
  const containerRef = useRef(null);
  const initialViewRef = useRef({ center, zoom });
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markerLayerRef = useRef(null);
  const selectionMarkerRef = useRef(null);
  const positionHandlerRef = useRef(onPositionChange);
  const markerHandlerRef = useRef(onMarkerSelect);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    positionHandlerRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => {
    markerHandlerRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  useEffect(() => {
    let active = true;
    let resizeObserver;

    import("leaflet").then(async ({ default: L }) => {
      globalThis.L = L;
      await import("leaflet.markercluster");
      if (!active || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const initialView = initialViewRef.current;
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
        .setView(initialView.center, initialView.zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      markerLayerRef.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 44,
        spiderfyOnMaxZoom: true,
      }).addTo(map);
      map.on("click", (event) => {
        positionHandlerRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
      mapRef.current = map;
      setMapReady(true);
      resizeObserver = new globalThis.ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
    });

    return () => {
      active = false;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      selectionMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();
    const points = [];
    for (const marker of markers) {
      if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) continue;
      points.push([marker.lat, marker.lng]);
      const icon = L.divIcon({
        className: "leaflet-pin-shell",
        html: markerHtml(marker),
        iconSize: [34, 42],
        iconAnchor: [17, 40],
        popupAnchor: [0, -36],
      });
      const layerMarker = L.marker([marker.lat, marker.lng], {
        icon,
        title: marker.title,
        alt: marker.title,
        keyboard: true,
      }).addTo(layer);
      layerMarker.bindPopup(popupNode(marker));
      layerMarker.on("click", () => markerHandlerRef.current?.(marker));
    }

    if (fitMarkers && points.length > 1) {
      map.fitBounds(points, { padding: [46, 46], maxZoom: 13 });
    }
  }, [fitMarkers, mapReady, markers]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (!selectedPosition || !Number.isFinite(selectedPosition.lat) || !Number.isFinite(selectedPosition.lng)) {
      selectionMarkerRef.current?.remove();
      selectionMarkerRef.current = null;
      return;
    }

    const point = [selectedPosition.lat, selectedPosition.lng];
    if (!selectionMarkerRef.current) {
      const icon = L.divIcon({
        className: "leaflet-pin-shell",
        html: '<span class="leaflet-pin-core selected"></span>',
        iconSize: [38, 46],
        iconAnchor: [19, 44],
      });
      selectionMarkerRef.current = L.marker(point, { icon, draggable: true, title: "არჩეული მისამართი" }).addTo(map);
      selectionMarkerRef.current.on("dragend", (event) => {
        const next = event.target.getLatLng();
        positionHandlerRef.current?.({ lat: next.lat, lng: next.lng });
      });
    } else {
      selectionMarkerRef.current.setLatLng(point);
    }
    map.setView(point, Math.max(map.getZoom(), 16));
  }, [mapReady, selectedPosition]);

  return <div ref={containerRef} className={`leaflet-canvas ${className}`} data-testid={testId} />;
}

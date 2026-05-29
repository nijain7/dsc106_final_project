mapboxgl.accessToken =
  "pk.eyJ1IjoibmF0YWxpZWh1eW5oMTI0IiwiYSI6ImNtcDhxd2g3eDBsYW4ycHEwNjhoOGc1Y20ifQ.sFv_g4J0BwG-Djzf6-v1dQ";

const map = new mapboxgl.Map({
  container: "map",

  // YOUR CUSTOM MTA STYLE
  style: "mapbox://styles/nataliehuynh124/cmprhxrwy001z01rdgs0iawsv",

  center: [-73.98, 40.75],
  zoom: 10
});

map.on("load", () => {

  // -----------------------
  // SUBWAY LINES
  // -----------------------
  map.addSource("subway-lines", {
    type: "geojson",
    data: "../outputs/lines.geojson"
  });

  map.addLayer({
    id: "subway-lines-layer",
    type: "line",
    source: "subway-lines",
    layout: {
      "line-cap": "round",
      "line-join": "round"
    },
    paint: {
      "line-color": [
        "match",
        ["get", "route_id"],

        "1", "#EE352E",
        "2", "#EE352E",
        "3", "#EE352E",

        "4", "#00933C",
        "5", "#00933C",
        "6", "#00933C",

        "A", "#2850AD",
        "C", "#2850AD",
        "E", "#2850AD",

        "B", "#FF6319",
        "D", "#FF6319",
        "F", "#FF6319",
        "M", "#FF6319",

        "N", "#FCCC0A",
        "Q", "#FCCC0A",
        "R", "#FCCC0A",
        "W", "#FCCC0A",

        "7", "#B933AD",

        "#999999"
      ],
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10, 3,
        14, 6,
        16, 10
      ],
      "line-opacity": 0.95
    }
  });

  // -----------------------
  // STATIONS (DOTS)
  // -----------------------
  map.addSource("stations", {
    type: "geojson",
    data: "../outputs/stations.geojson"
  });

  map.addLayer({
    id: "stations-layer",
    type: "circle",
    source: "stations",
    minzoom: 11,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11, 1.5,
        14, 3,
        16, 6
      ],
      "circle-color": "#ffffff",
      "circle-stroke-color": "#111111",
      "circle-stroke-width": 1.2
    }
  });

  // -----------------------
  // 🚇 STATION LABELS (NEW)
  // -----------------------
  map.addLayer({
    id: "station-labels",
    type: "symbol",
    source: "stations",
    minzoom: 12,

    layout: {
      "text-field": ["get", "stop_name"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        12, 9,
        14, 11,
        16, 13
      ],
      "text-offset": [0, 1.2],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "text-ignore-placement": false
    },

    paint: {
      "text-color": "#2b2b2b",

      // IMPORTANT: gives that printed MTA-map look
      "text-halo-color": "#f4f1e8",
      "text-halo-width": 1.5
    }
  });

  // -----------------------
  // CLICKABLE ROUTES
  // -----------------------
  map.on("click", "subway-lines-layer", (e) => {
    const feature = e.features[0];

    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <div>
          <strong>Route ${feature.properties.route_id}</strong><br/>
          ${feature.properties.route_long_name || ""}
        </div>
      `)
      .addTo(map);
  });

  // -----------------------
  // CLICKABLE STATIONS
  // -----------------------
  map.on("click", "stations-layer", (e) => {
    const feature = e.features[0];

    new mapboxgl.Popup()
      .setLngLat(feature.geometry.coordinates)
      .setHTML(`
        <div>
          <strong>${feature.properties.stop_name}</strong><br/>
          Stop ID: ${feature.properties.stop_id || "N/A"}
        </div>
      `)
      .addTo(map);
  });

  // -----------------------
  // CURSOR
  // -----------------------
  map.on("mouseenter", "subway-lines-layer", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "subway-lines-layer", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("mouseenter", "stations-layer", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "stations-layer", () => {
    map.getCanvas().style.cursor = "";
  });
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");
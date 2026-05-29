mapboxgl.accessToken = "pk.eyJ1IjoibmF0YWxpZWh1eW5oMTI0IiwiYSI6ImNtcDhxd2g3eDBsYW4ycHEwNjhoOGc1Y20ifQ.sFv_g4J0BwG-Djzf6-v1dQ";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/light-v11",
  center: [-73.98, 40.75],
  zoom: 10
});

map.on("load", () => {

  // -----------------------
  // SUBWAY LINES (ROUTE COLORED)
  // -----------------------
  map.addSource("subway-lines", {
    type: "geojson",
    data: "../outputs/lines.geojson"
  });

  map.addLayer({
    id: "subway-lines-layer",
    type: "line",
    source: "subway-lines",
    paint: {
      "line-color": [
        "match",
        ["get", "route_id"],

        // RED LINE (1, 2, 3)
        "1", "#EE352E",
        "2", "#EE352E",
        "3", "#EE352E",

        // GREEN LINE (4, 5, 6)
        "4", "#00933C",
        "5", "#00933C",
        "6", "#00933C",

        // BLUE LINE (A, C, E)
        "A", "#2850AD",
        "C", "#2850AD",
        "E", "#2850AD",

        // ORANGE (B, D, F, M)
        "B", "#FF6319",
        "D", "#FF6319",
        "F", "#FF6319",
        "M", "#FF6319",

        // YELLOW (N, Q, R, W)
        "N", "#FCCC0A",
        "Q", "#FCCC0A",
        "R", "#FCCC0A",
        "W", "#FCCC0A",

        // PURPLE (7)
        "7", "#B933AD",

        // DEFAULT
        "#999999"
      ],
      "line-width": 1.8,
      "line-opacity": 0.85
    }
  });

  // -----------------------
  // STATIONS
  // -----------------------
  map.addSource("stations", {
    type: "geojson",
    data: "../outputs/stations.geojson"
  });

  map.addLayer({
    id: "stations-layer",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": 2,
      "circle-color": "#111111",
      "circle-opacity": 0.6
    }
  });

});
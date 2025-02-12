import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from "ol/proj";
import { Feature } from "ol";
import { Point, LineString } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Icon, Stroke } from "ol/style";
import { Coordinate } from "ol/coordinate";
import Overlay from "ol/Overlay";

type Location = {
  name: string;
  coordinates: Coordinate;
};

const initialLocations: Location[] = [
  {
    name: "Amazon Office",
    coordinates: [-122.338356, 47.615257],
  },
  {
    name: "Netflix Office",
    coordinates: [-118.318907, 34.0977378],
  },
];

const App: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const vectorSourceRef = useRef(new VectorSource());
  const mapInstance = useRef<Map | null>(null);
  const [flightPath, setFlightPath] = useState<Feature | null>(null);
  const [airplane, setAirplane] = useState<Feature | null>(null);
  const [isFlying, setIsFlying] = useState(false);

  const popupContainerRef = useRef<HTMLDivElement>(null);
  const popupContentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat(initialLocations[0].coordinates),
        zoom: 5,
      }),
    });

    mapInstance.current = map;

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
    });

    map.addLayer(vectorLayer);

    initialLocations.forEach((location) =>
      addMarker(location.name, location.coordinates)
    );

    const overlay = new Overlay({
      element: popupContainerRef.current!,
      positioning: "top-center",
      stopEvent: false,
      offset: [0, -20],
    });

    map.addOverlay(overlay);
    overlayRef.current = overlay;

  
    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature as Feature
      );
      if (feature && feature.get("name")) {
        const coordinates = (feature.getGeometry() as Point).getCoordinates();
        overlay.setPosition(coordinates);
        if (popupContentRef.current) {
          popupContentRef.current.innerText = feature.get("name");
        }
        popupContainerRef.current!.style.display = "block";
      } else {
        popupContainerRef.current!.style.display = "none";
      }
    });


    map.on("dblclick", (event) => {
      event.preventDefault();
      const coordinates = toLonLat(event.coordinate);
      const name = prompt("Enter dot name:");
      if (name) {
        addMarker(name, coordinates);
      }
    });

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  const addMarker = (name: string, coordinates: Coordinate) => {
    const feature = new Feature({
      geometry: new Point(fromLonLat(coordinates)),
    });

    feature.setStyle(
      new Style({
        image: new Icon({
          src: "https://upload.wikimedia.org/wikipedia/commons/e/ec/RedDot.svg",
          scale: 0.6,
        }),
      })
    );

    feature.set("name", name);
    vectorSourceRef.current.addFeature(feature);
  };


  const createFlightPath = () => {
    if (!mapInstance.current) return;
  
    const features = vectorSourceRef.current.getFeatures().filter(feature => feature.get("name"));
  
    if (features.length < 2) {
      alert("Please add at least 2 points to create a flight path!");
      return;
    }
  
    if (flightPath) {
      vectorSourceRef.current.removeFeature(flightPath);
      setFlightPath(null);
    }
    if (airplane) {
      vectorSourceRef.current.removeFeature(airplane);
      setAirplane(null);
    }
  
    const coordinates = features.map((feature) => {
      const point = feature.getGeometry() as Point;
      return point.getCoordinates();
    });
  
    const line = new Feature({
      geometry: new LineString(coordinates),
    });
  
    line.setStyle(
      new Style({
        stroke: new Stroke({
          color: "blue",
          width: 2,
        }),
      })
    );
  
    vectorSourceRef.current.addFeature(line);
    setFlightPath(line);
  
    createAirplane(coordinates[0]);
  };
  
  

  const createAirplane = (startCoordinate: Coordinate) => {
    const plane = new Feature({
      geometry: new Point(startCoordinate),
    });

    plane.setStyle(
      new Style({
        image: new Icon({
          src: "https://upload.wikimedia.org/wikipedia/commons/0/01/Airplane_silhouette_45degree_angle.svg",
          scale: 0.1,
        }),
      })
    );

    vectorSourceRef.current.addFeature(plane);
    setAirplane(plane);
  };

  const startFlightAnimation = () => {
    if (!mapInstance.current || !flightPath || !airplane) {
      alert("Create a flight path first!");
      return;
    }

    const flightCoordinates = (flightPath.getGeometry() as LineString)
      .getCoordinates()
      .slice(2);

    if (flightCoordinates.length < 2) {
      alert("Not enough unique points to animate.");
      return;
    }

    let currentIndex = 0;
    const totalDuration = 5000;
    const stepsPerSegment = 100;
    const segmentDuration = totalDuration / flightCoordinates.length;

    setIsFlying(true);

    const interpolate = (
      start: Coordinate,
      end: Coordinate,
      fraction: number
    ): Coordinate => {
      return [
        start[0] + (end[0] - start[0]) * fraction,
        start[1] + (end[1] - start[1]) * fraction,
      ];
    };

    const flyToNextSegment = (start: Coordinate, end: Coordinate, step = 0) => {
      if (step > stepsPerSegment) {
        currentIndex++;
        if (currentIndex < flightCoordinates.length - 1) {
          flyToNextSegment(
            flightCoordinates[currentIndex],
            flightCoordinates[currentIndex + 1]
          );
        } else {
          setTimeout(() => {
            vectorSourceRef.current.removeFeature(airplane!);
            vectorSourceRef.current.removeFeature(flightPath!);
            setAirplane(null);
            setFlightPath(null);
            setIsFlying(false);
          }, 1000);
        }
        return;
      }

      const fraction = step / stepsPerSegment;
      airplane!.setGeometry(new Point(interpolate(start, end, fraction)));

      setTimeout(
        () => flyToNextSegment(start, end, step + 1),
        segmentDuration / stepsPerSegment
      );
    };

    flyToNextSegment(flightCoordinates[0], flightCoordinates[1]);
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <h2>🗺️ OpenLayers React Map (TSX) - Realistic Flight Animation</h2>
      <p>📍 Double-click to add a new point!</p>
      <p>🛫 Click "Create Flight Path" to draw a route!</p>
      <p>✈️ Click "Start Flight" to animate the airplane smoothly!</p>
      <div
        style={{
          display: "flex",
          gap: 5,
          paddingBottom: 5,
        }}
      >
        <button disabled={isFlying} onClick={createFlightPath}>
          Create Flight Path
        </button>
        <button disabled={isFlying} onClick={startFlightAnimation}>
          Start Flight
        </button>
      </div>

      <div ref={mapRef} style={{ width: "100%", height: "80vh" }}></div>
      <div ref={popupContainerRef}>
        <div ref={popupContentRef}></div>
      </div>
    </div>
  );
};

export default App;

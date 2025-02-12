import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Icon } from "ol/style";
import Overlay from "ol/Overlay";

type Location = {
  name: string;
  coordinates: [number, number];
};

const locations: Location[] = [
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
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const popupContentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);

  useEffect(() => {
    if (!mapRef.current || !popupContainerRef.current) return;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat(locations[0].coordinates),
        zoom: 5,
      }),
    });

    const vectorSource = new VectorSource();
    locations.forEach((location) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat(location.coordinates)),
      });

      feature.setStyle(
        new Style({
          image: new Icon({
            src: "https://upload.wikimedia.org/wikipedia/commons/e/ec/RedDot.svg",
            scale: 1,
          }),
        })
      );

      feature.set("name", location.name);
      vectorSource.addFeature(feature);
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    map.addLayer(vectorLayer);

    const overlay = new Overlay({
      element: popupContainerRef.current!,
      positioning: "top-center",
      stopEvent: false,
      offset: [0, -20],
    });

    map.addOverlay(overlay);
    overlayRef.current = overlay;

    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature as Feature);
      if (feature) {
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

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  return (
    <div style={{ width: "100%", display: "flex", alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
    

      
      <h2>OpenLayers React Map (TSX)</h2>
      <div ref={mapRef} style={{ width: "100%", height: "90vh", position: "relative" }}></div>
      
      <div
        ref={popupContainerRef}
        className="popup"
        style={{
          display: "none",
          position: "absolute",
          background: "white",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
          transform: "translate(-50%, -100%)",
          pointerEvents: "none",
          fontWeight: "bold",
          color: 'red'
        }}
      >
        <div ref={popupContentRef}></div>
        </div>
       
    </div>
  );
};

export default App;

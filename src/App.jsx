import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Polygon } from "react-leaflet";
import * as toGeoJSON from "@tmcw/togeojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const calculateLineLength = (coordinates) => {
  let length = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    length += L.latLng(lat1, lon1).distanceTo(L.latLng(lat2, lon2));
  }
  return Math.round(length);
};

function App() {
  const [geoData, setGeoData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [detailedData, setDetailedData] = useState(null);
  const [activeView, setActiveView] = useState(null);
  const mapRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parser = new DOMParser();
        const kml = parser.parseFromString(e.target.result, "text/xml");
        const converted = toGeoJSON.kml(kml);
        
      
        const bounds = L.geoJSON(converted).getBounds();
        if (mapRef.current) {
          mapRef.current.fitBounds(bounds);
        }

        setGeoData(converted);
        generateSummary(converted);
        generateDetailedData(converted);
      } catch (error) {
        alert("Error parsing KML file: " + error.message);
      }
    };
    reader.readAsText(file);
  };

  const generateSummary = (geoJson) => {
    const counts = {};
    geoJson.features.forEach((feature) => {
      const type = feature.geometry.type;
      counts[type] = (counts[type] || 0) + 1;
    });
    setSummary(counts);
  };

  const generateDetailedData = (geoJson) => {
    const details = {};
    
    geoJson.features.forEach((feature) => {
      const type = feature.geometry.type;
      if (!details[type]) {
        details[type] = { count: 0, totalLength: 0 };
      }
      details[type].count++;
      
      if (["LineString", "MultiLineString", "Polygon"].includes(type)) {
        const coords = feature.geometry.coordinates;
        if (type === "LineString") {
          details[type].totalLength += calculateLineLength(coords);
        } else if (type === "MultiLineString" || type === "Polygon") {
          coords.forEach(line => {
            details[type].totalLength += calculateLineLength(line);
          });
        }
      }
    });

    setDetailedData(details);
  };

  const renderGeometry = (feature, index) => {
    const { type, coordinates } = feature.geometry;
    const color = "#" + Math.floor(Math.random()*16777215).toString(16);

    switch (type) {
      case "Point":
        return (
          <Marker
            key={index}
            position={[coordinates[1], coordinates[0]]}
          />
        );
      case "LineString":
        return (
          <Polyline
            key={index}
            positions={coordinates.map(coord => [coord[1], coord[0]])}
            color={color}
          />
        );
      case "Polygon":
        return (
          <Polygon
            key={index}
            positions={coordinates[0].map(coord => [coord[1], coord[0]])}
            color={color}
          />
        );
      case "MultiLineString":
        return coordinates.map((line, i) => (
          <Polyline
            key={`${index}-${i}`}
            positions={line.map(coord => [coord[1], coord[0]])}
            color={color}
          />
        ));
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center" }}>KML Viewer</h2>
      
      <div style={{ margin: "20px 0", display: "flex", gap: "10px" }}>
        <input type="file" accept=".kml" onChange={handleFileUpload} />
        <button onClick={() => setActiveView('summary')} disabled={!geoData}>
          Show Summary
        </button>
        <button onClick={() => setActiveView('detailed')} disabled={!geoData}>
          Show Detailed
        </button>
      </div>

      {activeView === 'summary' && summary && (
        <div style={{ margin: "20px 0" }}>
          <h3>Element Summary</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Element Type</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary).map(([type, count]) => (
                <tr key={type}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{type}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeView === 'detailed' && detailedData && (
        <div style={{ margin: "20px 0" }}>
          <h3>Detailed Analysis</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Element Type</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Count</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Total Length (meters)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(detailedData).map(([type, data]) => (
                <tr key={type}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{type}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{data.count}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {data.totalLength > 0 ? data.totalLength.toLocaleString() : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ margin: "20px 0", height: "60vh", width: "100%", borderRadius: "8px", overflow: "hidden" }}>
        <MapContainer
          ref={mapRef}
          center={[20, 0]}
          zoom={2}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {geoData?.features.map((feature, index) => renderGeometry(feature, index))}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
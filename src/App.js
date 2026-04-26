import React, { useState } from "react";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import axios from "axios";

function App() {
  const [zoneData, setZoneData] = useState({});
  const [selectedZone, setSelectedZone] = useState(null);

  const zones = {
    Koramangala: [12.9352, 77.6245],
    Whitefield: [12.9698, 77.7499],
    Yeshwanthpur: [13.0291, 77.5506]
  };

  const simulatedData = {
    Koramangala: {
      risk_level: "HIGH",
      score: 89,
      explanation:
        "Heavy rainfall + peak traffic detected. Immediate ambulance deployment recommended near Silk Board junction."
    },
    Whitefield: {
      risk_level: "MEDIUM",
      score: 54,
      explanation:
        "Moderate congestion risk detected in IT corridor zones. Keep 1 ambulance on standby near ITPL gate."
    },
    Yeshwanthpur: {
      risk_level: "LOW",
      score: 22,
      explanation:
        "Traffic and weather conditions stable. Routine monitoring sufficient."
    }
  };

  const simulateEmergency = () => {
    setZoneData(simulatedData);
  };

  const analyzeRiskZones = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/predict?city=Bengaluru&hour=18"
      );

      const data = response.data;

      setZoneData({
        Koramangala: data,
        Whitefield: data,
        Yeshwanthpur: data
      });
    } catch {
      alert("Backend offline — switching to simulation mode.");
    }
  };

  const getColor = (level) => {
    if (level === "HIGH") return "#ff3b3b";
    if (level === "MEDIUM") return "#ffaa33";
    if (level === "LOW") return "#2dd4bf";
    return "#999";
  };

  const getBadgeStyle = (level) => ({
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "8px",
    fontFamily: "JetBrains Mono",
    fontSize: "13px",
    background: getColor(level),
    color: "white"
  });

  return (
    <div
      style={{
        fontFamily: "Sora",
        background: "#0f172a",
        minHeight: "100vh",
        color: "white"
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "20px",
          fontSize: "32px",
          fontWeight: "700",
          letterSpacing: "1px",
          borderBottom: "1px solid rgba(255,255,255,0.1)"
        }}
      >
        🚑 RescueAI-Emergency Intelligence Dashboard
      </div>

      {/* CONTROL BAR */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          justifyContent: "center",
          marginTop: "20px"
        }}
      >
        <button
          onClick={simulateEmergency}
          style={{
            padding: "12px 20px",
            borderRadius: "10px",
            border: "none",
            background: "#334155",
            color: "white",
            cursor: "pointer"
          }}
        >
          Run Simulation Mode
        </button>

        <button
          onClick={analyzeRiskZones}
          style={{
            padding: "12px 20px",
            borderRadius: "10px",
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer"
          }}
        >
          Analyze Live Risk
        </button>
      </div>

      {/* MAP PANEL */}
      <div
        style={{
          width: "88%",
          margin: "30px auto",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0px 12px 30px rgba(0,0,0,0.6)"
        }}
      >
        <MapContainer
          center={[12.9716, 77.5946]}
          zoom={12}
          style={{ height: "55vh", width: "100%" }}
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {Object.entries(zones).map(([zoneName, coords]) => (
            <Circle
              key={zoneName}
              center={coords}
              radius={500}
              pathOptions={{
                color: getColor(zoneData[zoneName]?.risk_level)
              }}
              eventHandlers={{
                click: () =>
                  setSelectedZone({
                    name: zoneName,
                    ...zoneData[zoneName]
                  })
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* RISK PANEL */}
      {selectedZone && (
        <div
          style={{
            width: "60%",
            margin: "auto",
            background: "#1e293b",
            padding: "25px",
            borderRadius: "16px",
            boxShadow: "0px 10px 25px rgba(0,0,0,0.4)"
          }}
        >
          <h2 style={{ fontSize: "30px", marginBottom: "6px" }}>
  {selectedZone.name}
</h2>

          <div style={{ margin: "10px 0" }}>
            <span style={getBadgeStyle(selectedZone.risk_level)}>
              {selectedZone.risk_level} — {selectedZone.score}/100
            </span>
          </div>

          <p style={{ opacity: 0.95, lineHeight: "1.8", fontSize: "18px"}}>
            {selectedZone.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
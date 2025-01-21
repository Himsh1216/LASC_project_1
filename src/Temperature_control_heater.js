import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const App = () => {
  const [temperatureData, setTemperatureData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [tempProfiles, setTempProfiles] = useState([]);
  const [initialTemp, setInitialTemp] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTemp, setCurrentTemp] = useState(null);
  const [heatSinkTemp, setHeatSinkTemp] = useState(null); // State for sensor2 data

  useEffect(() => {
    let interval;
    if (isProcessing) {
      interval = setInterval(fetchData, 1000); // Fetch data every second during processing
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost:5001/get_data");
      const data = await response.json();

      const currentTime = new Date().toLocaleTimeString();
      setTimeData((prev) => [...prev, currentTime]);
      setTemperatureData((prev) => [...prev, data.temperature]);
      setCurrentTemp(data.temperature);

      // Update heat sink temperature from sensor2
      setHeatSinkTemp(data.sensor2?.temperature || null);

      if (initialTemp === null) {
        setInitialTemp(data.initialTemp || 0);
      }
    } catch (error) {
      setErrorMessage("Failed to fetch data");
    }
  };

  const handleStartProcess = async () => {
    try {
      setTemperatureData([]); // Clear data for new process
      setTimeData([]); // Clear data for new process

      const response = await fetch("http://localhost:5001/start_process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: tempProfiles }),
      });
      const data = await response.json();

      if (data.success) {
        setIsProcessing(true); // Set processing state to true
        setErrorMessage(null);
        fetchData(); // Start fetching temperature data immediately
      } else {
        setErrorMessage("Failed to start process");
      }
    } catch (error) {
      setErrorMessage("Failed to start process");
    }
  };

  const handleConnectDevice = async () => {
    try {
      const response = await fetch("http://localhost:5001/connect", {
        method: "POST",
      });
      const data = await response.json();
      if (data.message) {
        setConnectionStatus(true);
        setErrorMessage(null);
      } else {
        setErrorMessage(data.error);
      }
    } catch (error) {
      setErrorMessage("Failed to connect to the device");
    }
  };

  const handleAddReading = () => {
    const t1Value =
      tempProfiles.length === 0
        ? initialTemp ?? 25
        : tempProfiles[tempProfiles.length - 1].t2;

    const newProfile = {
      t1: t1Value,
      t2: "",
      stayTime: "",
      lightIntensity: "", // New field for light intensity
    };

    setTempProfiles([...tempProfiles, newProfile]);
  };

  const handleProfileChange = (index, field, value) => {
    const updatedProfiles = [...tempProfiles];
    updatedProfiles[index][field] =
      field === "stayTime" || field === "t2" || field === "lightIntensity"
        ? parseFloat(value) || ""
        : value;
    setTempProfiles(updatedProfiles);
  };

  const formatData = (tempData, timeData) =>
    timeData.map((time, index) => ({
      time,
      temperature: tempData[index],
    }));

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[90%] mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Temperature Control System
          </h1>
          {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Readings</h2>
            <p className="text-lg text-gray-700">
              Current Temperature: {currentTemp !== null && !isNaN(currentTemp)
                ? `${currentTemp.toFixed(2)} °C`
                : "Loading..."}
            </p>
            <p className="text-lg text-gray-700">
              Heat Sink Temperature: {heatSinkTemp !== null && !isNaN(heatSinkTemp)
                ? `${heatSinkTemp.toFixed(2)} °C`
                : "Loading..."}
            </p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              onClick={handleConnectDevice}
            >
              Connect Device
            </button>
            <span className="text-sm text-gray-600">
              {connectionStatus ? "Connected to the power supply" : "Not connected"}
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Temperature Profile</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 border">T1 (°C)</th>
                    <th className="p-2 border">T2 (°C)</th>
                    <th className="p-2 border">Stay Time (min)</th>
                    <th className="p-2 border">Light Intensity (%)</th> {/* New column for light intensity */}
                  </tr>
                </thead>
                <tbody>
                  {tempProfiles.map((profile, index) => (
                    <tr key={index}>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={profile.t1 ?? ""}
                          readOnly
                          placeholder="Room temp"
                          className="w-full bg-gray-100 p-1"
                        />
                      </td>
                      <td className="p-2 border" style={{ width: "150px" }}>
                        <input
                          type="number"
                          value={profile.t2 ?? ""}
                          onChange={(e) =>
                            handleProfileChange(index, "t2", e.target.value)
                          }
                          min="-50"
                          max="300"
                          className="w-full p-1"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={profile.stayTime ?? ""}
                          onChange={(e) =>
                            handleProfileChange(index, "stayTime", e.target.value)
                          }
                          min="0"
                          className="w-full p-1"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={profile.lightIntensity ?? ""}
                          onChange={(e) =>
                            handleProfileChange(index, "lightIntensity", e.target.value)
                          }
                          min="0"
                          max="100"
                          className="w-full p-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex gap-4">
                <button
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                  onClick={handleAddReading}
                >
                  Add Reading
                </button>
                <button
                  className={`${
                    !connectionStatus || isProcessing
                      ? "bg-gray-400"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white font-bold py-2 px-4 rounded`}
                  onClick={handleStartProcess}
                  disabled={!connectionStatus || isProcessing}
                >
                  {isProcessing ? "Processing..." : "Start Process"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Temperature vs Time</h2>
          {temperatureData.length > 0 && timeData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatData(temperatureData, timeData)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    label={{ value: "Time", position: "bottom" }}
                  />
                  <YAxis
                    domain={[-50, 300]}
                    label={{
                      value: "Temperature (°C)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#4CAF50"
                    name="Temperature"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No data available to display.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;

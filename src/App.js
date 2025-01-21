import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import TemperatureControl from "./Temperature_control_heater"; // Your main app component
import Login from "./Login"; // Login page component

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (status) => {
    setIsLoggedIn(status);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={handleLogin} />}
        />
        <Route
          path="/"
          element={isLoggedIn ? <TemperatureControl /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
};

export default App;

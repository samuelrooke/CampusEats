import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import HomePage from "./HomePage";
import RestaurantPage from "./RestaurantPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/restaurant/:name" element={<RestaurantPage />} />
      </Routes>
    </Router>
  );
}

export default App;
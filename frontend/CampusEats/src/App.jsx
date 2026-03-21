import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const PLACE = import.meta.env.VITE_PLACE || "Tampere"; // Placeholder for future implementation of other locations

function App() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState("");

  async function fetchMenus() {
    setLoading(true);
    setError("");
    // Menu fetching script (similar to locations.js)
    try {
      let response = await fetch(`${API_BASE}/api/menus`);
      if (!response.ok) throw new Error("Failed to fetch menus");

      let data = await response.json();

      if (Array.isArray(data) && data.length === 0) {
        await fetch(`${API_BASE}/api/menus/refresh`, { method: "POST" });
        response = await fetch(`${API_BASE}/api/menus`);
        if (!response.ok) throw new Error("Failed to fetch menus");
        data = await response.json();
      }

      setMenus(data);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(`Cannot connect to backend at ${API_BASE}`);
      } else {
        setError("Failed to fetch menus");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMenus();
  }, []);

  const restaurants = [...new Set(menus.map((menu) => menu.restaurant).filter(Boolean))];
  const visibleMenus = menus.filter((menu) => menu.restaurant === selectedRestaurant);

  if (loading) return <p>Loading menus...</p>;
  if (error) {
    return (
      <main className="app">
        <h1>CampusEats Menus</h1>
        <p>Error: {error}</p>
        <button onClick={fetchMenus}>Retry</button>
      </main>
    );
  }

  let menuContent = <p>Select a restaurant to view its menu.</p>;

  if (selectedRestaurant && visibleMenus.length === 0) {
    menuContent = <p>No menu found for {selectedRestaurant}.</p>;
  }

  if (selectedRestaurant && visibleMenus.length > 0) {
    menuContent = (
      <section>
        <h2 className="section-title">{selectedRestaurant} Menu</h2>
        <div className="menu-grid">
          {visibleMenus.map((menu) => (
            <article key={menu.id} className="menu-card">
              <h2 className="menu-title">{menu.title}</h2>
              <p><strong>Restaurant:</strong> {menu.restaurant}</p>
              <p>
                <strong>Date:</strong> {new Date(menu.date).toLocaleDateString("fi-FI")}
              </p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="app">
      <h1>Welcome to CampusEats</h1>

      <section className="restaurant-section">
        <h2 className="section-title">Restaurants in {PLACE}:</h2>
        <div className="restaurant-list">
          {restaurants.map((restaurant) => (
            <article key={restaurant} className="restaurant-card">
              <p className="restaurant-name">{restaurant}</p>
              <button
                onClick={() =>
                  setSelectedRestaurant((current) =>
                    current === restaurant ? "" : restaurant
                  )
                }
                className={`menu-button ${selectedRestaurant === restaurant ? "active" : ""}`}
              >
                {selectedRestaurant === restaurant ? "Close menu" : "Open menu"}
              </button>
            </article>
          ))}
        </div>
      </section>

      {menuContent}
    </main>
  );
}

export default App;
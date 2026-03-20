import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function App() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const place = import.meta.env.VITE_PLACE || "Tampere";

  useEffect(() => {
    const loadMenus = async () => {
      setLoading(true);
      setError("");

      try {
        let res = await fetch(`${API_BASE}/api/menus`);
        if (!res.ok) throw new Error("Failed to fetch menus");
        let data = await res.json();

        if (Array.isArray(data) && data.length === 0) {
          await fetch(`${API_BASE}/api/menus/refresh`, { method: "POST" });
          res = await fetch(`${API_BASE}/api/menus`);
          if (!res.ok) throw new Error("Failed to fetch menus");
          data = await res.json();
        }

        setMenus(data);
      } catch (err) {
        setError(err instanceof TypeError ? `Cannot connect to backend at ${API_BASE}` : "Failed to fetch menus");
      } finally {
        setLoading(false);
      }
    };

    loadMenus();
  }, [reloadKey]);

  const restaurants = useMemo(
    () => [...new Set(menus.map((menu) => menu.restaurant).filter(Boolean))],
    [menus]
  );

  const visibleMenus = useMemo(
    () => menus.filter((menu) => menu.restaurant === selectedRestaurant),
    [menus, selectedRestaurant]
  );

  if (loading) return <p>Loading menus...</p>;
  if (error) {
    return (
      <main className="app">
        <h1>CampusEats Menus</h1>
        <p>Error: {error}</p>
        <button onClick={() => setReloadKey((n) => n + 1)}>Retry</button>
      </main>
    );
  }

  return (
    <main className="app">
      <h1>Welcome to CampusEats</h1>

      <section className="restaurant-section">
        <h2 className="section-title">Restaurants in {place}:</h2>
        <div className="restaurant-list">
          {restaurants.map((restaurant) => (
            <article key={restaurant} className="restaurant-card">
              <p className="restaurant-name">{restaurant}</p>
              <button
                onClick={() => setSelectedRestaurant(restaurant)}
                className={`menu-button ${selectedRestaurant === restaurant ? "active" : ""}`}
              >
                Open menu
              </button>
            </article>
          ))}
        </div>
      </section>

      {selectedRestaurant === "" ? (
        <p>Click Open menu to view dishes.</p>
      ) : visibleMenus.length === 0 ? (
        <p>No menu found for {selectedRestaurant}.</p>
      ) : (
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
      )}
    </main>
  );
}

export default App;
const PLACE = "Tampere"; // TODO: Make PLACE change based on user location or selection
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const OPENING_TIMETABLES = {
  "Campusravita": "Mon-Fri 10:30-16:00",
  "Frenckell ja Piha": "Mon-Fri 10:30-15:00",
  "Arvo": "Mon-Fri 10:30-15:00",
  "Sodexo Linna": "Mon-Fri 10:30-15:00",
  "Ravintola Rata": "Mon-Fri 10:30-18:00, Sat 11:00-15:00",
  "Finn Medi": "Mon-Fri 10:30-15:00",
  "Sodexo Hertsi": "Mon-Fri 10:00-16:00",
  "Tori": "Mon-Fri 10:30-15:00",
  "Mediapolis": "Mon-Fri 10:30-15:00",
  "Compass Minerva": "Mon-Fri 10:30-15:00",
  "Compass Reaktori": "Mon-Fri 10:30-15:00",
};

function HomePage() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRestaurant] = useState("");
  const [tagSearch, setTagSearch] = useState("");

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

  // Hardcoded restaurant list for reliable display
  const restaurants = [
    "Campusravita",
    "Frenckell ja Piha",
    "Arvo",
    "Sodexo Linna",
    "Ravintola Rata",
    "Finn Medi",
    "Sodexo Hertsi",
    "Tori",
    "Mediapolis",
    "Compass Minerva",
    "Compass Reaktori",
  ];
  const visibleMenus = selectedRestaurant
    ? menus.filter((menu) => menu.restaurant === selectedRestaurant)
    : menus;
  const getFoodTags = (menu) => {
    // text search
    const text = `${menu.title} ${Array.isArray(menu.tags) ? menu.tags.join(" ") : ""}`.toLowerCase();
    // match vegan keywords
    const vegan = /\bveg\b|vegan|kasvis/.test(text);
    // match chicken keywords
    const chicken = /kana|broileri/.test(text);
    // match meat keywords
    const meat = /liha|nauta|porsas|jauheliha|lammas|kinkku|pekoni/.test(text);
    // return active tags
    return [vegan && "vegan", meat && "meat", chicken && "chicken"].filter(Boolean);
  };

  const normalizedTagSearch = tagSearch.trim().toLowerCase();
  const filteredMenus = normalizedTagSearch
    ? visibleMenus.filter((menu) => getFoodTags(menu).includes(normalizedTagSearch))
    : visibleMenus;

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

  let menuContent = <p>No menus found.</p>;

  if (filteredMenus.length > 0) {
    menuContent = (
      <section>
        <h2 className="section-title">{selectedRestaurant ? `${selectedRestaurant} Menu` : "All Menus"}</h2>
        <div className="menu-grid">
          {filteredMenus.map((menu) => {
            const foodTags = getFoodTags(menu);
            return (
              <article key={menu.id} className="menu-card">
                <h2 className="menu-title">{menu.title}</h2>
                <p><strong>Restaurant:</strong> {menu.restaurant}</p>
                <p>
                  <strong>Date:</strong> {new Date(menu.date).toLocaleDateString("fi-FI")}
                </p>
                <p><strong>Tags:</strong> {foodTags.length > 0 ? foodTags.join(", ") : "No tags"}</p>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <main className="app">
      {/* Mapbox placeholder */}
      <section className="mb-8">
        <div style={{ width: '100%', height: '300px', background: '#e0e7ef', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1.5rem', fontWeight: 500 }}>
          Mapbox Map Placeholder
        </div>
      </section>

      <section className="app-topbar">
        <h1>Welcome to CampusEats</h1>
        <input
          type="text"
          className="tag-search"
          placeholder="Type vegan, meat or chicken"
          value={tagSearch}
          onChange={(event) => setTagSearch(event.target.value)}
        />
      </section>

      <section className="restaurant-section">
        <h2 className="section-title">Restaurants in {PLACE}:</h2>
        <div className="restaurant-list">
          {restaurants.map((restaurant) => (
            <article key={restaurant} className="restaurant-card">
              <Link to={`/restaurant/${encodeURIComponent(restaurant)}`} className="restaurant-name-link">
                <p className="restaurant-name">{restaurant}</p>
              </Link>
              <p className="text-gray-600 text-sm">
                Opening hours: {OPENING_TIMETABLES[restaurant] || "Not available"}
              </p>
            </article>
          ))}
        </div>
      </section>

      {menuContent}
    </main>
  );
}

export default HomePage;
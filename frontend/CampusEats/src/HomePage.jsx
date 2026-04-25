const PLACE = "Tampere";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LeafletMap from "./LeafletMap";
import { RESTAURANT_LOCATIONS } from "./restaurantLocations";
import "./App.css";

function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const OPENING_TIMETABLES = {
  "Campusravita":      "Mon-Fri 10:30-16:00",
  "Frenckell ja Piha": "Mon-Fri 10:30-15:00",
  "Arvo":              "Mon-Fri 10:30-15:00",
  "Sodexo Linna":      "Mon-Fri 10:30-15:00",
  "Ravintola Rata":    "Mon-Fri 10:30-18:00, Sat 11:00-15:00",
  "Finn Medi":         "Mon-Fri 10:30-15:00",
  "Sodexo Hertsi":     "Mon-Fri 10:00-16:00",
  "Tori Mediapolis":   "Mon-Fri 10:30-15:00",
  "Food&Co Minerva":   "Mon-Fri 10:30-15:00",
  "Food&Co Reaktori":  "Mon-Fri 10:30-15:00",
};

const RESTAURANTS = [
  "Campusravita",
  "Frenckell ja Piha",
  "Arvo",
  "Sodexo Linna",
  "Ravintola Rata",
  "Finn Medi",
  "Sodexo Hertsi",
  "Tori Mediapolis",
  "Food&Co Minerva",
  "Food&Co Reaktori",
];

const TAG_PATTERNS = {
  vegan:   /\bvegan\b|\bvegaani\b|\bkasvis\b|\bkasvispohjainen\b/i,
  chicken: /\bkana\b|\bbroileri\b|\bchicken\b/i,
  meat:    /\bliha\b|\bnauta\b|\bporsas\b|\bsika\b|\bjauheliha\b|\blammas\b|\bkinkku\b|\bpekoni\b|\bhirvi\b|\bporonliha\b|\bhärkä\b/i,
};

function getFoodTags(menu) {
  const text = `${menu.title} ${Array.isArray(menu.tags) ? menu.tags.join(" ") : ""}`;
  return Object.entries(TAG_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([tag]) => tag);
}

function HomePage() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [dishFavorites, setDishFavorites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("favorites");
    setFavorites(saved ? JSON.parse(saved) : []);
    const savedDishes = localStorage.getItem("dishFavorites");
    setDishFavorites(savedDishes ? JSON.parse(savedDishes) : []);
  }, []);

  function toggleFavorite(name) {
    const updated = favorites.includes(name)
      ? favorites.filter(f => f !== name)
      : [...favorites, name];
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  }

  function toggleDishFavorite(dishId) {
    const updated = dishFavorites.includes(dishId)
      ? dishFavorites.filter(id => id !== dishId)
      : [...dishFavorites, dishId];
    setDishFavorites(updated);
    localStorage.setItem("dishFavorites", JSON.stringify(updated));
  }

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => setUserLocation([coords.latitude, coords.longitude]),
      () => {}
    );
  }, []);

  async function fetchMenus() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/menus`);
      if (!res.ok) throw new Error("not ok");
      setMenus(await res.json());
    } catch {
      setError(`Cannot connect to backend at ${API_BASE}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMenus(); }, []);

  const coordsMap = Object.fromEntries(RESTAURANT_LOCATIONS.map(r => [r.name, r.coords]));

  function getDistance(name) {
    if (!userLocation || !coordsMap[name]) return null;
    const km = haversine(userLocation, coordsMap[name]);
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  const textQuery = tagSearch.trim().toLowerCase();
  const isFiltering = activeTag || textQuery;
  const filteredMenus = isFiltering
    ? menus.filter((m) => {
        const tags = getFoodTags(m);
        const tagMatch = activeTag ? tags.includes(activeTag) : true;
        const textMatch = textQuery ? m.title.toLowerCase().includes(textQuery) : true;
        return tagMatch && textMatch;
      })
    : [];

  if (loading) return <main className="app"><p className="status-text">Loading menus...</p></main>;

  if (error) {
    return (
      <main className="app">
        <p className="status-text">{error}</p>
        <button onClick={fetchMenus} className="retry-btn">Retry</button>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="map-section">
        <LeafletMap userLocation={userLocation} />
      </section>

      <div className="search-bar">
        <div className="tag-buttons">
          {["vegan", "meat", "chicken"].map((tag) => (
            <button
              key={tag}
              className={`tag-btn${activeTag === tag ? " tag-btn--active" : ""}`}
              onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="tag-search"
          placeholder="Search by name..."
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
        />
      </div>

      {isFiltering ? (
        <section>
          <p className="search-results-label">
            {filteredMenus.length} result{filteredMenus.length !== 1 ? "s" : ""}
            {activeTag ? ` tagged "${activeTag}"` : ""}
            {tagSearch.trim() ? ` matching "${tagSearch.trim()}"` : ""}
          </p>
          {filteredMenus.length > 0 ? (
            <div className="menu-grid">
              {filteredMenus.map((menu) => {
                const tags = getFoodTags(menu);
                const tagClass = tags.length > 0 ? ` menu-card--${tags[0]}` : '';
                return (
                  <article key={menu.id} className={`menu-card${tagClass}`}>
                    <p className="menu-card-restaurant">{menu.restaurant}</p>
                    <p className="menu-card-title">{menu.title}</p>
                    {tags.length > 0 && <p className="menu-card-tags">{tags.join(", ")}</p>}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="menu-empty">No matching menu items today.</p>
          )}
        </section>
      ) : null}

      {!isFiltering && dishFavorites.length > 0 && (
        <section>
          <p className="section-label">My Favorite Dishes</p>
          <div className="menu-grid">
            {menus
              .filter((menu) => dishFavorites.includes(menu.id))
              .map((menu) => {
                const tags = getFoodTags(menu);
                const tagClass = tags.length > 0 ? ` menu-card--${tags[0]}` : '';
                return (
                  <article key={menu.id} className={`menu-card${tagClass}`}>
                    <div className="menu-card-with-favorite">
                      <div className="menu-card-content">
                        <p className="menu-card-restaurant">{menu.restaurant}</p>
                        <p className="menu-card-title">{menu.title}</p>
                        {tags.length > 0 && <p className="menu-card-tags">{tags.join(", ")}</p>}
                      </div>
                      <button
                        className="favorite-btn favorite-btn--active"
                        onClick={() => toggleDishFavorite(menu.id)}
                        title="Remove from favorites"
                      >
                        ♥
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      )}

      {!isFiltering && favorites.length > 0 && (
        <section>
          <p className="section-label">My Favorites</p>
          <div className="restaurant-list">
            {RESTAURANTS.filter(name => favorites.includes(name)).map((name) => {
              const distance = getDistance(name);
              const hours = OPENING_TIMETABLES[name];
              return (
                <div key={name} className="restaurant-card">
                  <div className="restaurant-info">
                    <Link
                      to={`/restaurant/${encodeURIComponent(name)}`}
                      className="restaurant-name-link"
                    >
                      <p className="restaurant-name">{name}</p>
                    </Link>
                    {hours && <p className="restaurant-hours">{hours}</p>}
                  </div>
                  <div className="restaurant-actions">
                    {distance && <p className="restaurant-distance">{distance}</p>}
                    <button
                      className="favorite-btn favorite-btn--active"
                      onClick={() => toggleFavorite(name)}
                      title="Remove from favorites"
                    >
                      ♥
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!isFiltering && (
        <section>
          <p className="section-label">Restaurants in {PLACE}</p>
          <div className="restaurant-list">
            {RESTAURANTS.map((name) => (
              <div key={name} className="restaurant-card">
                <div className="restaurant-info">
                  <Link
                    to={`/restaurant/${encodeURIComponent(name)}`}
                    className="restaurant-name-link"
                  >
                    <p className="restaurant-name">{name}</p>
                  </Link>
                  {OPENING_TIMETABLES[name] && <p className="restaurant-hours">{OPENING_TIMETABLES[name]}</p>}
                </div>
                <div className="restaurant-actions">
                  {getDistance(name) && <p className="restaurant-distance">{getDistance(name)}</p>}
                  <button
                    className={`favorite-btn${favorites.includes(name) ? " favorite-btn--active" : ""}`}
                    onClick={() => toggleFavorite(name)}
                    title={favorites.includes(name) ? "Remove from favorites" : "Add to favorites"}
                  >
                    ♥
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default HomePage;

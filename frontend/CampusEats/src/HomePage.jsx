const PLACE = "Tampere";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LeafletMap, { RESTAURANT_LOCATIONS } from "./LeafletMap";
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
  vegan:   /vegan|vegaani|kasvis|kasvispohjainen/i,
  chicken: /kana|broileri|chicken/i,
  meat:    /liha|nauta|porsas|sika|jauheliha|lammas|kinkku|pekoni|hirvi|poronliha|härkä/i,
};

function getFoodTags(menu) {
  const text = `${menu.title} ${Array.isArray(menu.tags) ? menu.tags.join(" ") : ""}`;
  return Object.entries(TAG_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([tag]) => tag);
}

function HomePage() {
  const [menus, setMenus]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [userLocation, setUserLocation] = useState(null);

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

  if (loading) return <main className="app"><p style={{ color: "var(--ink-muted)", fontSize: "0.875rem" }}>Loading menus...</p></main>;

  if (error) {
    return (
      <main className="app">
        <p style={{ color: "var(--ink-muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</p>
        <button onClick={fetchMenus} style={{ fontSize: "0.875rem", cursor: "pointer" }}>Retry</button>
      </main>
    );
  }

  return (
    <main className="app">
      <section style={{ marginBottom: "2rem" }}>
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
                return (
                  <article key={menu.id} className="menu-card">
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

      {!isFiltering && (
        <section>
          <p className="section-label">Restaurants in {PLACE}</p>
          <div className="restaurant-list">
            {RESTAURANTS.map((name) => (
              <Link
                key={name}
                to={`/restaurant/${encodeURIComponent(name)}`}
                className="restaurant-card"
              >
                <span className="restaurant-name">{name}</span>
                <span className="restaurant-hours">
                  {OPENING_TIMETABLES[name] || "Hours unavailable"}
                  {getDistance(name) && <span className="restaurant-distance"> · {getDistance(name)}</span>}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default HomePage;


import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function groupByDate(items) {
  return items.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});
}

function RestaurantPage() {
  const { name } = useParams();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMenus() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE}/api/menus`);
        if (!response.ok) throw new Error("Failed to fetch menus");
        const data = await response.json();
        const decodedName = decodeURIComponent(name);
        setMenus(data.filter((menu) => menu.restaurant === decodedName));
      } catch {
        setError("Failed to fetch menus");
      } finally {
        setLoading(false);
      }
    }
    fetchMenus();
  }, [name]);

  if (loading) return <p>Loading menu...</p>;
  if (error) return <p>Error: {error}</p>;
  if (menus.length === 0) return <p>No menu found for {decodeURIComponent(name)}.</p>;

  // Group menu items by date
  const menusByDate = groupByDate(menus);

  return (
    <main className="app">
      <Link to="/" className="back-link">Back to restaurants</Link>
      <h1>{decodeURIComponent(name)}</h1>
      {Object.entries(menusByDate).map(([date, items]) => (
        <article key={date} className="menu-card">
          <h2 className="menu-title">{new Date(date).toLocaleDateString("fi-FI")}</h2>
          <ul>
            {items.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </article>
      ))}
    </main>
  );
}

export default RestaurantPage;

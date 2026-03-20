import { useEffect, useState } from "react";

function App() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMenus = async () => {
      try {
        let res = await fetch("/api/menus");
        if (!res.ok) throw new Error("Failed to fetch menus");
        let data = await res.json();

        if (Array.isArray(data) && data.length === 0) {
          await fetch("/api/menus/refresh", { method: "POST" });
          res = await fetch("/api/menus");
          if (!res.ok) throw new Error("Failed to fetch menus");
          data = await res.json();
        }

        setMenus(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMenus();
  }, []);

  if (loading) return <p>Loading menus...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <main style={{ padding: 20 }}>
      <h1>CampusEats Menus</h1>
      <pre>{JSON.stringify(menus, null, 2)}</pre>
    </main>
  );
}

export default App;
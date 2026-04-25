import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("comments");
  const [comments, setComments] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState("");

  const token = localStorage.getItem("adminToken");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const commentsRes = await fetch(`${API_BASE}/api/admin/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (commentsRes.ok) {
        setComments(await commentsRes.json());
      }

      const restaurantsRes = await fetch(`${API_BASE}/api/admin/restaurants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (restaurantsRes.ok) {
        setRestaurants(await restaurantsRes.json());
      }

      const menusRes = await fetch(`${API_BASE}/api/menus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (menusRes.ok) {
        setMenus(await menusRes.json());
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetchData();
  }, [token, navigate, fetchData]);

  async function deleteComment(id) {
    if (!confirm("Delete this comment?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/comments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setComments(comments.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  }

  async function deleteRestaurant(id) {
    if (!confirm("Delete this restaurant?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setRestaurants(restaurants.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Error deleting restaurant:", err);
    }
  }

  async function updateRestaurant(id) {
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editValues[id]),
      });

      if (res.ok) {
        setEditingId(null);
        fetchData();
      }
    } catch (err) {
      console.error("Error updating restaurant:", err);
    }
  }

  async function deleteMenu(id) {
    if (!confirm("Delete this menu item?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/menus/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMenus(menus.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Error deleting menu:", err);
    }
  }

  async function handleRefreshMenus() {
    setRefreshing(true);
    setRefreshResult("");
    try {
      const res = await fetch(`${API_BASE}/api/menus/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRefreshResult(res.ok ? "Refresh started — check back in a few minutes" : `Error: ${data.error || "Failed"}`);
      if (res.ok) fetchData();
    } catch {
      setRefreshResult("Error: Could not reach server");
    } finally {
      setRefreshing(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("adminToken");
    localStorage.setItem("loginAttempts", JSON.stringify({count: 0, timestamp: 0}));
    navigate("/admin/login");
  }

  if (loading) return <main className="app"><p>Loading...</p></main>;

  return (
    <main className="app admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === "comments" ? "active" : ""}`}
          onClick={() => setActiveTab("comments")}
        >
          Comments ({comments.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "restaurants" ? "active" : ""}`}
          onClick={() => setActiveTab("restaurants")}
        >
          Restaurants ({restaurants.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "menus" ? "active" : ""}`}
          onClick={() => setActiveTab("menus")}
        >
          Menus ({menus.length})
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "comments" && (
          <section className="admin-section">
            <h2>All Comments</h2>
            {comments.length === 0 ? (
              <p className="empty">No comments</p>
            ) : (
              <div className="admin-table">
                {comments.map((comment) => (
                  <div key={comment.id} className="admin-row">
                    <div className="admin-cell">
                      <strong>Restaurant:</strong> {comment.restaurantName}
                    </div>
                    <div className="admin-cell">
                      <p>{comment.text}</p>
                    </div>
                    <div className="admin-cell">
                      <small>
                        {new Date(comment.timestamp).toLocaleDateString("fi-FI")}
                      </small>
                    </div>
                    <div className="admin-actions">
                      <button
                        className="delete-btn"
                        onClick={() => deleteComment(comment.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "restaurants" && (
          <section className="admin-section">
            <h2>All Restaurants</h2>
            {restaurants.length === 0 ? (
              <p className="empty">No restaurants</p>
            ) : (
              <div className="admin-table">
                {restaurants.map((restaurant) => (
                  <div key={restaurant.id} className="admin-row">
                    {editingId === restaurant.id ? (
                      <>
                        <div className="admin-cell">
                          <input
                            type="text"
                            value={editValues[restaurant.id]?.name || ""}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                [restaurant.id]: {
                                  ...editValues[restaurant.id],
                                  name: e.target.value,
                                },
                              })
                            }
                            placeholder="Name"
                          />
                        </div>
                        <div className="admin-cell">
                          <input
                            type="text"
                            value={editValues[restaurant.id]?.menu_url || ""}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                [restaurant.id]: {
                                  ...editValues[restaurant.id],
                                  menu_url: e.target.value,
                                },
                              })
                            }
                            placeholder="Menu URL"
                          />
                        </div>
                        <div className="admin-actions">
                          <button
                            className="save-btn"
                            onClick={() => updateRestaurant(restaurant.id)}
                          >
                            Save
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="admin-cell">
                          <strong>{restaurant.name}</strong>
                        </div>
                        <div className="admin-cell">
                          <small>{restaurant.menu_url}</small>
                        </div>
                        <div className="admin-actions">
                          <button
                            className="edit-btn"
                            onClick={() => {
                              setEditingId(restaurant.id);
                              setEditValues({
                                [restaurant.id]: restaurant,
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => deleteRestaurant(restaurant.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "menus" && (
          <section className="admin-section">
            <div className="section-header">
              <h2>All Menus</h2>
              <button className="refresh-btn" onClick={handleRefreshMenus} disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh Menus"}
              </button>
            </div>
            {refreshResult && <p className="refresh-result">{refreshResult}</p>}
            {menus.length === 0 ? (
              <p className="empty">No menus</p>
            ) : (
              <div className="admin-table">
                {menus.map((menu) => (
                  <div key={menu.id} className="admin-row">
                    <div className="admin-cell">
                      <strong>{menu.restaurant}</strong>
                    </div>
                    <div className="admin-cell">
                      <p>{menu.title}</p>
                    </div>
                    <div className="admin-cell">
                      <small>{new Date(menu.date).toLocaleDateString("fi-FI")}</small>
                    </div>
                    <div className="admin-actions">
                      <button
                        className="delete-btn"
                        onClick={() => deleteMenu(menu.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default AdminDashboard;

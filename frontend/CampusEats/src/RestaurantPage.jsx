import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./App.css";

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

export default function RestaurantPage() {
  const { name } = useParams();
  const decodedName = decodeURIComponent(name);

  const [menus, setMenus]       = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [menusRes, commentsRes] = await Promise.all([
          fetch(`${API_BASE}/api/menus`),
          fetch(`${API_BASE}/api/comments/${encodeURIComponent(decodedName)}`),
        ]);

        if (menusRes.ok) {
          const data = await menusRes.json();
          setMenus(data.filter((m) => m.restaurant === decodedName));
        }

        if (commentsRes.ok) setComments(await commentsRes.json());
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [decodedName]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: decodedName, text: commentText }),
      });
      if (res.ok) {
        setCommentText("");
        const updated = await fetch(`${API_BASE}/api/comments/${encodeURIComponent(decodedName)}`);
        if (updated.ok) setComments(await updated.json());
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="app"><p style={{ color: "var(--ink-muted)", fontSize: "0.875rem" }}>Loading...</p></main>;
  if (error)   return <main className="app"><p style={{ color: "var(--ink-muted)", fontSize: "0.875rem" }}>{error}</p></main>;

  const hours = OPENING_TIMETABLES[decodedName];

  return (
    <main className="app">
      <Link to="/" className="back-link">All restaurants</Link>

      <h1 className="restaurant-page-title">{decodedName}</h1>
      {hours && <p className="restaurant-page-hours">{hours}</p>}

      <p className="menu-section-label">
        {menus.length > 0 ? "Today's menu" : "Menu"}
      </p>
      {menus.length > 0 ? (
        <ul className="menu-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {menus.map((item) => (
            <li key={item.id} className="menu-list-item">{item.title}</li>
          ))}
        </ul>
      ) : (
        <p className="menu-empty">No menu available today.</p>
      )}

      <section className="comments-section">
        <h2>Comments</h2>
        {comments.length > 0 ? (
          <div className="comments-list">
            {comments.map((c) => (
              <div key={c.id} className="comment-card">
                <p className="comment-text">{c.text}</p>
                <p className="comment-date">{new Date(c.timestamp).toLocaleDateString("fi-FI")}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "0.875rem", color: "var(--ink-muted)", marginBottom: "1.25rem" }}>
            No comments yet.
          </p>
        )}

        <form onSubmit={handleSubmit} className="comment-form">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts..."
            rows="3"
            disabled={submitting}
          />
          <button type="submit" disabled={submitting || !commentText.trim()}>
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </form>
      </section>
    </main>
  );
}

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function groupByDate(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});
}

export default function RestaurantPage() {
  const { name } = useParams();
  const decodedName = decodeURIComponent(name);
  
  const [menus, setMenus] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const [menusRes, commentsRes] = await Promise.all([
          fetch(`${API_BASE}/api/menus`),
          fetch(`${API_BASE}/api/comments/${encodeURIComponent(decodedName)}`),
        ]);
        
        if (menusRes.ok) {
          const data = await menusRes.json();
          setMenus(data.filter(m => m.restaurant === decodedName));
        }
        
        if (commentsRes.ok) {
          setComments(await commentsRes.json());
        }
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetch();
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
        const commentsRes = await fetch(`${API_BASE}/api/comments/${encodeURIComponent(decodedName)}`);
        if (commentsRes.ok) setComments(await commentsRes.json());
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading menu...</p>;
  if (error) return <p>Error: {error}</p>;
  if (menus.length === 0) return <p>No menu found for {decodedName}.</p>;

  return (
    <main className="app">
      <Link to="/" className="back-link">Back to restaurants</Link>
      <h1>{decodedName}</h1>
      
      {Object.entries(groupByDate(menus)).map(([date, items]) => (
        <article key={date} className="menu-card">
          <h2 className="menu-title">{new Date(date).toLocaleDateString("fi-FI")}</h2>
          <ul>
            {items.map(item => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </article>
      ))}

      <section className="comments-section">
        <h2>Comments</h2>
        {comments.length > 0 ? (
          <div className="comments-list">
            {comments.map(c => (
              <div key={c.id} className="comment-card">
                <p className="comment-text">{c.text}</p>
                <p className="comment-date">{new Date(c.timestamp).toLocaleDateString("fi-FI")}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No comments yet.</p>
        )}

        <form onSubmit={handleSubmit} className="comment-form">
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Share your thoughts"
            rows="4"
            disabled={submitting}
          />
          <button type="submit" disabled={submitting || !commentText.trim()}>
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </form>
      </section>
    </main>
  );
}

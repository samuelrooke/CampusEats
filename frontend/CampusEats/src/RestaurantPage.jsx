
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
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

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

  // Fetch comments for this restaurant
  useEffect(() => {
    async function fetchComments() {
      setCommentsLoading(true);
      try {
        const decodedName = decodeURIComponent(name);
        const response = await fetch(`${API_BASE}/api/comments/${encodeURIComponent(decodedName)}`);
        if (!response.ok) throw new Error("Failed to fetch comments");
        const data = await response.json();
        setComments(data);
      } catch {
        // Comments fetch failure is not critical
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    }
    fetchComments();
  }, [name]);

  // Handle comment submission
  async function handleSubmitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setSubmittingComment(true);
    try {
      const decodedName = decodeURIComponent(name);
      const response = await fetch(`${API_BASE}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: decodedName,
          text: commentText,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit comment");
      
      // Clear form and refresh comments
      setCommentText("");
      const commentsResponse = await fetch(`${API_BASE}/api/comments/${encodeURIComponent(decodedName)}`);
      if (commentsResponse.ok) {
        const data = await commentsResponse.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  }

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

      {/* Comments Section */}
      <section className="comments-section">
        <h2>Comments</h2>
        
        {/* Comments List */}
        {commentsLoading ? (
          <p>Loading comments...</p>
        ) : comments.length > 0 ? (
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment-card">
                <p className="comment-text">{comment.text}</p>
                <p className="comment-date">
                  {new Date(comment.timestamp).toLocaleDateString("fi-FI")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>No comments yet.</p>
        )}

        {/* Comment Form */}
        <form onSubmit={handleSubmitComment} className="comment-form">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts"
            rows="4"
            disabled={submittingComment}
          />
          <button type="submit" disabled={submittingComment || !commentText.trim()}>
            {submittingComment ? "Posting." : "Post Comment"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default RestaurantPage;

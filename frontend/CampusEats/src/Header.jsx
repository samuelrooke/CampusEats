import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="header-brand" onClick={() => setOpen(false)}>
          <img src="/1.png" alt="CampusEats" className="header-logo" />
        </Link>

        <div className="hamburger-wrapper" ref={menuRef}>
          <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>

          {open && (
            <nav className="dropdown-nav">
              <Link to="/" className={`dropdown-link ${pathname === "/" ? "dropdown-link--active" : ""}`} onClick={() => setOpen(false)}>
                Menus
              </Link>
              <Link to="/admin/login" className={`dropdown-link ${pathname.startsWith("/admin") ? "dropdown-link--active" : ""}`} onClick={() => setOpen(false)}>
                Admin
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

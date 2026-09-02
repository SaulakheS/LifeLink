import { Link, useLocation } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const location = useLocation();

  return (
    <header className="ll-header">
      <div className="ll-header-container">
        <Link to="/" className="ll-logo-wrap">
          <div className="ll-logo-icon">❤</div>

          <div>
            <h1 className="ll-logo-text">LifeLink</h1>
            <p className="ll-logo-sub">Emergency Blood Network</p>
          </div>
        </Link>

        <nav className="ll-nav">
          <Link
            to="/"
            className={location.pathname === "/" ? "active-nav" : ""}
          >
            Home
          </Link>
        </nav>
      </div>
    </header>
  );
}
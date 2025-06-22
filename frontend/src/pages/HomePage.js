import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css"; // Styles for the homepage content itself

function HomePage() {
  return (
    <div className="homepage-container">
      {/* Header with auth links removed - main App.js nav handles this */}
      <main className="homepage-main-content">
        <h1 className="homepage-welcome-title">
          Welcome to the
          <br />
          Electronic Voting System
        </h1>
        <p className="homepage-subtitle">
          Securely cast your vote from anywhere.
        </p>
        <div className="homepage-cta mt-3">
          {/* This main call-to-action button is still good */}
          <Link to="/login" className="button-link button-large">
            Get Started / Login
          </Link>
        </div>
      </main>
      <footer className="homepage-footer">
        <p>
          © {new Date().getFullYear()} E-Voting System. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default HomePage;

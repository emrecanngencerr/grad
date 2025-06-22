import React, { useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../services/api";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      // Use the path defined in your Django urls.py for password reset request
      const response = await apiClient.post("password-reset/request/", {
        email,
      });
      setMessage(
        response.data.detail ||
          "If an account with this email exists, a password reset link has been sent. Please check your inbox (and spam folder)."
      );
    } catch (err) {
      // Backend should ideally always return 200 for this endpoint to prevent email enumeration,
      // but if it returns an error for invalid email format:
      setError(
        err.response?.data?.email?.[0] ||
          err.response?.data?.detail ||
          "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page login-page">
      {" "}
      {/* Re-use login-page style for card */}
      <h2>Forgot Your Password?</h2>
      <p style={{ marginBottom: "20px", color: "#555" }}>
        Enter your email address below, and if an account exists, we'll send you
        a link to reset your password.
      </p>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      {!message && ( // Hide form after success message
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Your Email Address:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="button-primary mt-2"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
      <p className="mt-3 text-center">
        Remembered your password? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default ForgotPasswordPage;

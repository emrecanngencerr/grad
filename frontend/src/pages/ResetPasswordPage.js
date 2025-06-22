import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import apiClient from "../services/api";

function ResetPasswordPage() {
  const { token } = useParams(); // Get token from URL
  const navigate = useNavigate();
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenIsValid, setTokenIsValid] = useState(null); // null: unknown, true: valid, false: invalid initial check

  // Optional: You could add a GET endpoint to pre-validate the token when page loads
  // For now, validation happens on POST.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword1.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword1 !== newPassword2) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.post("password-reset/confirm/", {
        token: token,
        new_password1: newPassword1,
        new_password2: newPassword2,
      });
      setMessage(
        response.data.detail ||
          "Password has been reset successfully! Redirecting to login..."
      );
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("Reset password error:", err.response?.data || err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          err.response?.data?.new_password1?.[0] ||
          err.response?.data?.new_password2?.[0] ||
          "Failed to reset password. The link may be invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page login-page">
      {" "}
      {/* Re-use login-page style */}
      <h2>Reset Your Password</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      {!message && ( // Hide form after success message
        <form onSubmit={handleSubmit}>
          <p style={{ marginBottom: "15px", color: "#555" }}>
            Enter your new password below.
          </p>
          <div>
            <label htmlFor="newPassword1">New Password:</label>
            <input
              type="password"
              id="newPassword1"
              value={newPassword1}
              onChange={(e) => setNewPassword1(e.target.value)}
              required
              autoFocus
            />
            <small
              style={{ display: "block", marginTop: "5px", color: "#666" }}
            >
              Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.
            </small>
          </div>
          <div>
            <label htmlFor="newPassword2">Confirm New Password:</label>
            <input
              type="password"
              id="newPassword2"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="button-primary mt-2"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
      {message && ( // Show login link only after success
        <p className="mt-3 text-center">
          <Link to="/login">Proceed to Login</Link>
        </p>
      )}
    </div>
  );
}

export default ResetPasswordPage;

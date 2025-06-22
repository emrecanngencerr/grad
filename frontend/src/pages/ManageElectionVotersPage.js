import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom"; // Removed unused Link for now
import apiClient from "../services/api";
import authService from "../services/authService";

// Define styles here or import from a CSS file
const formContainerStyle = {
  border: "1px solid #ccc",
  padding: "20px",
  marginBottom: "20px",
  backgroundColor: "#f9f9f9",
  borderRadius: "5px",
};
const buttonStyle = {
  padding: "10px 15px",
  marginRight: "10px",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  backgroundColor: "#007bff",
  color: "white",
};
const backButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#6c757d",
  marginTop: "20px",
};
const listItemStyle = {
  padding: "8px",
  borderBottom: "1px solid #eee",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

function ManageElectionVotersPage() {
  const navigate = useNavigate();
  const { electionId } = useParams();
  const [election, setElection] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [eligibleVoterIds, setEligibleVoterIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdminUser = authService.isAdmin();

  const fetchData = useCallback(async () => {
    if (!isAdminUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const electionResponse = await apiClient.get(
        `/admin/elections/${electionId}/`
      );
      setElection(electionResponse.data);
      setEligibleVoterIds(new Set(electionResponse.data.eligible_voters || []));

      // Ensure you have the /api/admin/users/ endpoint in your backend
      const usersResponse = await apiClient.get("/admin/users/");
      setAllUsers(usersResponse.data.results || usersResponse.data);
    } catch (err) {
      console.error("Fetch data for eligibility error:", err);
      setError(
        "Failed to load data. " +
          (err.response?.data?.detail || "Ensure admin users endpoint exists.")
      );
      if (err.response && err.response.status === 401) {
        authService.logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [electionId, isAdminUser, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isAdminUser) {
    return <Navigate to="/" replace />;
  }

  const handleToggleEligibility = (userId) => {
    const newSet = new Set(eligibleVoterIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setEligibleVoterIds(newSet);
  };

  const handleSaveChanges = async () => {
    setError("");
    setSuccess("");
    if (!election) return;

    const updatedElectionData = {
      eligible_voters: Array.from(eligibleVoterIds),
    };

    try {
      await apiClient.patch(
        `/admin/elections/${election.id}/`,
        updatedElectionData
      );
      setSuccess("Eligibility list updated successfully!");
    } catch (err) {
      console.error("Save eligibility error:", err.response);
      setError(
        "Failed to save changes. " +
          (err.response?.data?.detail ||
            err.response?.data?.eligible_voters ||
            "")
      );
    }
  };

  if (loading)
    return (
      <p className="text-center mt-3">Loading voter eligibility data...</p>
    );
  if (error && !election) return <p className="error-message mt-3">{error}</p>; // If election fetch failed
  if (!election)
    return (
      <p className="text-center mt-3">Election not found or failed to load.</p>
    );
  // If election loaded but user list failed and allUsers is empty but error is set for it.
  if (error && allUsers.length === 0)
    return <p className="error-message mt-3">{error}</p>;

  return (
    <div
      style={{ maxWidth: "800px", margin: "20px auto" }}
      className="container"
    >
      {" "}
      {/* Added container for consistency */}
      <h2>Manage Voter Eligibility for: {election.name}</h2>
      {success && <p className="success-message">{success}</p>}
      {error && !success && <p className="error-message">{error}</p>}{" "}
      {/* Show error only if no success message */}
      <div style={formContainerStyle}>
        <h3>Available Users</h3>
        <p>Select users who are eligible to vote in this election.</p>
        {allUsers.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              maxHeight: "300px",
              overflowY: "auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            {allUsers.map((user) => (
              <li key={user.id} style={listItemStyle}>
                <span>
                  {user.username} (ID: {user.id})
                </span>
                <input
                  type="checkbox"
                  checked={eligibleVoterIds.has(user.id)}
                  onChange={() => handleToggleEligibility(user.id)}
                  style={{ marginLeft: "10px", transform: "scale(1.2)" }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No users found or unable to load user list. Ensure the
            '/api/admin/users/' endpoint is working.
          </p>
        )}
      </div>
      <button
        onClick={handleSaveChanges}
        style={buttonStyle}
        className="button-success"
      >
        Save Changes
      </button>
      <button
        onClick={() => navigate("/admin/elections")}
        style={{ ...backButtonStyle, marginLeft: "0px" }}
        className="button-secondary"
      >
        Back to Manage Elections
      </button>
    </div>
  );
}

export default ManageElectionVotersPage;

import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import apiClient from "../services/api";
import authService from "../services/authService";
import Modal from "../components/Modal"; // Ensure this path is correct

// Removed inline style object definitions as we're relying on CSS classes

function ManageElectionsPage() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // State for the delete confirmation modal
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [electionToDelete, setElectionToDelete] = useState(null);

  // State for Tallying Modal
  const [showTallyModal, setShowTallyModal] = useState(false);
  const [electionToTally, setElectionToTally] = useState(null);
  const [rsaPrivateKeyPem, setRsaPrivateKeyPem] = useState("");
  const [tallyLoading, setTallyLoading] = useState(false);

  const isAdminUser = authService.isAdmin();

  const fetchAdminElections = useCallback(async () => {
    if (!isAdminUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(""); // Clear error before fetch
    // Keep successMessage to show feedback from previous action until new action
    try {
      const response = await apiClient.get("/admin/elections/");
      setElections(response.data.results || response.data);
    } catch (err) {
      console.error("Fetch admin elections error:", err.response || err);
      setError("Failed to load elections. Please try again.");
      if (err.response && err.response.status === 401) {
        authService.logout();
        window.dispatchEvent(new Event("authChange")); // Ensure nav updates
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [isAdminUser, navigate]);

  useEffect(() => {
    fetchAdminElections();
  }, [fetchAdminElections]);

  if (!isAdminUser) {
    return <Navigate to="/" replace />;
  }

  // --- Delete Modal Logic ---
  const handleOpenDeleteModal = (election) => {
    setElectionToDelete(election);
    setShowConfirmDeleteModal(true);
    setError("");
    setSuccessMessage(""); // Clear other messages when opening modal
  };

  const handleCloseDeleteModal = () => {
    setShowConfirmDeleteModal(false);
    setElectionToDelete(null);
  };

  const handleConfirmDeleteElection = async () => {
    if (!electionToDelete) return;
    setSuccessMessage("");
    setError("");
    try {
      await apiClient.delete(`/admin/elections/${electionToDelete.id}/`);
      setSuccessMessage(
        `Election "${electionToDelete.name}" deleted successfully.`
      );
      // Update local state for immediate UI feedback
      setElections((prevElections) =>
        prevElections.filter((election) => election.id !== electionToDelete.id)
      );
    } catch (err) {
      console.error("Delete election error:", err.response);
      setError(
        "Failed to delete election. " +
          (err.response?.data?.detail || "Please try again.")
      );
    } finally {
      handleCloseDeleteModal();
    }
  };

  // --- Tally Modal and Action Logic ---
  const handleOpenTallyModal = (election) => {
    setElectionToTally(election);
    setRsaPrivateKeyPem("");
    setError("");
    setSuccessMessage("");
    setShowTallyModal(true);
  };

  const handleCloseTallyModal = () => {
    setShowTallyModal(false);
    setElectionToTally(null);
    setRsaPrivateKeyPem("");
    // Don't clear general 'error' here if it was set by the tally process,
    // let it display in the modal. It will be cleared on next successful action or fetch.
  };

  const handleConfirmTallyAndSign = async () => {
    if (!electionToTally || !rsaPrivateKeyPem.trim()) {
      setError("Election RSA Private Key PEM is required to tally."); // Set error for modal
      return;
    }
    setTallyLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await apiClient.post(
        `/admin/elections/${electionToTally.id}/tally-and-sign-results/`,
        { election_rsa_private_key_pem: rsaPrivateKeyPem }
      );
      setSuccessMessage(
        response.data.message || "Results tallied and signed successfully!"
      );
      fetchAdminElections();
      handleCloseTallyModal();
    } catch (err) {
      console.error("Tally & Sign error:", err.response?.data || err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          "Failed to tally and sign results."
      );
      // Keep modal open on error so user can see the error message within it
    } finally {
      setTallyLoading(false);
    }
  };

  if (loading && elections.length === 0)
    return <p className="text-center mt-3">Loading elections data...</p>;
  // Show general page error if relevant (no modal open, no success message)
  if (error && !successMessage && !showTallyModal && !showConfirmDeleteModal) {
    return <p className="error-message mt-3">{error}</p>;
  }

  return (
    <div className="manage-elections-page container">
      <h2>Manage Elections</h2>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {/* General error display, hidden if a modal is active or success message present */}
      {error &&
        !successMessage &&
        !showTallyModal &&
        !showConfirmDeleteModal && (
          <p className="error-message mt-3">{error}</p>
        )}

      <Link
        to="/admin/elections/create"
        className="button-link button-success"
        style={{ marginBottom: "20px", display: "inline-block" }}
      >
        + Create New Election
      </Link>

      {elections.length === 0 && !loading ? (
        <p className="text-center mt-3">
          No elections found. Click "Create New Election" to add one.
        </p>
      ) : (
        <table className="data-table mt-2">
          <thead>
            <tr>
              <th className="table-header">Name</th>
              <th className="table-header">Start Time</th>
              <th className="table-header">End Time</th>
              <th className="table-header">Status</th>
              <th className="table-header">Tally Status</th>
              <th className="table-header actions-column-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {elections.map((election) => (
              <tr key={election.id}>
                <td className="table-cell">{election.name}</td>
                <td className="table-cell">
                  {new Date(election.start_time).toLocaleString()}
                </td>
                <td className="table-cell">
                  {new Date(election.end_time).toLocaleString()}
                </td>
                <td className="table-cell status-cell">
                  <div>
                    {election.is_open_for_voting ? (
                      <span className="status-open">Open for Voting</span>
                    ) : (
                      <span className="status-closed">Closed for Voting</span>
                    )}
                  </div>
                </td>
                <td className="table-cell">
                  {election.results_signature ? (
                    <span className="status-tallied">Tallied & Signed</span>
                  ) : (
                    <span className="status-not-tallied">Not Tallied</span>
                  )}
                </td>
                <td className="table-cell actions-cell">
                  <Link
                    to={`/admin/elections/edit/${election.id}`}
                    className="button-link button-warning"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/admin/elections/${election.id}/candidates`}
                    className="button-link button-info"
                  >
                    Candidates
                  </Link>

                  <a
                    href="#!"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenTallyModal(election);
                    }}
                    className="button-link tally-button"
                    role="button"
                    aria-label={`Tally and sign results for election ${election.name}`}
                  >
                    Tally & Sign
                  </a>

                  <Link
                    to={`/admin/results/${election.id}`}
                    className="button-link results-button"
                  >
                    View Results
                  </Link>
                  <a
                    href="#!" // Or "#" - prevents default link navigation
                    onClick={(e) => {
                      e.preventDefault(); // Important to prevent default <a> behavior
                      handleOpenDeleteModal(election);
                    }}
                    className="button-link delete-button" // Apply the same styling classes
                    role="button" // Good for accessibility to indicate it acts like a button
                    aria-label={`Delete election ${election.name}`}
                  >
                    Delete
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        onClick={() => navigate("/admin/dashboard")}
        className="button-secondary mt-3"
      >
        Back to Admin Dashboard
      </button>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={handleCloseDeleteModal}
        title="Confirm Deletion"
      >
        {electionToDelete && (
          <p>
            Are you sure you want to delete the election:{" "}
            <strong>"{electionToDelete.name}"</strong>?<br />
            This will also delete all its associated candidates and votes.
            <br />
            <strong>This action cannot be undone.</strong>
          </p>
        )}
        <div className="modal-footer">
          <button onClick={handleCloseDeleteModal} className="button-secondary">
            Cancel
          </button>
          <button
            onClick={handleConfirmDeleteElection}
            className="button-danger"
          >
            Confirm Delete
          </button>
        </div>
      </Modal>

      {/* Tally & Sign Modal */}
      <Modal
        isOpen={showTallyModal}
        onClose={handleCloseTallyModal}
        title={
          electionToTally
            ? `Tally & Sign Results for: ${electionToTally.name}`
            : "Tally & Sign Results"
        }
      >
        <p>
          To decrypt and tally the votes for this election, please provide the
          Election's RSA Private Key PEM.
        </p>
        <p className="text-danger font-weight-bold">
          {" "}
          {/* Example using utility classes if defined in App.css */}
          WARNING: This key is highly sensitive. Ensure you are in a secure
          environment. For a real system, this process would be handled
          differently.
        </p>

        {/* Error specific to tally modal, shown when modal is open and error state is set */}
        {error && showTallyModal && (
          <p className="error-message mt-1">{error}</p>
        )}

        <div className="form-group mt-2">
          {" "}
          {/* Assuming .form-group and .mt-2 are styled globally */}
          <label htmlFor="rsaPrivateKeyPem">
            Election RSA Private Key (PEM format):
          </label>
          <textarea
            id="rsaPrivateKeyPem"
            rows="8"
            className="form-input-override" // Use global styling for form inputs
            style={{
              fontFamily: "monospace",
              fontSize: "0.9em",
              resize: "vertical",
            }} // Keep specific font/resize
            value={rsaPrivateKeyPem}
            onChange={(e) => setRsaPrivateKeyPem(e.target.value)}
            placeholder="-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----" //
            for
            newline
            in
            disabled={tallyLoading}
          />
        </div>
        <div className="modal-footer">
          <button
            onClick={handleCloseTallyModal}
            className="button-secondary"
            disabled={tallyLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmTallyAndSign}
            className="button-primary" // Or button-success
            disabled={tallyLoading || !rsaPrivateKeyPem.trim()}
          >
            {tallyLoading ? "Processing..." : "Confirm Tally & Sign"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default ManageElectionsPage;

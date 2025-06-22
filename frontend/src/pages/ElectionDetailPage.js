import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../services/api";
// import jwt_decode from "jwt-decode"; // Not strictly needed if backend derives user from token
import authService from "../services/authService";
import Modal from "../components/Modal"; // Your Modal component
import "./ElectionDetailPage.css"; // Ensure this CSS file is created and imported

// A default placeholder image for candidates without a photo
// Make sure this path is correct relative to your public folder, or use an imported image
const defaultCandidateImage = "/images/default-candidate.png";

function ElectionDetailPage() {
  const { electionId } = useParams();
  const [election, setElection] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [candidateToConfirm, setCandidateToConfirm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [currentNonce, setCurrentNonce] = useState("");
  const [commitmentMade, setCommitmentMade] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isCastingVote, setIsCastingVote] = useState(false);

  const generateNonce = () => {
    // Use a cryptographically strong random number generator if possible
    if (window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint32Array(4); // 16 bytes of randomness
      window.crypto.getRandomValues(buffer);
      return Array.from(buffer, (dec) =>
        ("0" + dec.toString(16)).slice(-2)
      ).join(""); // Hex string
    } else {
      // Fallback for older browsers (less secure)
      return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
      );
    }
  };

  // --- Handler for making the commitment ---
  const handleMakeCommitment = async () => {
    if (!selectedCandidateId) {
      setError("Please select a candidate to make a commitment.");
      return;
    }
    setIsCommitting(true);
    setMessage("");
    setError("");

    const nonce = generateNonce();
    setCurrentNonce(nonce); // Store nonce for the reveal step

    try {
      await apiClient.post("/vote/commit/", {
        election_id: parseInt(electionId),
        candidate_id: parseInt(selectedCandidateId),
        nonce: nonce,
      });
      setMessage(
        "Your vote choice has been securely committed. Please proceed to cast your final vote."
      );
      setCommitmentMade(true); // Update UI to show "Cast Final Vote" button
    } catch (err) {
      console.error("Commitment error:", err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          "Failed to commit your vote choice."
      );
      setCurrentNonce(""); // Clear nonce on error
    } finally {
      setIsCommitting(false);
    }
  };

  const handleVoteAttempt = (e) => {
    if (e) e.preventDefault();
    if (!selectedCandidateId || !commitmentMade || !currentNonce) {
      setError(
        "Please make a commitment first or ensure a candidate is selected."
      );
      return;
    }
    const selectedCandidateObject = election?.candidates?.find(
      (c) => c.id.toString() === selectedCandidateId
    );
    if (selectedCandidateObject) {
      setCandidateToConfirm(selectedCandidateObject); // For modal display
      setIsConfirmModalOpen(true);
      setError("");
    } else {
      setError(
        "Error: Could not find details for the selected candidate. Please try re-selecting."
      );
    }
  };

  // --- actuallySubmitVote now includes the nonce ---
  const actuallySubmitVote = async () => {
    // This is called from the confirmation modal
    if (!selectedCandidateId || !election || !currentNonce) {
      /* ... error ... */ return;
    }

    setMessage("");
    setError("");
    setIsCastingVote(true); // New loading state for casting

    try {
      await apiClient.post("vote/", {
        // This is the "reveal" and encrypt endpoint
        election_id: parseInt(electionId),
        candidate_id: parseInt(selectedCandidateId),
        nonce: currentNonce, // <<< SEND THE NONCE
      });
      setMessage(
        "Vote cast successfully! Your encrypted vote has been recorded."
      );
      setCommitmentMade(false); // Reset for safety, though user can't vote again
      setCurrentNonce(""); // Clear nonce
      // setSelectedCandidateId(''); // Optionally clear selection
    } catch (err) {
      console.error(
        "Vote submission error:",
        err.response?.data || err.message
      );
      setError(
        err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          "Failed to cast vote. The commitment might be invalid, you might have already voted, or the election is closed."
      );
    } finally {
      setIsCastingVote(false);
      setIsConfirmModalOpen(false);
      setCandidateToConfirm(null);
    }
  };
  useEffect(() => {
    const fetchElectionDetail = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`elections/${electionId}/`);
        setElection(response.data);
        setError("");
      } catch (err) {
        console.error("Fetch election error:", err);
        setError("Failed to load election details.");
        if (err.response && err.response.status === 401) {
          authService.logout();
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchElectionDetail();
  }, [electionId, navigate]);

  const handleClearSelection = () => {
    setSelectedCandidateId("");
  };

  const handleShowResults = () => {
    navigate(`/admin/results/${electionId}`);
  };

  if (loading)
    return <p className="text-center mt-3">Loading election details...</p>;
  if (error && !election) return <p className="error-message mt-3">{error}</p>;
  if (!election) return <p className="text-center mt-3">Election not found.</p>;

  return (
    <div className="election-detail-page-container container">
      <h2>{election.name}</h2>
      <p className="election-description">{election.description}</p>
      <p>
        <strong>Voting Period:</strong>{" "}
        {new Date(election.start_time).toLocaleString()} -{" "}
        {new Date(election.end_time).toLocaleString()}
      </p>

      {message && <p className="success-message">{message}</p>}
      {error && !message && <p className="error-message">{error}</p>}

      {!election.is_open_for_voting && (
        <p className="warning-message mt-2">
          This election is not currently open for voting.
        </p>
      )}

      {election.is_open_for_voting &&
        !(message && message.includes("Vote cast successfully!")) && (
          // If using the simpler button structure where form onSubmit is only for reveal:
          <form onSubmit={handleVoteAttempt} className="mt-3 voting-form">
            {/* If using the structure where the button type changes:
        <form 
            onSubmit={commitmentMade ? handleVoteAttempt : (e) => { e.preventDefault(); handleMakeCommitment(); }} 
            className="mt-3 voting-form"
        >
        */}
            <h3>Select a Candidate:</h3>
            {election.candidates && election.candidates.length > 0 ? (
              <div className="candidates-horizontal-container">
                {election.candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`candidate-card ${
                      selectedCandidateId === candidate.id.toString()
                        ? "selected"
                        : ""
                    } ${
                      commitmentMade ||
                      (message && message.includes("Vote cast successfully!"))
                        ? "disabled"
                        : ""
                    }`} // Disable after commit OR final vote
                    onClick={() => {
                      // Allow selection only before commitment AND before final vote success message
                      if (
                        !commitmentMade &&
                        !(
                          message && message.includes("Vote cast successfully!")
                        )
                      ) {
                        setSelectedCandidateId(candidate.id.toString());
                      }
                    }}
                  >
                    <input
                      type="radio"
                      id={`candidate-radio-${candidate.id}`}
                      name="candidate_selection"
                      value={candidate.id}
                      checked={selectedCandidateId === candidate.id.toString()}
                      onChange={(e) => {
                        if (
                          !commitmentMade &&
                          !(
                            message &&
                            message.includes("Vote cast successfully!")
                          )
                        )
                          setSelectedCandidateId(e.target.value);
                      }}
                      className="candidate-radio-input"
                      disabled={
                        commitmentMade ||
                        (message && message.includes("Vote cast successfully!"))
                      } // Disable after commit OR final vote
                    />
                    <label
                      htmlFor={`candidate-radio-${candidate.id}`}
                      className="candidate-card-label"
                    >
                      {/* ... img, name, description ... */}
                      <img
                        src={candidate.photo_url || defaultCandidateImage}
                        alt={candidate.name}
                        className="candidate-photo"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = defaultCandidateImage;
                        }}
                      />
                      <div className="candidate-name">{candidate.name}</div>
                      {candidate.description && (
                        <p className="candidate-card-description">
                          <small>{candidate.description}</small>
                        </p>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p>No candidates available for this election.</p>
            )}

            {/* Action Buttons within the form */}
            {election.candidates && election.candidates.length > 0 && (
              <div className="vote-actions-footer mt-3">
                {!commitmentMade ? (
                  <button
                    type="button" // This button explicitly calls handleMakeCommitment
                    onClick={handleMakeCommitment}
                    className="button-primary"
                    disabled={
                      !selectedCandidateId ||
                      isCommitting ||
                      (message && message.includes("Vote cast successfully!")) // Also disable if final vote done
                    }
                  >
                    {isCommitting ? "Committing..." : "Commit Your Choice"}
                  </button>
                ) : (
                  // This button is type="submit" for the form, form's onSubmit={handleVoteAttempt}
                  <button
                    type="submit"
                    className="button-success"
                    disabled={
                      isCastingVote ||
                      (message && message.includes("Vote cast successfully!"))
                    }
                  >
                    {isCastingVote
                      ? "Casting Vote..."
                      : "Cast Final Vote (Reveal)"}
                  </button>
                )}

                {selectedCandidateId &&
                  !commitmentMade && // Only show if not committed
                  !(message && message.includes("Vote cast successfully!")) && ( // And if final vote not done
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="button-secondary"
                      style={{ marginLeft: "10px" }}
                    >
                      Clear Selection
                    </button>
                  )}
              </div>
            )}
          </form>
        )}

      {/* Navigation buttons */}
      <div className="mt-3 page-actions">
        <button
          onClick={() => navigate("/elections")}
          className="button-secondary mr-1"
        >
          Back to Elections
        </button>
        <button onClick={handleShowResults} className="button-secondary">
          View Results
        </button>
      </div>

      {/* Confirmation Modal for Voting */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setCandidateToConfirm(null);
        }}
        title="Confirm Your Vote"
      >
        {candidateToConfirm ? (
          <p>
            You are about to vote for:{" "}
            <strong>{candidateToConfirm.name}</strong>.
          </p>
        ) : (
          <p>Are you sure you want to cast this vote?</p>
        )}
        <p>This action cannot be undone once confirmed.</p>
        <div
          className="modal-footer"
          style={{ marginTop: "20px", textAlign: "right" }}
        >
          <button
            onClick={() => {
              setIsConfirmModalOpen(false);
              setCandidateToConfirm(null);
            }}
            className="button-secondary"
          >
            Cancel
          </button>
          <button
            onClick={actuallySubmitVote}
            className="button-success"
            style={{ marginLeft: "10px" }}
          >
            Confirm Vote
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default ElectionDetailPage;

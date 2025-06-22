import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom"; // Keep Link for navigation
import apiClient from "../services/api";
import Modal from "../components/Modal"; // Import your Modal component

function ElectionListPage() {
  // State for fetched data
  const [allElections, setAllElections] = useState([]); // Stores the original full list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for the "View Details" modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedElectionForDetails, setSelectedElectionForDetails] =
    useState(null);

  // State for Search and Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name_asc"); // Default sort: name ascending

  useEffect(() => {
    const fetchElections = async () => {
      setLoading(true);
      setError(""); // Clear previous errors
      try {
        const response = await apiClient.get("elections/");
        setAllElections(response.data.results || response.data); // Handle DRF pagination
      } catch (err) {
        setError("Failed to fetch elections. Please try again later.");
        console.error("Fetch election list error:", err);
        // Consider specific error handling for 401 (authService.logout(); navigate('/login');) if applicable
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, []); // Empty dependency array: fetch only once on mount

  // Memoized derived state for displayed elections (filtered and sorted)
  const displayedElections = useMemo(() => {
    let processedElections = [...allElections];

    // 1. Filter by searchTerm (case-insensitive)
    if (searchTerm.trim() !== "") {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processedElections = processedElections.filter(
        (election) =>
          election.name.toLowerCase().includes(lowerSearchTerm) ||
          (election.description &&
            election.description.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // 2. Sort
    switch (sortBy) {
      case "name_asc":
        processedElections.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        processedElections.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "start_asc":
        processedElections.sort(
          (a, b) => new Date(a.start_time) - new Date(b.start_time)
        );
        break;
      case "start_desc":
        processedElections.sort(
          (a, b) => new Date(b.start_time) - new Date(a.start_time)
        );
        break;
      case "end_asc":
        processedElections.sort(
          (a, b) => new Date(a.end_time) - new Date(b.end_time)
        );
        break;
      case "end_desc":
        processedElections.sort(
          (a, b) => new Date(b.end_time) - new Date(a.end_time)
        );
        break;
      default:
        // No default sorting or keep as is
        break;
    }
    return processedElections;
  }, [allElections, searchTerm, sortBy]);

  // --- Modal Handlers ---
  const handleOpenDetailsModal = (election) => {
    setSelectedElectionForDetails(election);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedElectionForDetails(null); // Clear selection when closing
  };

  // --- Conditional rendering for loading/error ---
  if (loading) return <p className="text-center mt-3">Loading elections...</p>;
  if (error) return <p className="error-message mt-3">{error}</p>;

  // --- JSX ---
  return (
    <div className="election-list-page container">
      {" "}
      {/* Add a page-specific class and container */}
      <h2>Available Elections</h2>
      {/* Search and Sort UI Controls */}
      <div
        className="elections-controls"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
          padding: "15px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.07)",
        }}
      >
        <input
          type="text"
          placeholder="Search elections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "10px",
            width: "60%",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            minWidth: "200px",
          }}
        >
          <option value="name_asc">Sort by Name (A-Z)</option>
          <option value="name_desc">Sort by Name (Z-A)</option>
          <option value="start_asc">Sort by Start Date (Oldest)</option>
          <option value="start_desc">Sort by Start Date (Newest)</option>
          <option value="end_asc">Sort by End Date (Ending Soonest)</option>
          <option value="end_desc">Sort by End Date (Ending Latest)</option>
        </select>
      </div>
      {/* Elections List */}
      {displayedElections.length === 0 ? (
        <p className="text-center mt-3">
          {searchTerm
            ? "No elections match your search criteria."
            : "No elections are currently available."}
        </p>
      ) : (
        <div className="elections-grid">
          {" "}
          {/* Changed from ul to div for more flexible styling if needed */}
          {displayedElections.map((election) => (
            <div key={election.id} className="election-list-item">
              {" "}
              {/* Uses class from App.css */}
              <Link
                to={`/elections/${election.id}`}
                className="election-name-link"
              >
                {election.name}
              </Link>
              <div className="election-item-actions">
                <span
                  className={
                    election.is_open_for_voting
                      ? "status-open"
                      : "status-closed"
                  }
                >
                  {election.is_open_for_voting ? "Open" : "Closed"}
                </span>
                <button
                  onClick={() => handleOpenDetailsModal(election)}
                  className="button-secondary button-small" // Using global button styles
                  style={{
                    marginLeft: "15px",
                    padding: "5px 10px",
                    fontSize: "0.85em",
                  }} // Quick small button
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Election Details Modal */}
      {selectedElectionForDetails && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          title={`Election Details: ${selectedElectionForDetails.name}`}
        >
          <p>
            <strong>Description:</strong>{" "}
            {selectedElectionForDetails.description || "N/A"}
          </p>
          <p>
            <strong>Starts:</strong>{" "}
            {new Date(selectedElectionForDetails.start_time).toLocaleString()}
          </p>
          <p>
            <strong>Ends:</strong>{" "}
            {new Date(selectedElectionForDetails.end_time).toLocaleString()}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {selectedElectionForDetails.is_open_for_voting ? (
              <span style={{ color: "green", fontWeight: "bold" }}>
                Open for Voting
              </span>
            ) : (
              <span style={{ color: "red", fontWeight: "bold" }}>Closed</span>
            )}
          </p>
          <div
            className="modal-footer"
            style={{ marginTop: "20px", textAlign: "right" }}
          >
            <Link
              to={`/elections/${selectedElectionForDetails.id}`}
              className="button-link" // Style Link as a button (defined in App.css)
              onClick={handleCloseDetailsModal} // Close modal when navigating
            >
              Go to Voting Page
            </Link>
            <button
              onClick={handleCloseDetailsModal}
              className="button-secondary"
              style={{ marginLeft: "10px" }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ElectionListPage;

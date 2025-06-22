import React, { useState, useEffect, useCallback, useRef } from "react"; // Add useRef
import { useParams, useNavigate, Navigate } from "react-router-dom"; // Link is not used, so removed
import apiClient from "../services/api";
import authService from "../services/authService";

const tableHeaderStyle = {
  border: "1px solid #ddd",
  padding: "8px",
  textAlign: "left",
  backgroundColor: "#f2f2f2",
  fontWeight: "bold",
};

const tableCellStyle = {
  border: "1px solid #ddd",
  padding: "8px",
  textAlign: "left",
  verticalAlign: "middle", // Good for aligning image with text
};
// --- END OF STYLE DEFINITIONS ---

// It's good practice to keep styles separate, but for this example, they are here.
// In a real app, move these to a CSS file.
const formContainerStyle = {
  border: "1px solid #ccc",
  padding: "20px",
  marginBottom: "20px",
  backgroundColor: "#f9f9f9",
  borderRadius: "5px",
};

const inputStyle = {
  width: "calc(100% - 16px)",
  padding: "8px",
  marginBottom: "10px",
  border: "1px solid #ccc",
  borderRadius: "4px",
};

function ManageCandidatesPage() {
  const navigate = useNavigate();
  const { electionId } = useParams();

  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);

  const defaultCandidateImage = "/images/default-candidate.png";

  // --- STATE CHANGES START HERE ---
  // State for the form's input values
  const [candidateName, setCandidateName] = useState("");
  const [candidateDescription, setCandidateDescription] = useState("");
  const [candidatePhoto, setCandidatePhoto] = useState(null); // For the new File object
  const [previewPhoto, setPreviewPhoto] = useState(null); // For the new file's client-side preview URL
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(""); // To hold URL of existing photo
  const [formError, setFormError] = useState("");

  const fileInputRef = useRef(null); // To trigger file input click
  // --- STATE CHANGES END HERE ---

  const isAdminUser = authService.isAdmin();

  const fetchElectionAndCandidates = useCallback(async () => {
    // ... (This function is good as is)
    if (!isAdminUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const electionResponse = await apiClient.get(
        `/admin/elections/${electionId}/`
      );
      setElection(electionResponse.data);
      setCandidates(electionResponse.data.candidates || []);
    } catch (err) {
      console.error("Fetch election/candidates error:", err);
      setError("Failed to load election or candidate data. Please try again.");
      if (err.response && err.response.status === 401) {
        authService.logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [electionId, isAdminUser, navigate]);

  useEffect(() => {
    fetchElectionAndCandidates();
  }, [fetchElectionAndCandidates]);

  if (!isAdminUser) return <Navigate to="/" replace />;
  if (loading) return <p>Loading candidates data...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!election) return <p>Election details could not be loaded.</p>;

  // --- EVENT HANDLER CHANGES START HERE ---
  const handleShowAddForm = () => {
    setIsAdding(true);
    setIsEditing(null);
    setCandidateName("");
    setCandidateDescription("");
    setCandidatePhoto(null);
    setPreviewPhoto(null);
    setCurrentPhotoUrl(""); // No current photo for a new candidate
    setFormError("");
  };

  const handleShowEditForm = (candidateToEdit) => {
    setIsEditing(candidateToEdit);
    setIsAdding(false);
    setCandidateName(candidateToEdit.name);
    setCandidateDescription(candidateToEdit.description || "");
    setCandidatePhoto(null); // Clear any previously selected new file
    setPreviewPhoto(null); // Clear any old preview
    setCurrentPhotoUrl(candidateToEdit.photo_url || ""); // Set the URL of the existing photo
    setFormError("");
  };

  const handleFileChange = (e) => {
    // Renamed from handlePhotoChange for clarity
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        setFormError("File is too large. Maximum size is 2MB.");
        setCandidatePhoto(null);
        setPreviewPhoto(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setCandidatePhoto(file);
      setPreviewPhoto(URL.createObjectURL(file));
      setFormError("");
    }
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setIsEditing(null);
    setCandidateName("");
    setCandidateDescription("");
    setCandidatePhoto(null);
    setPreviewPhoto(null);
    setCurrentPhotoUrl("");
    setFormError("");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!candidateName.trim()) {
      setFormError("Candidate name is required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", candidateName.trim());
    formData.append("description", candidateDescription.trim());
    formData.append("election", parseInt(electionId));

    // Only append photo if a new one was selected
    if (candidatePhoto) {
      formData.append("photo", candidatePhoto);
    }

    const requestMethod = isEditing ? apiClient.patch : apiClient.post; // Use PATCH for edits to avoid sending unchanged data
    const requestUrl = isEditing
      ? `/admin/candidates/${isEditing.id}/`
      : "/admin/candidates/";

    try {
      await requestMethod(requestUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(`Candidate ${isEditing ? "updated" : "added"} successfully!`);
      handleCancelForm();
      fetchElectionAndCandidates();
    } catch (err) {
      // ... (existing error handling for form submit) ...
      console.error("Candidate form submission error:", err.response);
      const backendError = err.response?.data;
      let readableError = "Failed to save candidate. ";
      if (backendError) {
        if (backendError.name)
          readableError += `Name: ${backendError.name.join(", ")} `;
        if (backendError.description)
          readableError += `Description: ${backendError.description.join(
            ", "
          )} `;
        if (backendError.photo)
          readableError += `Photo: ${backendError.photo.join(", ")} `;
        if (backendError.detail) readableError += backendError.detail;
      }
      setFormError(readableError.trim());
    }
  };

  const handleDeleteCandidate = async (candidateIdToDelete) => {
    // ... (This function is good as is)
    if (
      window.confirm(
        "Are you sure you want to delete this candidate? This action cannot be undone."
      )
    ) {
      try {
        await apiClient.delete(`/admin/candidates/${candidateIdToDelete}/`);
        alert("Candidate deleted successfully.");
        setCandidates((prevCandidates) =>
          prevCandidates.filter((c) => c.id !== candidateIdToDelete)
        );
      } catch (err) {
        console.error("Delete candidate error:", err.response);
        alert(
          "Failed to delete candidate. " +
            (err.response?.data?.detail || "Please try again.")
        );
      }
    }
  };
  // --- EVENT HANDLER CHANGES END HERE ---

  return (
    <div>
      <h2>Manage Candidates for: {election.name}</h2>
      {!isAdding && !isEditing && (
        <button onClick={handleShowAddForm} className="button-success mb-2">
          + Add New Candidate
        </button>
      )}

      {/* Add/Edit Candidate Form */}
      {(isAdding || isEditing) && (
        <div style={formContainerStyle}>
          <h3>
            {isEditing
              ? `Edit Candidate: ${isEditing.name}`
              : "Add New Candidate"}
          </h3>
          {formError && <p className="error-message">{formError}</p>}
          <form onSubmit={handleFormSubmit} encType="multipart/form-data">
            <div>
              <label htmlFor="candidateName">Name:</label>
              <input
                style={inputStyle}
                type="text"
                id="candidateName"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="candidateDescription">
                Description (Optional):
              </label>
              <textarea
                style={{ ...inputStyle, height: "80px" }}
                id="candidateDescription"
                value={candidateDescription}
                onChange={(e) => setCandidateDescription(e.target.value)}
              />
            </div>

            {/* --- JSX CHANGES START HERE --- */}
            <div>
              <label>Photo (Optional):</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  marginTop: "10px",
                }}
              >
                {/* Image Preview Area */}
                <div style={{ border: "1px dashed #ccc", padding: "5px" }}>
                  {previewPhoto ? ( // If a new photo is being previewed
                    <img
                      src={previewPhoto}
                      alt="New Preview"
                      style={{
                        width: "100px",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                  ) : currentPhotoUrl ? ( // If there's an existing photo
                    <img
                      src={currentPhotoUrl}
                      alt="Current"
                      style={{
                        width: "100px",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                  ) : (
                    // If no photo exists at all
                    <div
                      style={{
                        width: "100px",
                        height: "100px",
                        backgroundColor: "#f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#888",
                        borderRadius: "4px",
                      }}
                    >
                      No Photo
                    </div>
                  )}
                </div>
                {/* File Input and Action Buttons */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    ref={fileInputRef}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="button-secondary"
                  >
                    {currentPhotoUrl || previewPhoto
                      ? "Change Photo"
                      : "Upload Photo"}
                  </button>

                  {previewPhoto && ( // Show only when a new photo is selected for preview
                    <button
                      type="button"
                      onClick={() => {
                        setCandidatePhoto(null);
                        setPreviewPhoto(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="button-danger"
                      style={{ marginLeft: "10px" }}
                    >
                      Clear Selection
                    </button>
                  )}

                  {!previewPhoto &&
                    currentPhotoUrl && ( // Show only when there's an existing photo and no new preview
                      <button
                        type="button"
                        onClick={async () => {
                          // Example for inline remove
                          if (
                            window.confirm(
                              "Are you sure you want to remove this candidate's photo?"
                            )
                          ) {
                            try {
                              await apiClient.patch(
                                `/admin/candidates/${isEditing.id}/`,
                                { photo: null }
                              );
                              alert("Photo removed successfully.");
                              fetchElectionAndCandidates();
                              handleCancelForm();
                            } catch (err) {
                              setFormError("Failed to remove photo.");
                            }
                          }
                        }}
                        className="button-danger"
                        style={{ marginLeft: "10px" }}
                      >
                        Remove Photo
                      </button>
                    )}
                </div>
              </div>
            </div>
            {/* --- JSX CHANGES END HERE --- */}

            <div style={{ marginTop: "20px" }}>
              <button type="submit" className="button-primary mr-1">
                {isEditing ? "Update Candidate" : "Add Candidate"}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                className="button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Candidates List Table */}
      {candidates.length > 0 && !isAdding && !isEditing ? (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Photo</th> {/* Added Photo Header */}
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Description</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id}>
                <td style={tableCellStyle}>
                  <img
                    src={candidate.photo_url || defaultCandidateImage}
                    alt={candidate.name}
                    className="candidate-photo"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = defaultCandidateImage;
                    }} // Fallback if photo_url fails
                  />
                </td>
                <td style={tableCellStyle}>{candidate.name}</td>
                <td style={tableCellStyle}>{candidate.description || "-"}</td>
                <td style={tableCellStyle}>
                  <button
                    onClick={() => handleShowEditForm(candidate)}
                    className="button-warning mr-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCandidate(candidate.id)}
                    className="button-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        candidates.length === 0 &&
        !isAdding &&
        !isEditing && (
          <p>
            No candidates found for this election yet. Click "Add New Candidate"
            to start.
          </p>
        )
      )}

      <div style={{ marginTop: "30px" }}>
        <button
          onClick={() => navigate("/admin/elections")}
          className="button-secondary mr-1"
        >
          Back to Manage Elections
        </button>
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="button-secondary"
        >
          Back to Admin Dashboard
        </button>
      </div>
    </div>
  );
}

export default ManageCandidatesPage;

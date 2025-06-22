import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/api";
import authService from "../services/authService";
import DatePicker from "react-datepicker"; // For date and time picking
import "react-datepicker/dist/react-datepicker.css"; // Default styles for DatePicker
import "./CreateElectionPage.css"; // Your page-specific styles

// A simple reusable Modal (if not globally available, define or import one)
// For this example, I'll assume a basic modal structure is handled by CSS for .modal-overlay and .modal-content
// You can use the Modal component we created earlier: import Modal from '../components/Modal';

function CreateElectionPage() {
  const navigate = useNavigate();

  // Election Details State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // Use Date objects for DatePicker state
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000) // Default: 7 days from now
  );
  const [isActive, setIsActive] = useState(true);

  // Candidate Management State
  const [candidates, setCandidates] = useState([]); // Stores { name, description, photo (File object), preview (string URL) }
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    description: "",
    photo: null, // File object
    preview: null, // string URL for client-side preview
  });

  // Form Submission State
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!authService.isAdmin()) {
    // This should ideally be handled by AdminProtectedRoute wrapping this route in App.js
    navigate("/");
    return null;
  }

  // --- Candidate Handlers ---
  const handleNewCandidatePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit example
        alert("Image file is too large. Max 2MB allowed.");
        e.target.value = null; // Clear the file input
        return;
      }
      setNewCandidate({
        ...newCandidate,
        photo: file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  const handleAddCandidateToList = () => {
    if (newCandidate.name.trim()) {
      setCandidates([...candidates, { ...newCandidate }]); // Add the whole newCandidate object (name, desc, photo file, preview url)
      setNewCandidate({
        name: "",
        description: "",
        photo: null,
        preview: null,
      }); // Reset form
      setShowAddCandidateModal(false); // Close modal
    } else {
      alert("Candidate name is required."); // Simple validation
    }
  };

  const handleRemoveCandidateFromList = (indexToRemove) => {
    const candidateToRemove = candidates[indexToRemove];
    if (candidateToRemove.preview) {
      URL.revokeObjectURL(candidateToRemove.preview); // Clean up object URL if it was created for preview
    }
    setCandidates(candidates.filter((_, index) => index !== indexToRemove));
  };

  // --- Main Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Election Name is required.");
      return;
    }
    if (startDate >= endDate) {
      setError("End time must be after the start time.");
      return;
    }
    if (candidates.length < 2) {
      setError("At least two candidates are required for an election.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("start_time", startDate.toISOString()); // Use Date object state
    formData.append("end_time", endDate.toISOString()); // Use Date object state
    formData.append("is_active", isActive);

    // Append candidates' textual data as a JSON string under a single key
    const candidatesTextData = candidates.map((c) => ({
      name: c.name,
      description: c.description,
    }));
    formData.append("candidates_json", JSON.stringify(candidatesTextData));

    // Append candidate photo files individually, matching backend expectation
    // Example: backend expects 'candidate_photo_0', 'candidate_photo_1', etc.
    candidates.forEach((candidate, index) => {
      if (candidate.photo) {
        // candidate.photo is the File object
        formData.append(
          `candidate_photo_${index}`,
          candidate.photo,
          candidate.photo.name
        );
      }
    });

    // For debugging FormData:
    // for (let [key, value] of formData.entries()) {
    //   console.log(`${key}: ${value}`);
    // }

    try {
      await apiClient.post("/admin/elections/", formData, {
        headers: { "Content-Type": "multipart/form-data" }, // Axios usually sets this for FormData
      });
      setSuccess(
        "Election created successfully! Redirecting to manage elections..."
      );
      setTimeout(() => navigate("/admin/elections"), 2000);
    } catch (err) {
      console.error(
        "Create election error:",
        err.response?.data || err.message
      );
      let errorMsg = "Failed to create election.";
      if (err.response && err.response.data) {
        const data = err.response.data;
        // Try to get more specific error messages
        if (data.name) errorMsg = `Name: ${data.name[0]}`;
        else if (data.start_time)
          errorMsg = `Start Time: ${data.start_time[0]}`;
        else if (data.end_time) errorMsg = `End Time: ${data.end_time[0]}`;
        else if (data.candidates_json)
          errorMsg = `Candidates: ${data.candidates_json[0]}`;
        else if (data.detail) errorMsg = data.detail;
        else if (typeof data === "object")
          errorMsg = Object.values(data).flat().join(" ; ");
      }
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-election-page container">
      {" "}
      {/* Ensure .container provides padding/max-width */}
      <h2>Create New Election</h2>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}
      <form onSubmit={handleSubmit} className="create-election-form">
        {/* Election Details Section */}
        <div className="form-section">
          <h3>Election Details</h3>
          <div className="form-group">
            <label htmlFor="name">Election Name:</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description (Optional):</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="start_time">Start Time:</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              className="form-input-override" // For custom styling (defined in App.css or page CSS)
              minDate={new Date()}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="end_time">End Time:</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              className="form-input-override"
              minDate={startDate || new Date()} // End date must be after or same as start date
              required
            />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Activate Election Immediately?
            </label>
          </div>
        </div>

        <hr style={{ margin: "30px 0" }} />

        {/* Candidates Section */}
        <div className="form-section">
          <h3>Candidates</h3>
          <div className="candidates-list-preview">
            {candidates.map((candidate, index) => (
              <div key={index} className="candidate-item-preview">
                <div className="candidate-info-preview">
                  {candidate.preview && ( // Use the preview URL from the candidate object
                    <img
                      src={candidate.preview}
                      alt={candidate.name}
                      className="candidate-preview-img-small"
                    />
                  )}
                  <div>
                    <strong>{candidate.name}</strong>
                    {candidate.description && (
                      <p className="candidate-desc-small">
                        {candidate.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCandidateFromList(index)}
                  className="button-danger button-small"
                >
                  Remove
                </button>
              </div>
            ))}
            {candidates.length === 0 && (
              <p style={{ color: "#777", textAlign: "center" }}>
                No candidates added yet.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAddCandidateModal(true)}
            className="button-secondary mt-1"
            style={{ display: "block", margin: "10px auto" }}
          >
            + Add Candidate
          </button>
        </div>

        {/* Form Actions */}
        <div className="form-actions mt-3">
          <button
            type="submit"
            className="button-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Creating Election..."
              : "Create Election & Add Candidates"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="button-secondary"
          >
            Cancel & Back to Dashboard
          </button>
        </div>
      </form>
      {/* Add Candidate Modal */}
      {showAddCandidateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddCandidateModal(false)}
        >
          {" "}
          {/* Close on overlay click */}
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {" "}
            {/* Prevent closing on modal content click */}
            <h3>Add New Candidate</h3>
            <div className="form-group">
              <label htmlFor="candidate-name">Candidate Name:</label>
              <input
                type="text"
                id="candidate-name"
                value={newCandidate.name}
                onChange={(e) =>
                  setNewCandidate({ ...newCandidate, name: e.target.value })
                }
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="candidate-description">
                Description (Optional):
              </label>
              <textarea
                id="candidate-description"
                value={newCandidate.description}
                onChange={(e) =>
                  setNewCandidate({
                    ...newCandidate,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="candidate-photo">Photo (Optional):</label>
              <input
                type="file"
                id="candidate-photo"
                accept="image/*"
                onChange={handleNewCandidatePhotoChange}
              />
              {newCandidate.preview && (
                <img
                  src={newCandidate.preview}
                  alt="Candidate Preview"
                  className="candidate-preview-img"
                  style={{
                    marginTop: "10px",
                    maxWidth: "150px",
                    maxHeight: "150px",
                  }}
                />
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={handleAddCandidateToList}
                className="button-primary"
              >
                {" "}
                Add Candidate to List{" "}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddCandidateModal(false);
                  setNewCandidate({
                    name: "",
                    description: "",
                    photo: null,
                    preview: null,
                  });
                }}
                className="button-secondary"
              >
                {" "}
                Cancel{" "}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateElectionPage;

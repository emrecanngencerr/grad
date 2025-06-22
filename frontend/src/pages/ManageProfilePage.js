import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom"; // No Link needed here directly unless added for other purposes
import apiClient from "../services/api";
import authService from "../services/authService";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function ManageProfilePage() {
  const navigate = useNavigate();

  // State for profile details
  const [currentUser, setCurrentUser] = useState(null); // Stores the full user object from API
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profilePicture, setProfilePicture] = useState(null); // For new file object
  const [previewImage, setPreviewImage] = useState(null); // For displaying client-side preview
  const [currentImageUrl, setCurrentImageUrl] = useState(""); // To show existing image from server

  // State for password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthDateObj, setBirthDateObj] = useState(null); // For DatePicker
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // General messages for profile details update
  const [message, setMessage] = useState(""); // Success message for profile details
  const [error, setError] = useState(""); // Error message for profile details

  const defaultProfileImage = "images/default-candidate.png";

  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Fetch initial profile data
  useEffect(() => {
    const initialUserInfo = authService.getUserInfo(); // Get from localStorage first for quick display
    if (!initialUserInfo) {
      navigate("/login"); // Should ideally be caught by ProtectedRoute
      return;
    }
    // Pre-fill from localStorage if available, then fetch fresh
    setFirstName(initialUserInfo.first_name || "");
    setLastName(initialUserInfo.last_name || "");
    setCurrentImageUrl(initialUserInfo.profile_picture_url || "");

    setLoading(true);
    apiClient
      .get("/user/me/")
      .then((response) => {
        setCurrentUser(response.data);
        setFirstName(response.data.first_name || "");
        setLastName(response.data.last_name || "");
        setIdentityNumber(response.data.identity_number || "");
        setBirthDate(response.data.birth_date || "");
        setCurrentImageUrl(response.data.profile_picture_url || "");
        setError(""); // Clear previous page load errors
      })
      .catch((err) => {
        console.error("Failed to fetch profile", err);
        setError(
          "Could not load up-to-date profile data. Some information may be outdated."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  // Handler for file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // Example: 2MB limit
        setError("File is too large. Maximum size is 2MB.");
        setProfilePicture(null);
        setPreviewImage(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the file input
        return;
      }
      setProfilePicture(file);
      setPreviewImage(URL.createObjectURL(file));
      setError(""); // Clear previous file errors
    }
  };

  // Handler for removing profile picture
  const handleRemovePicture = async () => {
    if (
      window.confirm("Are you sure you want to remove your profile picture?")
    ) {
      setMessage("");
      setError("");
      setPasswordMessage("");
      setPasswordError("");
      try {
        await apiClient.put("/user/me/", { profile_picture: null }); // Backend handles null as removal
        setMessage("Profile picture removed successfully.");
        setCurrentImageUrl("");
        setPreviewImage(null);
        setProfilePicture(null);
        await authService.refreshCurrentUserInfo();
        window.dispatchEvent(new Event("profileUpdated"));
      } catch (err) {
        setError(
          err.response?.data?.detail || "Failed to remove profile picture."
        );
      }
    }
  };

  // Handler for submitting profile detail changes (name, picture)
  const handleSubmitProfileDetails = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setPasswordMessage("");
    setPasswordError("");

    const formData = new FormData();
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    if (profilePicture) {
      // Only append if a new picture is selected
      formData.append("profile_picture", profilePicture);
    }
    // If profilePicture is null but user wants to keep existing, don't send 'profile_picture'
    // If user selected a new picture, profilePicture will be a File object.
    // If user wants to remove, handleRemovePicture should be used, or send profile_picture: null explicitly.

    try {
      const response = await apiClient.put("/user/me/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Profile details updated successfully!");
      setCurrentUser(response.data); // Update local state for currentUser
      setCurrentImageUrl(response.data.profile_picture_url || "");
      setPreviewImage(null); // Clear preview
      setProfilePicture(null); // Clear selected file

      await authService.refreshCurrentUserInfo();
      window.dispatchEvent(new Event("profileUpdated"));
    } catch (err) {
      console.error("Profile update error:", err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.profile_picture?.[0] || // Example of specific field error
          (typeof err.response?.data === "object"
            ? Object.values(err.response.data).flat().join(" ")
            : "Failed to update profile.")
      );
    }
  };

  // Handler for submitting password change
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    setMessage("");
    setError("");

    // Basic frontend validation for password length
    const passwordErrors = [];
    if (newPassword1.length < 8) {
      passwordErrors.push("New password must be at least 8 characters long.");
    }
    // Add other frontend checks (uppercase, special char) if desired, though backend handles it
    if (newPassword1 !== newPassword2) {
      passwordErrors.push("New passwords do not match.");
    }

    if (passwordErrors.length > 0) {
      setPasswordError(passwordErrors.join(" "));
      return;
    }

    try {
      await apiClient.put("/user/change-password/", {
        old_password: oldPassword,
        new_password1: newPassword1,
        new_password2: newPassword2,
      });
      setPasswordMessage("Password changed successfully!");
      setOldPassword("");
      setNewPassword1("");
      setNewPassword2("");
    } catch (err) {
      console.error("Change password error:", err.response?.data || err);
      setPasswordError(
        err.response?.data?.detail ||
          err.response?.data?.old_password?.[0] ||
          err.response?.data?.new_password1?.[0] ||
          err.response?.data?.new_password2?.[0] ||
          (typeof err.response?.data === "object"
            ? Object.entries(err.response.data)
                .map(
                  ([key, value]) =>
                    `${key.replace("_", " ")}: ${
                      Array.isArray(value) ? value.join(" ") : value
                    }`
                )
                .join("; ")
            : "Failed to change password.")
      );
    }
  };

  // Conditional rendering for authentication, loading, and initial error
  if (!authService.getCurrentUserTokens()) {
    return <Navigate to="/login" replace />;
  }
  if (loading) return <p className="text-center mt-3">Loading profile...</p>;
  // If error occurred during initial load and currentUser is still null
  if (error && !currentUser && !message)
    return <p className="error-message mt-3">{error}</p>;

  return (
    <div className="manage-profile-page container">
      <h2>Manage Your Profile</h2>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form
        onSubmit={handleSubmitProfileDetails}
        encType="multipart/form-data"
        className="mb-3 profile-details-form"
      >
        <div className="profile-picture-section mb-3">
          <h4>Profile Picture</h4>
          <div style={{ marginBottom: "15px", textAlign: "center" }}>
            {previewImage ? (
              <img
                src={previewImage}
                alt="Preview"
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            ) : currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt="Current"
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = defaultProfileImage;
                }}
              />
            ) : (
              <img
                src={defaultProfileImage}
                alt="Default"
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            )}
          </div>
          <input
            type="file"
            accept="image/jpeg, image/png, image/gif" // Be more specific with accepted types
            onChange={handleFileChange}
            style={{ display: "none" }}
            ref={fileInputRef}
          />
          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="button-secondary mr-1"
            >
              Change Picture
            </button>
            {currentImageUrl && (
              <button
                type="button"
                onClick={handleRemovePicture}
                className="button-danger"
              >
                Remove Picture
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="firstName">First Name:</label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="lastName">Last Name:</label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="profileIdentityNumber">Identity Number (T.C.):</label>
          <input
            type="text"
            id="profileIdentityNumber"
            value={identityNumber}
            onChange={(e) =>
              setIdentityNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
            }
            maxLength="11"
            pattern="\d{11}"
            title="Must be 11 digits"
            required
            readOnly // Or disabled. Usually ID numbers are not user-editable after creation.
            // If editable, remove readOnly and ensure backend validation.
          />
        </div>
        <div>
          <label htmlFor="profileBirthDate">Birth Date:</label>
          <DatePicker
            selected={birthDateObj}
            onChange={(date) => {
              setBirthDateObj(date);
              setBirthDate(date ? date.toISOString().split("T")[0] : "");
            }}
            dateFormat="yyyy-MM-dd"
            placeholderText={birthDate || "YYYY-MM-DD"}
            className="form-control"
          />
        </div>
        <button type="submit" className="button-primary mt-2">
          Update Profile Details
        </button>
      </form>
      <hr style={{ margin: "40px 0" }} /> {/* Separator */}
      {/* Change Password Form */}
      <div className="change-password-form">
        <h3>Change Password</h3>
        {passwordMessage && (
          <p className="success-message">{passwordMessage}</p>
        )}
        {passwordError && <p className="error-message">{passwordError}</p>}
        <form onSubmit={handleChangePasswordSubmit}>
          <div>
            <label htmlFor="oldPassword">Current Password:</label>
            <input
              type="password"
              id="oldPassword"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword1">New Password:</label>
            <input
              type="password"
              id="newPassword1"
              value={newPassword1}
              onChange={(e) => setNewPassword1(e.target.value)}
              required
              aria-describedby="newPasswordHelp"
            />
            <small
              id="newPasswordHelp"
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
          <button type="submit" className="button-primary mt-2">
            Change Password
          </button>
        </form>
      </div>
      <button
        onClick={() => navigate("/")}
        className="button-secondary mt-3"
        style={{ display: "block", margin: "30px auto 0 auto" }}
      >
        Back to Home
      </button>
    </div>
  );
}

export default ManageProfilePage;

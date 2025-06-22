import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import "./ProfileDropdown.css"; // Ensure this CSS file exists and is styled

// A simple default profile icon
const DefaultProfileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="28px"
    height="28px"
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null); // To store user details like name, email, picture URL
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Function to update user info state from localStorage
    const updateUserInfoState = () => {
      const currentUserInfo = authService.getUserInfo();
      setUserInfo(currentUserInfo);
    };

    // Initial load of user info
    updateUserInfoState();

    // Listen for 'authChange' (login/logout)
    window.addEventListener("authChange", updateUserInfoState);
    // Listen for 'profileUpdated' (when user saves changes on ManageProfilePage)
    window.addEventListener("profileUpdated", updateUserInfoState);

    // Listener to close dropdown if clicked outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup listeners on component unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("authChange", updateUserInfoState);
      window.removeEventListener("profileUpdated", updateUserInfoState);
    };
  }, []); // Empty dependency array: setup listeners once on mount

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    authService.logout(); // Clears localStorage tokens and userInfo
    setIsOpen(false); // Close dropdown
    // 'authChange' event will be dispatched by authService.logout (if you add it there)
    // or AppContent's useEffect listening to 'authChange' will update its own state
    // Forcing an update to ensure ProfileDropdown itself disappears if tokens are gone:
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  // If there are no tokens (user not authenticated), don't render the dropdown
  if (!authService.getCurrentUserTokens()) {
    return null;
  }

  // Determine display name (more robustly checks userInfo)
  let userDisplayName = "User";
  if (userInfo) {
    if (userInfo.first_name && userInfo.last_name) {
      userDisplayName = `${userInfo.first_name} ${userInfo.last_name.charAt(
        0
      )}.`; // e.g., "John D."
    } else if (userInfo.first_name) {
      userDisplayName = userInfo.first_name;
    } else if (userInfo.email) {
      // Fallback to part of the email if no name
      userDisplayName = userInfo.email.split("@")[0];
    }
  }

  return (
    <div className="profile-dropdown-container" ref={dropdownRef}>
      <button onClick={toggleDropdown} className="profile-button">
        {/* Conditional rendering for profile picture */}
        {userInfo && userInfo.profile_picture_url ? (
          <img
            src={userInfo.profile_picture_url}
            alt="Profile"
            className="profile-avatar-nav" // Style this class in ProfileDropdown.css
          />
        ) : (
          <DefaultProfileIcon />
        )}
        <span className="profile-username-nav">{userDisplayName}</span>
        <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <ul className="dropdown-menu">
          {/* "Manage Profile" now comes first */}
          <li>
            <Link to="/manage-profile" onClick={() => setIsOpen(false)}>
              Manage Profile
            </Link>
          </li>
          {userInfo && userInfo.is_staff && (
            <li>
              <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}>
                Admin Panel
              </Link>
            </li>
          )}
          {/* "Logout" button now comes after other items */}
          <li>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

export default ProfileDropdown;

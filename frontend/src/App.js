import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router, // Keep Router here at the top level
  Route,
  Routes,
  Link,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";

// Page Imports
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import ElectionListPage from "./pages/ElectionListPage";
import ElectionDetailPage from "./pages/ElectionDetailPage";
import AdminResultsPage from "./pages/AdminResultsPage";
import CreateElectionPage from "./pages/CreateElectionPage";
import ManageElectionsPage from "./pages/ManageElectionsPage";
import EditElectionPage from "./pages/EditElectionPage";
import ManageCandidatesPage from "./pages/ManageCandidatesPage";
import ManageElectionVotersPage from "./pages/ManageElectionVotersPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ProfileDropdown from "./components/ProfileDropdown";
import ManageProfilePage from "./pages/ManageProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PublicResultsPage from './pages/PublicResultsPage'; // <<< NEW IMPORT

// Service Imports
import authService from "./services/authService";

// Global CSS
import "./App.css";

// Admin Dashboard Placeholder Component
const AdminDashboardPlaceholder = () => {
  return (
    <div>
      <h2>Admin Dashboard</h2>
      <p>Welcome, Administrator! Manage your elections and users here.</p>
      <ul>
        <li>
          <Link to="/admin/elections/create">Create New Election</Link>
        </li>
        <li>
          <Link to="/admin/elections">Manage Elections</Link>
        </li>
        {/* Add more links for other admin functionalities */}
      </ul>
    </div>
  );
};

// ProtectedRoute Component
const ProtectedRoute = ({ children }) => {
  const tokens = authService.getCurrentUserTokens();
  if (!tokens || !tokens.access) {
    return <Navigate to="/login" replace />;
  }
  return children ? children : <Outlet />;
};

// AdminProtectedRoute Component
const AdminProtectedRoute = ({ children }) => {
  const tokens = authService.getCurrentUserTokens();
  const isAdminUser = authService.isAdmin();

  if (!tokens || !tokens.access) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdminUser) {
    return <Navigate to="/" replace />; // Redirect non-admins trying to access admin routes
  }
  return children ? children : <Outlet />;
};

// AppContent Component (handles dynamic parts and routing)
function AppContent() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!authService.getCurrentUserTokens()
  );
  //const [isAdminUser, setIsAdminUser] = useState(authService.isAdmin());

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(!!authService.getCurrentUserTokens());
      // setIsAdminUser(authService.isAdmin());
    };
    window.addEventListener("authChange", handleAuthChange);
    handleAuthChange(); // Initial check on mount
    return () => window.removeEventListener("authChange", handleAuthChange); // Cleanup
  }, []);

  const handleLogout = () => {
    authService.logout();
    window.dispatchEvent(new Event("authChange")); // Trigger re-render for navbar
    navigate("/login");
  };

  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          {!isAuthenticated && (
            <>
              <li>
                <Link to="/login">Login</Link>
              </li>
              <li>
                <Link to="/register">Register</Link>
              </li>
            </>
          )}
          {/* {isAuthenticated && isAdminUser && (
            <li>
              <Link to="/admin/dashboard">Admin Panel</Link>
            </li>
          )} */}
          {isAuthenticated && (
            <li style={{ marginLeft: "auto" }}>
              {" "}
              {/* Pushes dropdown to the right if nav ul is flex */}
              <ProfileDropdown />
            </li>
          )}
        </ul>
      </nav>

      <div className="container">
        <hr />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordPage />}
          />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          <Route
            path="/"
            element={
              authService.getCurrentUserTokens() ? (
                <Navigate replace to="/elections" />
              ) : (
                <HomePage />
              )
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route path="/elections" element={<ElectionListPage />} />
            <Route
              path="/elections/:electionId"
              element={<ElectionDetailPage />}
            />
            <Route path="/elections/:electionId/public-results" element={<PublicResultsPage />} /> {/* <<< NEW ROUTE */}
            <Route
              path="/admin/results/:electionId"
              element={<AdminResultsPage />}
            />
          </Route>
          <Route element={<ProtectedRoute />}>
            {/* ... (other protected routes like /elections, /elections/:id) ... */}
            <Route path="/manage-profile" element={<ManageProfilePage />} />{" "}
            {/* <<< NEW ROUTE */}
          </Route>
          {/* Protected Routes for Admin Users Only */}
          <Route element={<AdminProtectedRoute />}>
            <Route
              path="/admin/dashboard"
              element={<AdminDashboardPlaceholder />}
            />
            <Route
              path="/admin/elections/create"
              element={<CreateElectionPage />}
            />
            <Route path="/admin/elections" element={<ManageElectionsPage />} />
            <Route
              path="/admin/elections/edit/:electionId"
              element={<EditElectionPage />}
            />
            <Route
              path="/admin/elections/:electionId/candidates"
              element={<ManageCandidatesPage />}
            />
            <Route
              path="/admin/elections/:electionId/voters"
              element={<ManageElectionVotersPage />}
            />
          </Route>
          {/* 404 Not Found Route */}
          <Route
            path="*"
            element={
              <div className="text-center mt-3">
                <h2>404 - Page Not Found</h2>
                <p>Sorry, the page you are looking for does not exist.</p>
                <Link to="/" className="button-link mt-2">
                  Go to Homepage
                </Link>
              </div>
            }
          />
        </Routes>
      </div>
    </>
  );
}

// Main App Component (wraps with Router)
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
export default App;

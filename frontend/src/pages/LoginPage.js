// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState(''); // This will hold our user-facing error or success messages
    const [loading, setLoading] = useState(false); // To disable button during login attempt
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage(''); // Clear previous messages
        setLoading(true);

        try {
            // authService.login should now propagate the error response
            await authService.login(email, password); 
            
            // If login is successful, authService.login would have updated localStorage
            // and dispatched 'authChange' if it was modified to do so,
            // or AppContent's useEffect will catch it.
            // We can also dispatch here to be sure navbar updates IF login does not.
            window.dispatchEvent(new Event('authChange')); 
            
            navigate('/elections'); // Navigate to the main page for authenticated users

        } catch (error) {
            console.error("Login Page Error Object:", error.response || error); // Log the full error object for debugging

            let userFriendlyMessage = "Login failed. An unexpected error occurred. Please try again."; // Default generic error

            if (error.response && error.response.data) {
                const errorData = error.response.data;
                const detail = errorData.detail; // The primary message from simple-jwt or our custom serializer
                const code = errorData.code;     // The custom code we added (e.g., 'account_not_verified')

                if (detail) {
                    // Prioritize the 'detail' message from the backend
                    userFriendlyMessage = detail;

                    // Further refine message based on common simple-jwt default or our custom codes
                    if (detail.toLowerCase().includes("no active account found")) {
                        // This is the generic JWT response for wrong credentials OR non-existent user
                        // For non-existent users, we don't want to confirm they don't exist.
                        // For existing users with wrong password, this message is okay.
                        userFriendlyMessage = "Invalid email or password. Please try again.";
                    } else if (code === 'account_not_verified') {
                        userFriendlyMessage = "Your account is not verified. Please check your email for a verification link.";
                    } else if (code === 'account_inactive') {
                        userFriendlyMessage = "Your account is currently inactive. Please contact support.";
                    } else if (code === 'incorrect_password') { // If backend sends this specific code
                        userFriendlyMessage = "Incorrect password. Please try again.";
                    }
                    // Add more specific checks based on codes if your backend sends them

                } else if (Array.isArray(errorData.non_field_errors)) {
                    userFriendlyMessage = errorData.non_field_errors.join(" ");
                } else if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
                    // Fallback for other structured DRF validation errors
                    // (e.g., if email or password fields themselves have errors, though less common for /api/token/)
                    const fieldErrors = Object.entries(errorData).map(([key, value]) => 
                        `${key.replace("_", " ")}: ${Array.isArray(value) ? value.join(" ") : value}`
                    );
                    userFriendlyMessage = fieldErrors.join("; ");
                }
            } else if (error.request) {
                // The request was made but no response was received (e.g., network error, server down)
                userFriendlyMessage = "Could not connect to the server. Please check your internet connection or try again later.";
            } else {
                // Something happened in setting up the request that triggered an Error
                userFriendlyMessage = `Login error: ${error.message}`;
            }
            setMessage(userFriendlyMessage);
        } finally {
            setLoading(false); // Re-enable button
        }
    };

    return (
        <div className="login-page"> {/* Uses .login-page from App.css for card styling */}
            <h2>Login</h2>

            {/* Display error messages using the .error-message class from App.css */}
            {/* 'message' state will only be set if there's an error or a specific non-error message */}
            {message && (
                <p className="error-message">{message}</p>
            )}

            <form onSubmit={handleLogin}>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        disabled={loading} // Disable input during submission
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading} // Disable input during submission
                    />
                </div>
                <button type="submit" className="button-primary mt-2" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <div className="mt-2 text-center additional-links">
                <Link to="/forgot-password" style={{ marginRight: '15px' }}>Forgot password?</Link>
                | 
                <Link to="/register" style={{ marginLeft: '15px' }}>Register new account</Link>
            </div>
        </div>
    );
}

export default LoginPage;
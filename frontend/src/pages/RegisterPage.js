import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import authService from "../services/authService";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// import "./RegisterPage.css"; // If you have specific styles for this page

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [birthDateObj, setBirthDateObj] = useState(null); // State for DatePicker (Date object or null)

  const [message, setMessage] = useState("");
  const navigate = useNavigate(); // This is now used

  const validatePassword = (pass) => {
    const errors = [];
    if (pass.length < 8)
      errors.push("Password must be at least 8 characters long.");
    if (!/[A-Z]/.test(pass))
      errors.push("Password must contain at least one uppercase letter.");
    if (!/[a-z]/.test(pass))
      errors.push("Password must contain at least one lowercase letter.");
    if (!/[0-9]/.test(pass))
      errors.push("Password must contain at least one number.");
    if (!/[^A-Za-z0-9]/.test(pass))
      errors.push("Password must contain at least one special character.");
    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setMessage(passwordErrors.join(" "));
      return;
    }
    if (password !== password2) {
      setMessage("Passwords do not match.");
      return;
    }

    // --- CORRECTED VALIDATION CHECK ---
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !identityNumber.trim() ||
      !birthDateObj || // <<< CHECK birthDateObj (the Date object from DatePicker)
      !email.trim() // Also ensure email is checked here if not relying solely on 'required'
    ) {
      setMessage(
        "All fields including First Name, Last Name, ID Number, Birth Date, and Email are required."
      );
      return;
    }
    // --- END CORRECTED VALIDATION ---

    if (!/^\d{11}$/.test(identityNumber)) {
      setMessage("Identity number must be 11 digits.");
      return;
    }

    try {
      const userData = {
        email,
        password,
        password2,
        first_name: firstName,
        last_name: lastName,
        identity_number: identityNumber,
        birth_date: birthDateObj
          ? birthDateObj.toISOString().split("T")[0]
          : null, // Send YYYY-MM-DD
      };
      await authService.register(userData);
      setMessage(
        "Registration successful! Please check your email inbox (and spam folder) to verify your account before logging in."
      );
      setTimeout(() => navigate("/login"), 2500); // Using navigate here
    } catch (error) {
      // ... (your existing detailed error handling for backend errors) ...
      console.error(
        "Registration error:",
        error.response?.data || error.message
      );
      let resMessage = "Registration failed. Please try again.";
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (data.email)
          resMessage = `Email: ${
            Array.isArray(data.email) ? data.email.join(" ") : data.email
          }`;
        else if (data.password)
          resMessage = `Password: ${
            Array.isArray(data.password)
              ? data.password.join(" ")
              : data.password
          }`;
        else if (data.password2)
          resMessage = `Confirm Password: ${
            Array.isArray(data.password2)
              ? data.password2.join(" ")
              : data.password2
          }`;
        else if (data.first_name)
          resMessage = `First Name: ${
            Array.isArray(data.first_name)
              ? data.first_name.join(" ")
              : data.first_name
          }`;
        else if (data.last_name)
          resMessage = `Last Name: ${
            Array.isArray(data.last_name)
              ? data.last_name.join(" ")
              : data.last_name
          }`;
        else if (data.identity_number)
          resMessage = `Identity Number: ${
            Array.isArray(data.identity_number)
              ? data.identity_number.join(" ")
              : data.identity_number
          }`;
        else if (data.birth_date)
          resMessage = `Birth Date: ${
            Array.isArray(data.birth_date)
              ? data.birth_date.join(" ")
              : data.birth_date
          }`;
        else if (data.detail) resMessage = data.detail;
        else if (typeof data === "object" && Object.keys(data).length > 0) {
          const fieldErrors = Object.entries(data).map(
            ([key, value]) =>
              `${key.replace("_", " ")}: ${
                Array.isArray(value) ? value.join(" ") : value
              }`
          );
          resMessage = fieldErrors.join("; ");
        } else if (typeof data === "string") resMessage = data;
      } else if (error.message) {
        resMessage = error.message;
      }
      setMessage(resMessage);
    }
  };

  return (
    <div className="register-page">
      {" "}
      {/* Uses .register-page for card styling */}
      <h2>Register</h2>
      {message && (
        <p
          className={
            message.toLowerCase().includes("successful")
              ? "success-message"
              : "error-message"
          }
        >
          {message}
        </p>
      )}
      <form onSubmit={handleRegister}>
        <div>
          <label htmlFor="firstName">First Name:</label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required // HTML5 required
          />
        </div>
        <div>
          <label htmlFor="lastName">Last Name:</label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required // HTML5 required
          />
        </div>
        <div>
          <label htmlFor="identityNumber">Identity Number (T.C.):</label>
          <input
            type="text"
            id="identityNumber"
            value={identityNumber}
            onChange={(e) =>
              setIdentityNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
            }
            maxLength="11"
            pattern="\d{11}" // HTML5 pattern for 11 digits
            title="Must be 11 digits"
            required // HTML5 required
          />
        </div>
        <div>
          <label htmlFor="birthDate">Birth Date:</label>
          <DatePicker
            selected={birthDateObj}
            onChange={(date) => setBirthDateObj(date)} // Updates birthDateObj
            dateFormat="yyyy-MM-dd"
            placeholderText="YYYY-MM-DD"
            maxDate={new Date()} // Cannot select future date
            showYearDropdown
            scrollableYearDropdown // If many years
            yearDropdownItemNumber={100} // Show 100 years in dropdown
            dropdownMode="select"
            required // HTML5 required for the input field DatePicker creates
            className="form-input-override" // For styling to match other inputs
            id="birthDate" // For the label
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required // HTML5 required
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required // HTML5 required
            aria-describedby="passwordHelp"
          />
          <small
            id="passwordHelp"
            style={{ display: "block", marginTop: "5px", color: "#666" }}
          >
            Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
            character.
          </small>
        </div>
        <div>
          <label htmlFor="password2">Confirm Password:</label>
          <input
            type="password"
            id="password2"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required // HTML5 required
          />
        </div>
        <button type="submit" className="button-primary mt-2">
          Register
        </button>{" "}
        {/* Added button classes */}
      </form>
      <p className="mt-3 text-center">
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}
export default RegisterPage;

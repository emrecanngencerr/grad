// frontend/src/pages/VerifyEmailPage.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import apiClient from "../services/api";

function VerifyEmailPage() {
  const { token } = useParams();
  const [statusMessage, setStatusMessage] = useState(
    "Verifying your email address, please wait..."
  );
  const [isVerificationError, setIsVerificationError] = useState(false);
  const navigate = useNavigate();
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    console.log(
      "[Effect Start] Token:",
      token,
      "FetchedRef:",
      fetchInitiatedRef.current
    );

    if (!token) {
      console.log("[Effect] No token.");
      // Only set status if not already initiated (to avoid overwriting if token disappears later)
      if (!fetchInitiatedRef.current) {
        setStatusMessage("Invalid verification request. No token provided.");
        setIsVerificationError(true);
      }
      fetchInitiatedRef.current = true; // Mark as "handled"
      return;
    }

    if (fetchInitiatedRef.current) {
      console.log(
        "[Effect] Fetch already initiated. Skipping duplicate API call."
      );
      return;
    }

    fetchInitiatedRef.current = true; // Mark that we are making the call
    let isStillTrulyMounted = true; // To guard navigate specifically

    console.log("[Effect] Making API call for token:", token);

    apiClient
      .get(`/verify-email/${token}/`)
      .then((response) => {
        console.log(
          "[Effect .then] API call successful. Response data:",
          response.data
        );

        // State updates should be safe even if StrictMode remounted.
        // React handles queuing state updates correctly for the current component instance.
        setStatusMessage(
          response.data.message ||
            "Email successfully verified! Redirecting to login..."
        );
        setIsVerificationError(false);

        setTimeout(() => {
          // Only navigate if the component instance that initiated this timeout is still around
          if (isStillTrulyMounted) {
            console.log("[Effect .then] Navigating to /login");
            navigate("/login");
          }
        }, 3000);
      })
      .catch((err) => {
        console.error(
          "[Effect .catch] API call FAILED. Error:",
          err.response?.data || err.message
        );

        // State updates should be safe.
        const defaultErrorMsg =
          "Verification failed. The link may be invalid, expired, or already used.";
        let apiErrorMsg = "";
        if (err.response && err.response.data && err.response.data.error) {
          apiErrorMsg = err.response.data.error;
        } else if (
          err.response &&
          err.response.data &&
          err.response.data.detail
        ) {
          apiErrorMsg = err.response.data.detail;
        }

        setStatusMessage(apiErrorMsg || defaultErrorMsg);
        setIsVerificationError(true);
      });

    return () => {
      console.log("[Effect Cleanup] Token:", token);
      isStillTrulyMounted = false;
      // No need to reset fetchInitiatedRef.current here when using [token] as dependency
      // because a new token will create a new "instance" of the effect with a fresh ref.
    };
  }, [token, navigate]); // Effect depends on token and navigate

  return (
    <div
      className="container text-center mt-3"
      style={{ paddingTop: "50px", paddingBottom: "50px" }}
    >
      <h2>Email Verification</h2>
      {statusMessage && (
        <p
          className={isVerificationError ? "error-message" : "success-message"}
          style={{ fontSize: "1.1em", padding: "15px" }}
        >
          {statusMessage}
        </p>
      )}

      {statusMessage !== "Verifying your email address, please wait..." && (
        <div className="mt-3">
          <Link to="/login" className="button-link">
            Proceed to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default VerifyEmailPage;

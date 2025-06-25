import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../services/api";
import authService from "../services/authService"; // Keep for admin checks if needed elsewhere

// Import Chart.js components
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { Pie } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

function AdminResultsPage() {
  const { electionId } = useParams();
  const [electionData, setElectionData] = useState(null); // Will store {id, name, results, signature, system_ed25519_public_key_b64}
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get(
          `elections/${electionId}/results/`
        );
        setElectionData(response.data);
        console.log("Fetched Election Results Data:", response.data); // For debugging
      } catch (err) {
        console.error("Fetch results error:", err.response || err);
        setError(
          err.response?.data?.detail ||
            "Failed to fetch results or you do not have permission."
        );
        if (err.response && err.response.status === 401) {
          authService.logout(); // Assuming authService handles actual logout
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [electionId, navigate]);

  // Prepare data for the Pie chart
  const getChartData = () => {
    if (
      !electionData ||
      typeof electionData.results !== "object" ||
      electionData.results === null
    ) {
      return { labels: [], datasets: [] };
    }

    // electionData.results is now like: {"Candidate A": {"votes": 10, "percentage": "50.0%"}, ...}
    const resultsObj = electionData.results;
    const labels = Object.keys(resultsObj);
    const dataValues = labels.map((label) => resultsObj[label].votes); // Get just the vote counts

    const backgroundColors = labels.map((_, index) => {
      const hue = (index * (360 / Math.max(1, labels.length))) % 360; // Avoid division by zero
      return `hsla(${hue}, 70%, 60%, 0.85)`;
    });
    const borderColors = backgroundColors.map((color) =>
      color.replace("0.85", "1")
    );

    return {
      labels: labels.map(
        (label) =>
          `${label}: ${resultsObj[label].votes} votes (${resultsObj[label].percentage})`
      ),
      datasets: [
        {
          label: "Votes",
          data: dataValues,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  };

  const chartData = electionData
    ? getChartData()
    : { labels: [], datasets: [] }; // Calculate only if electionData exists

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right", // Changed position for potentially many candidates
        labels: {
          font: { size: 12 },
          boxWidth: 20,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: electionData
          ? `Vote Distribution for: ${electionData.name}`
          : "Election Results",
        font: { size: 18 },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return context.label; // Already formatted: "Candidate: X votes (Y.Z%)"
          },
        },
      },
    },
  };

  const handleDownloadResults = () => {
    if (
      !electionData ||
      typeof electionData.results !== "object" ||
      electionData.results === null
    ) {
      alert("No results data available to download.");
      return;
    }

    let csvContent = "Candidate,Votes,Percentage\n"; // CSV Header
    const results = electionData.results; // {"Candidate A": {"votes": 10, "percentage": "50.0%"}, ...}

    for (const candidateName in results) {
      const candidateData = results[candidateName];
      // Escape candidate names that might contain commas or quotes
      const escapedName = `"${candidateName.replace(/"/g, '""')}"`;
      csvContent += `${escapedName},${candidateData.votes},"${candidateData.percentage}"\n`;
    }

    // Use electionData.name from the top level of the fetched data
    const filename = `election_results_${
      electionData.name?.replace(/\s+/g, "_").toLowerCase() || "export"
    }.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      alert("Your browser doesn't support direct file downloads.");
    }
  };

  if (loading) return <p className="text-center mt-3">Loading results...</p>;
  if (error) return <p className="error-message mt-3">{error}</p>;
  if (!electionData)
    return (
      <p className="text-center mt-3">
        No data found for this election's results.
      </p>
    );

  // Check if electionData.results is a string (e.g., "Results not available...")
  const resultsAreStringMessage = typeof electionData.results === "string";
  // Check if results object is present and actually contains candidate data
  const resultsArePopulatedObject =
    electionData.results &&
    typeof electionData.results === "object" &&
    Object.keys(electionData.results).length > 0;
  const noVotesActuallyCast =
    resultsArePopulatedObject &&
    Object.values(electionData.results).every((data) => data.votes === 0);

  return (
    <div className="admin-results-page container">
      <h2>Results for: {electionData.name}</h2>

      {resultsAreStringMessage ? (
        <p className="info-message mt-2">{electionData.results}</p>
      ) : resultsArePopulatedObject ? (
        noVotesActuallyCast ? (
          <p className="info-message mt-2">
            No votes were tallied for any candidate in this election.
          </p>
        ) : (
          <div className="results-content mt-3">
            <div
              className="chart-container"
              style={{
                position: "relative",
                height: "400px",
                width: "90%",
                maxWidth: "600px",
                margin: "20px auto",
              }}
            >
              <Pie data={chartData} options={chartOptions} />
            </div>

            <h3 className="mt-3 text-center">Detailed Breakdown</h3>
            <ul
              className="results-list"
              style={{
                listStyle: "none",
                padding: "0 15px",
                maxWidth: "600px",
                margin: "20px auto",
              }}
            >
              {Object.entries(electionData.results).map(
                ([candidateName, data]) => (
                  <li
                    key={candidateName}
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid #f0f0f0",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      <strong>{candidateName}:</strong>
                    </span>
                    <span>
                      {data.votes} vote(s) ({data.percentage})
                    </span>
                  </li>
                )
              )}
              <li
                style={{
                  padding: "10px 0",
                  borderTop: "2px solid #333",
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                }}
              >
                <span>
                  <strong>TOTAL VOTES:</strong>
                </span>
                <span>
                  {Object.values(electionData.results).reduce(
                    (sum, data) => sum + data.votes,
                    0
                  )}
                </span>
              </li>
            </ul>

            {electionData.signature && (
              <div className="signature-info mt-3 card-style-info">
                {" "}
                {/* Added a class for styling */}
                <h4>Results Integrity Information</h4>
                <p>
                  <strong>Signature (Ed25519, Base64):</strong>{" "}
                  <code className="code-block">{electionData.signature}</code>
                </p>
                <p>
                  <strong>System Public Key (Ed25519, Base64):</strong>{" "}
                  <code className="code-block">
                    {electionData.system_ed25519_public_key_b64}
                  </code>
                </p>
                <p className="mt-1">
                  <small>
                    The signature can be used with the System Public Key to
                    verify that the tallied results (
                    <code>election.tallied_results_json</code> on the backend)
                    have not been tampered with since they were signed by the
                    system.
                  </small>
                </p>
              </div>
            )}

            <div
              style={{
                textAlign: "center",
                marginTop: "30px",
                marginBottom: "20px",
              }}
            >
              <button
                onClick={handleDownloadResults}
                className="button-primary"
              >
                Download Results (CSV)
              </button>
            </div>
          </div>
        )
      ) : (
        <p className="info-message mt-2">
          Results data is not available or in an unexpected format.
        </p>
      )}

      <div className="page-actions mt-3">
        <button
          onClick={() => navigate("/admin/elections")}
          className="button-secondary mr-1"
        >
          {" "}
          {/* Changed to manage election page */}
          Back to Manage Election
        </button>
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="button-secondary"
        >
          {" "}
          {/* Changed to admin dashboard */}
          Back to Admin Dashboard
        </button>
      </div>
    </div>
  );
}

export default AdminResultsPage;

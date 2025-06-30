import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

function PublicResultsPage() {
    const { electionId } = useParams();
    const [electionData, setElectionData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            setError('');
            try {
                // Regular users also hit this endpoint.
                // The backend serializer will control what data they see.
                const response = await apiClient.get(`elections/${electionId}/results/`);
                setElectionData(response.data);
            } catch (err) {
                console.error("Fetch public results error:", err.response || err);
                setError(err.response?.data?.detail || "Failed to fetch election results.");
                // No authService.logout() here, as it's not necessarily an auth failure for public view
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [electionId]);

    const getChartData = () => {
        // Same getChartData logic as in AdminResultsPage.js
        if (!electionData || typeof electionData.results !== 'object' || electionData.results === null) {
            return { labels: [], datasets: [] };
        }
        const resultsObj = electionData.results;
        const labels = Object.keys(resultsObj);
        const dataValues = labels.map(label => resultsObj[label].votes);
        const backgroundColors = labels.map((_, index) => {
            const hue = (index * (360 / Math.max(1, labels.length))) % 360;
            return `hsla(${hue}, 70%, 60%, 0.85)`;
        });
        const borderColors = backgroundColors.map(color => color.replace('0.85', '1'));
        return {
            labels: labels.map(label => `${label}: ${resultsObj[label].votes} votes (${resultsObj[label].percentage})`),
            datasets: [{ label: 'Votes', data: dataValues, backgroundColor: backgroundColors, borderColor: borderColors, borderWidth: 1 }],
        };
    };
    const chartData = electionData ? getChartData() : { labels: [], datasets: [] };

    const chartOptions = { // Similar chart options, maybe simpler
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { font: { size: 12 }, boxWidth: 15, padding: 10 } },
            title: { display: true, text: electionData ? `Results for: ${electionData.name}` : 'Election Results', font: { size: 16 }, padding: { top: 10, bottom: 15 } },
            tooltip: { callbacks: { label: context => context.label } }
        },
    };

    if (loading) return <p className="text-center mt-3">Loading results...</p>;
    if (error) return <p className="error-message mt-3">{error}</p>;
    if (!electionData) return <p className="text-center mt-3">No results data available for this election.</p>;

    const resultsAreStringMessage = typeof electionData.results === 'string';
    const resultsArePopulatedObject = electionData.results && typeof electionData.results === 'object' && Object.keys(electionData.results).length > 0;
    const noVotesActuallyCast = resultsArePopulatedObject && Object.values(electionData.results).every(data => data.votes === 0);

    return (
        <div className="public-results-page container">
            <h2>Results for: {electionData.name}</h2>

            {resultsAreStringMessage ? (
                <p className="info-message mt-2">{electionData.results}</p>
            ) : resultsArePopulatedObject ? (
                noVotesActuallyCast ? (
                    <p className="info-message mt-2">No votes were tallied for any candidate in this election.</p>
                ) : (
                    <div className="results-content mt-3">
                        <div className="chart-container" style={{ position: 'relative', height: '350px', width: '80%', maxWidth: '500px', margin: '20px auto' }}>
                            <Pie data={chartData} options={chartOptions} />
                        </div>
                        <h3 className="mt-3 text-center">Detailed Breakdown</h3>
                        <ul className="results-list" style={{ listStyle: 'none', padding: '0 15px', maxWidth: '500px', margin: '20px auto' }}>
                            {Object.entries(electionData.results).map(([candidateName, data]) => (
                                <li key={candidateName} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                                    <span><strong>{candidateName}:</strong></span>
                                    <span>{data.votes} vote(s) ({data.percentage})</span>
                                </li>
                            ))}
                            <li style={{ padding: '10px 0', borderTop: '2px solid #333', marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <span><strong>TOTAL VOTES:</strong></span>
                                <span>{Object.values(electionData.results).reduce((sum, data) => sum + data.votes, 0)}</span>
                            </li>
                        </ul>
                        {/* No signature info or download button for public users */}
                    </div>
                )
            ) : (
                <p className="info-message mt-2">Results are currently being processed or are not available for public viewing.</p>
            )}

            <div className="page-actions mt-3">
                <button onClick={() => navigate(`/elections/${electionId}`)} className="button-secondary">
                    Back to Election Details
                </button>
                <button onClick={() => navigate('/elections')} className="button-secondary ml-2" style={{ marginLeft: '10px' }}>
                    Back to All Elections
                </button>
            </div>
        </div>
    );
}

export default PublicResultsPage;

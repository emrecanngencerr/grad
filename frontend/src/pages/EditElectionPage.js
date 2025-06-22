// frontend/src/pages/EditElectionPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import apiClient from '../services/api';
import authService from '../services/authService';
import DatePicker from 'react-datepicker'; // <<< IMPORT
import 'react-datepicker/dist/react-datepicker.css'; // <<< IMPORT CSS
// Assuming CreateElectionPage.css or App.css has styles for .form-input-override

function EditElectionPage() {
    const navigate = useNavigate();
    const { electionId } = useParams(); 
    
    // Election Details State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(null); // Initialize as null or new Date()
    const [endDate, setEndDate] = useState(null);     // Initialize as null or new Date()
    const [isActive, setIsActive] = useState(true);
    
    const [originalElectionName, setOriginalElectionName] = useState(''); // To display in title while loading
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isAdminUser = authService.isAdmin();

    useEffect(() => {
        if (!isAdminUser) return; // Handled by AdminProtectedRoute, but good check
        
        setLoading(true);
        apiClient.get(`/admin/elections/${electionId}/`)
            .then(response => {
                const election = response.data;
                setName(election.name);
                setOriginalElectionName(election.name); // For title
                setDescription(election.description || '');
                // Convert ISO strings from backend to Date objects for DatePicker
                setStartDate(election.start_time ? new Date(election.start_time) : null);
                setEndDate(election.end_time ? new Date(election.end_time) : null);
                setIsActive(election.is_active);
                setError('');
            })
            .catch(err => {
                console.error("Fetch election for edit error:", err);
                setError('Failed to load election data for editing.');
                if (err.response && err.response.status === 401) {
                    authService.logout();
                    navigate('/login');
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [electionId, isAdminUser, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim() || !startDate || !endDate) {
            setError('Name, Start Time, and End Time are required.');
            return;
        }
        if (startDate >= endDate) {
            setError("End time must be after the start time.");
            return;
        }

        const electionData = {
            name,
            description,
            start_time: startDate.toISOString(), // Convert Date object to ISO string
            end_time: endDate.toISOString(),     // Convert Date object to ISO string
            is_active: isActive,
            // Note: eligible_voters and candidates are usually handled by separate API calls
            // or more complex serializer logic if updated simultaneously. This PUT will only update these core fields.
        };

        try {
            await apiClient.put(`/admin/elections/${electionId}/`, electionData);
            setSuccess('Election updated successfully!');
            setOriginalElectionName(name); // Update title if name changed
            // Optionally navigate back or allow further edits
        } catch (err) {
            console.error("Update election error:", err.response?.data || err);
            let errorMsg = "Failed to update election.";
            if (err.response && err.response.data) {
                const data = err.response.data;
                if (data.name) errorMsg = `Name: ${data.name[0]}`;
                else if (data.start_time) errorMsg = `Start Time: ${data.start_time[0]}`;
                else if (data.end_time) errorMsg = `End Time: ${data.end_time[0]}`;
                else if (data.detail) errorMsg = data.detail;
                else if (typeof data === 'object') errorMsg = Object.values(data).flat().join(" ; ");
            }
            setError(errorMsg);
        }
    };

    if (!isAdminUser) { // Should be caught by AdminProtectedRoute
        return <Navigate to="/" replace />;
    }
    if (loading) return <p className="text-center mt-3">Loading election data for editing...</p>;
    if (error && !name) return <p className="error-message mt-3">{error}</p>; // Show error if critical load fails

    return (
        <div className="edit-election-page container"> {/* Consistent page class */}
            <h2>Edit Election: {originalElectionName || 'Loading...'}</h2>
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}

            <form onSubmit={handleSubmit} className="edit-election-form"> {/* Consistent form class */}
                <div className="form-group">
                    <label htmlFor="name">Election Name:</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description (Optional):</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="start_time_picker">Start Time:</label>
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="form-input-override" // Ensure this class is styled
                        id="start_time_picker"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="end_time_picker">End Time:</label>
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="form-input-override"
                        id="end_time_picker"
                        minDate={startDate} // End date cannot be before start date
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="checkbox-label">
                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                        Is Active?
                    </label>
                </div>
                <div className="form-actions mt-3">
                    <button type="submit" className="button-primary">Update Election</button>
                    <button type="button" onClick={() => navigate('/admin/elections')} className="button-secondary">
                        Back to Manage Elections
                    </button>
                </div>
            </form>
        </div>
    );
}

export default EditElectionPage;
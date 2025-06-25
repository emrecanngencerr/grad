import axios from "axios";
import authService from "./authService";
// import jwt_decode from 'jwt-decode'; // You might need this for token expiration checks

const API_URL = "https://gtuevoting.com/api/";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const tokens = authService.getCurrentUserTokens();
    if (tokens && tokens.access) {
      config.headers["Authorization"] = "Bearer " + tokens.access;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Interceptor to handle token refresh or auto-logout on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Check for 401, and that it's not a retry, and that it's not the refresh token endpoint itself
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== API_URL + "token/refresh/"
    ) {
      originalRequest._retry = true;
      try {
        const tokens = authService.getCurrentUserTokens();
        if (tokens && tokens.refresh) {
          // Use raw axios for refresh token request
          const rs = await axios.post(API_URL + "token/refresh/", {
            refresh: tokens.refresh,
          });
          const { access, refresh: newRefresh } = rs.data; // Assume refresh might also be new

          // Update tokens in localStorage
          const newTokens = { access, refresh: newRefresh || tokens.refresh }; // Use new refresh if provided
          localStorage.setItem("userTokens", JSON.stringify(newTokens));

          // Update Authorization header for the original request and for future apiClient requests
          apiClient.defaults.headers.common["Authorization"] =
            "Bearer " + access; // This line might not be needed if request interceptor runs again
          originalRequest.headers["Authorization"] = "Bearer " + access;

          return apiClient(originalRequest); // Retry original request
        } else {
          authService.logout(); // No refresh token or it's invalid, force logout
          window.location.href = "/login"; // Redirect to login
        }
      } catch (_error) {
        console.error("Token refresh error:", _error);
        authService.logout();
        window.location.href = "/login";
        return Promise.reject(_error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

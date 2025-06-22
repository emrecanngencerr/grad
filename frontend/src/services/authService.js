import axios from "axios";
import apiClient from "./api";

const API_URL = "http://127.0.0.1:8000/api/";

const register = (userData) => {
  return axios.post(API_URL + "register/", userData);
};

const login = (email, password) => {
  return axios
    .post(API_URL + "token/", {
      // Use raw axios for login token
      email,
      password,
    })
    .then(async (response) => {
      if (response.data.access && response.data.refresh) {
        localStorage.setItem("userTokens", JSON.stringify(response.data)); // Store tokens
        try {
          const userProfileResponse = await apiClient.get("user/me/"); // Use apiClient which has interceptor
          localStorage.setItem(
            "userInfo",
            JSON.stringify(userProfileResponse.data)
          );
        } catch (profileError) {
          console.error(
            "Failed to fetch user profile after login",
            profileError
          );
          // Handle case where profile fetch fails - maybe clear tokens and log out
          logout(); // Or just proceed without profile info
          throw profileError; // Re-throw to let login component handle it
        }
      }
      return response.data; // Return original token response
    });
};

const logout = () => {
  localStorage.removeItem("userTokens");
  localStorage.removeItem("userInfo"); // Clear user info too
  // Consider clearing axios default headers if set manually outside interceptor
};

const getCurrentUserTokens = () => {
  const tokens = localStorage.getItem("userTokens");
  return tokens ? JSON.parse(tokens) : null;
};

const getUserInfoFromStorage = () => {
  // Renamed for clarity from getUserInfo
  const infoString = localStorage.getItem("userInfo");
  return infoString ? JSON.parse(infoString) : null;
};

const isAdmin = () => {
  const userInfo = getUserInfoFromStorage();
  return userInfo && userInfo.is_staff === true;
};

const refreshCurrentUserInfo = async () => {
  try {
    // apiClient will use the existing tokens from localStorage
    const userProfileResponse = await apiClient.get("user/me/");
    if (userProfileResponse.data) {
      localStorage.setItem(
        "userInfo",
        JSON.stringify(userProfileResponse.data)
      );
      console.log(
        "User info refreshed in localStorage:",
        userProfileResponse.data
      );
      return userProfileResponse.data; // Return the new info
    }
  } catch (profileError) {
    console.error(
      "Failed to refresh user profile in authService:",
      profileError
    );
    // Don't clear tokens here unless it's a 401 error for the token itself
    if (profileError.response && profileError.response.status === 401) {
      logout(); // If /user/me/ gives 401, tokens might be invalid
    }
    return null;
  }
  return null;
};

const authService = {
  register,
  login, // Login should also call refreshCurrentUserInfo or directly set userInfo after token
  logout,
  getCurrentUserTokens,
  getUserInfo: getUserInfoFromStorage, // Keep getUserInfo as the public getter from storage
  isAdmin,
  refreshCurrentUserInfo, // Export the new function
};

// Modify login to use refreshCurrentUserInfo for consistency
const originalLogin = authService.login;
authService.login = (email, password) => {
  return originalLogin(email, password)
    .then(async (tokenData) => {
      if (tokenData && tokenData.access) {
        await refreshCurrentUserInfo(); // Fetch and store user info after successful token acquisition
        window.dispatchEvent(new Event("authChange")); // Ensure this is dispatched after userInfo is set
      }
      return tokenData;
    })
    .catch((err) => {
      // If login fails (e.g. bad credentials from /token/ endpoint),
      // refreshCurrentUserInfo won't be called.
      // If token part succeeds but /user/me/ fails, error is handled in refreshCurrentUserInfo.
      throw err;
    });
};

export default authService;

import axios from "axios";

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api" });
const ML  = axios.create({ baseURL: process.env.REACT_APP_ML_URL  || "http://localhost:5001" });

// Attach JWT automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("ts_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const registerUser  = (data)   => API.post("/auth/register", data);
export const loginUser     = (data)   => API.post("/auth/login", data);
export const getMe         = ()       => API.get("/auth/me");
export const updateProfile = (data)   => API.put("/auth/profile", data);

// Trips
export const createTrip     = (data)  => API.post("/trips", data);
export const getTrips        = (params)=> API.get("/trips", { params });
export const getTripById     = (id)   => API.get(`/trips/${id}`);
export const findMatches     = (data) => API.post("/trips/matches", data);
export const joinTrip        = (id, data) => API.post(`/trips/${id}/join`, data);
export const managePassenger = (tripId, userId, action) =>
  API.put(`/trips/${tripId}/passenger/${userId}`, { action });
export const getFareSplit    = (id)   => API.get(`/trips/${id}/fare-split`);
export const getMyTrips      = ()     => API.get("/trips/user/my");
export const updateTripStatus = (id, status, data = {}) => API.put(`/trips/${id}/status`, { status, ...data });
export const confirmPayment = (id) => API.post(`/trips/${id}/pay`);
export const getFareForecast = (data) => API.post("/trips/fare-forecast", data);

// Chat
export const getMessages    = (tripId) => API.get(`/chat/${tripId}`);
export const sendMessage    = (tripId, text) => API.post(`/chat/${tripId}`, { text });

// ML
export const predictFare    = (data)  => ML.post("/predict", data);
export const getCities      = ()      => ML.get("/cities");
export const calcOverlap    = (data)  => ML.post("/route-overlap", data);

// Reviews
export const getReviewStatus = (id) => API.get(`/trips/${id}/review/status`);
export const submitReview    = (id, data) => API.post(`/trips/${id}/review`, data);

// Notifications
export const getNotifications       = ()   => API.get("/notifications");
export const markNotificationRead   = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.put("/notifications/read-all");

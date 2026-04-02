import axios from "axios";

// Globaler Interceptor für alle Requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // Fügt den Token automatisch in den Header ein
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Interceptor für Responses (z.B. bei 401 automatisch ausloggen)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token abgelaufen oder ungültig -> Session aufräumen
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Optional: Seite neu laden, damit der Router den User zum Login schickt
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axios;
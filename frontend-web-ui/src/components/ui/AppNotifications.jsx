import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function AppNotifications({ children }) {
  return (
    <>
      {children}
      <ToastContainer newestOnTop limit={4} theme="colored" />
    </>
  );
}

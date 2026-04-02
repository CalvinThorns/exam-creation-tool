import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./app/queryClient";
import { ColorModeProvider } from "./app/colorMode";
import { App } from "./app/App";
import "./app/api"; 
import { AppNotifications } from "./components/ui/AppNotifications";
import "./i18n";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <AppNotifications>
          <App />
        </AppNotifications>
      </ColorModeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
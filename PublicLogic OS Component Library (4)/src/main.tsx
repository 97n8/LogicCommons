import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App";
import ThemeProvider from "./app/providers/ThemeProvider";
import { msalInstance } from "./auth/msalInstance";
import "./styles/index.css";
import { Toaster } from "sonner";

void msalInstance
  .initialize()
  .then(() => msalInstance.handleRedirectPromise())
  .catch(() => {});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <MsalProvider instance={msalInstance}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HashRouter>
          <App />
        </HashRouter>
        <Toaster position="bottom-left" />
      </ThemeProvider>
    </QueryClientProvider>
  </MsalProvider>,
);

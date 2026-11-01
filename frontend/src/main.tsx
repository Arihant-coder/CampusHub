import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "./app/routes";
import { ThemeProvider } from "./components/ui/theme-provider";
import { AuthProvider } from "./lib/auth-context";
import { Toaster } from "./components/ui/sonner";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);

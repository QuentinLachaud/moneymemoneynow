
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import "./styles/globals.css";

  // Ensure dark theme variables are applied by default. If you prefer honoring
  // system or user settings, we can wire `next-themes` ThemeProvider instead.
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }

  createRoot(document.getElementById("root")!).render(<App />);
  
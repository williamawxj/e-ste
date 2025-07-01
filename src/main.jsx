import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const App = () => (
  <div className="text-center">
    <h1 className="text-3xl font-bold text-blue-400">Tailwind CSS funcionando!</h1>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
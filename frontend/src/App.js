import React from "react";
import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import TimerPage from "./pages/TimerPage";
import HistoryPage from "./pages/HistoryPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <header className="topbar">
          <NavLink to="/" className="brand">
            <span className="brand-emoji">🍅</span>
            토마토 뽀모도로
          </NavLink>
        </header>

        <Routes>
          <Route path="/" element={<TimerPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>

        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              🍅 타이머
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              📋 기록
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              📊 대시보드
            </NavLink>
          </div>
        </nav>
      </div>
    </HashRouter>
  );
}

export default App;

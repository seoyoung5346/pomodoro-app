import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import api from "../api";

const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_KR = {
  Mon: "월",
  Tue: "화",
  Wed: "수",
  Thu: "목",
  Fri: "금",
  Sat: "토",
  Sun: "일",
};

const SUBJECT_COLORS = [
  "#e85d4c",
  "#4a8b5c",
  "#e8a33a",
  "#7da9d8",
  "#b07cc6",
  "#5fb3a3",
];

function CustomTooltip({ active, payload, label, unit = "분" }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <div>
        {payload[0].value}
        {unit}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError("통계를 불러오지 못했어요. 서버 연결을 확인해주세요.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main>
        <h1 className="page-title">📊 대시보드</h1>
        <p className="muted" style={{ textAlign: "center", padding: 24 }}>
          불러오는 중...
        </p>
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main>
        <h1 className="page-title">📊 대시보드</h1>
        <div className="card" style={{ borderColor: "var(--tomato-light)" }}>
          <p style={{ margin: 0, color: "var(--tomato-dark)" }}>⚠️ {error || "통계 없음"}</p>
        </div>
      </main>
    );
  }

  const bySubjectData = (stats.by_subject || []).map((item, i) => ({
    ...item,
    fill: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }));

  const byWeekdayData = WEEKDAY_ORDER.map((day) => ({
    day: WEEKDAY_KR[day],
    minutes: stats.by_weekday?.[day] ?? 0,
    isToday: WEEKDAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === day,
  }));

  return (
    <main>
      <h1 className="page-title">📊 대시보드</h1>

      <section className="stat-grid">
        <div className="card stat-card">
          <span className="stat-emoji">🔥</span>
          <span className="stat-value">{stats.streak}일</span>
          <span className="stat-label">연속 집중 기록</span>
        </div>
        <div className="card stat-card">
          <span className="stat-emoji">⏱️</span>
          <span className="stat-value">{stats.total_hours}시간</span>
          <span className="stat-label">총 집중 시간</span>
        </div>
        <div className="card stat-card">
          <span className="stat-emoji">✅</span>
          <span className="stat-value">{stats.sessions_this_week}회</span>
          <span className="stat-label">이번 주 세션</span>
        </div>
      </section>

      <section className="card chart-card">
        <h2 className="chart-title">🍅 과목별 집중 시간</h2>
        {bySubjectData.every((d) => d.minutes === 0) ? (
          <EmptyChart text="아직 쌓인 기록이 없어요." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bySubjectData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 6" stroke="#f0e4da" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
                axisLine={{ stroke: "#f0e4da" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(232,93,76,0.06)" }} />
              <Bar dataKey="minutes" radius={[10, 10, 0, 0]} maxBarSize={42}>
                {bySubjectData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="card chart-card">
        <h2 className="chart-title">🌿 주간 패턴 (월~일)</h2>
        {byWeekdayData.every((d) => d.minutes === 0) ? (
          <EmptyChart text="이번 주 기록이 아직 없어요." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byWeekdayData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 6" stroke="#f0e4da" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
                axisLine={{ stroke: "#f0e4da" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(74,139,92,0.07)" }} />
              <Bar dataKey="minutes" radius={[10, 10, 0, 0]} maxBarSize={36}>
                {byWeekdayData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isToday ? "var(--leek-green)" : "var(--leek-light)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </main>
  );
}

function EmptyChart({ text }) {
  return (
    <div className="empty-state" style={{ padding: "30px 16px" }}>
      <span className="empty-emoji">🌱</span>
      <p>{text}</p>
    </div>
  );
}

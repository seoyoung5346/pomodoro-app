import React, { useCallback, useEffect, useState } from "react";
import api from "../api";

const RANGE_OPTIONS = [
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
  { value: "all", label: "전체" },
];

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    const timePart = d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} · ${timePart}`;
  } catch (_) {
    return iso;
  }
}

const SUBJECT_EMOJI = ["🍅", "🌿", "🥕", "🌽", "🍆", "🫑", "🥦", "🧅"];
function emojiFor(id) {
  return SUBJECT_EMOJI[(id ?? 0) % SUBJECT_EMOJI.length];
}

export default function HistoryPage() {
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(() => {});
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getSessions({
        subjectId: subjectFilter || undefined,
        range: rangeFilter,
      });
      setSessions(data);
    } catch (err) {
      setError("기록을 불러오지 못했어요. 서버 연결을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }, [subjectFilter, rangeFilter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDelete = async (id) => {
    const prev = sessions;
    setSessions((cur) => cur.filter((s) => s.id !== id));
    try {
      await api.deleteSession(id);
      setToast("세션을 삭제했어요.");
    } catch (err) {
      setSessions(prev);
      setToast("삭제에 실패했어요.");
    }
  };

  return (
    <main>
      {toast && <div className="toast">{toast}</div>}
      <h1 className="page-title">📋 집중 기록</h1>

      <section className="card filter-card">
        <div className="filter-group">
          <span className="field-label">과목</span>
          <div className="chip-row">
            <button
              className={`chip${subjectFilter === "" ? " active" : ""}`}
              onClick={() => setSubjectFilter("")}
            >
              전체
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                className={`chip${subjectFilter === String(s.id) ? " active" : ""}`}
                onClick={() => setSubjectFilter(String(s.id))}
              >
                {emojiFor(s.id)} {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="field-label">기간</span>
          <div className="chip-row">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`chip${rangeFilter === opt.value ? " active leek" : ""}`}
                onClick={() => setRangeFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="card" style={{ marginTop: 14, borderColor: "var(--tomato-light)" }}>
          <p style={{ margin: 0, color: "var(--tomato-dark)" }}>⚠️ {error}</p>
        </div>
      )}

      <section className="session-list">
        {loading ? (
          <p className="muted" style={{ textAlign: "center", padding: 24 }}>
            불러오는 중...
          </p>
        ) : sessions.length === 0 ? (
          <div className="card empty-state">
            <span className="empty-emoji">🍃</span>
            <p>아직 기록이 없어요. 첫 토마토를 키워볼까요?</p>
          </div>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="session-item card">
              <div className="session-emoji">{emojiFor(s.subject_id)}</div>
              <div className="session-info">
                <div className="session-subject">{s.subject_name}</div>
                <div className="session-meta">{formatDateTime(s.created_at)}</div>
              </div>
              <div className="session-duration">{s.duration}분</div>
              <button
                className="icon-btn"
                onClick={() => handleDelete(s.id)}
                aria-label="세션 삭제"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import useLocalStorage from "../hooks/useLocalStorage";
import ProgressRing from "../components/ProgressRing";
import { playFocusEndChime, playBreakEndChime } from "../sound";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const STORAGE_KEY = "pomodoro_timer_state_v1";

// phase: "idle" | "focus" | "break"
// status: "stopped" | "running" | "paused"
const DEFAULT_STATE = {
  phase: "idle",
  status: "stopped",
  remaining: FOCUS_SECONDS,
  duration: FOCUS_SECONDS,
  subjectId: null,
  // endAt: 현재 시각 기준 종료 예정 타임스탬프(ms). running 상태에서만 유효.
  endAt: null,
};

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function TimerPage() {
  const [timerState, setTimerState] = useLocalStorage(STORAGE_KEY, DEFAULT_STATE);
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [managingSubjects, setManagingSubjects] = useState(false);
  const [toast, setToast] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const tickRef = useRef(null);
  const finishingRef = useRef(false); // 동일 세션 중복 저장 방지

  // ---- 과목 목록 로드 ----
  const loadSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const data = await api.getSubjects();
      setSubjects(data);
      setTimerState((prev) => {
        if (prev.subjectId && data.some((s) => s.id === prev.subjectId)) {
          return prev;
        }
        return { ...prev, subjectId: data[0]?.id ?? null };
      });
      setErrorMsg("");
    } catch (err) {
      setErrorMsg("서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요.");
    } finally {
      setLoadingSubjects(false);
    }
  }, [setTimerState]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // ---- 토스트 자동 사라짐 ----
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- 세션 저장 ----
  const saveCompletedSession = useCallback(async (subjectId, durationMinutes) => {
    if (!subjectId) return;
    try {
      await api.createSession({ subject_id: subjectId, duration: durationMinutes });
    } catch (err) {
      // 저장 실패해도 타이머 흐름은 막지 않음
      console.error("세션 저장 실패", err);
    }
  }, []);

  // ---- phase 전환 처리 ----
  const finishPhase = useCallback(
    async (currentState) => {
      if (finishingRef.current) return;
      finishingRef.current = true;

      if (currentState.phase === "focus") {
        playFocusEndChime();
        setToast("🍅 토마토가 다 익었어요! 잘했어요 — 5분 휴식을 시작할게요.");
        await saveCompletedSession(currentState.subjectId, Math.round(currentState.duration / 60));

        const nextEndAt = Date.now() + BREAK_SECONDS * 1000;
        setTimerState({
          ...currentState,
          phase: "break",
          status: "running",
          remaining: BREAK_SECONDS,
          duration: BREAK_SECONDS,
          endAt: nextEndAt,
        });
      } else if (currentState.phase === "break") {
        playBreakEndChime();
        setToast("🌿 파가 다 자랐어요! 휴식 끝, 다시 시작해볼까요?");
        setTimerState({
          ...currentState,
          phase: "idle",
          status: "stopped",
          remaining: FOCUS_SECONDS,
          duration: FOCUS_SECONDS,
          endAt: null,
        });
      }

      finishingRef.current = false;
    },
    [saveCompletedSession, setTimerState]
  );

  // ---- 메인 틱 루프: endAt 기준으로 남은시간 재계산 (새로고침에도 정확) ----
  useEffect(() => {
    if (timerState.status !== "running" || !timerState.endAt) {
      return undefined;
    }

    const tick = () => {
      setTimerState((prev) => {
        if (prev.status !== "running" || !prev.endAt) return prev;
        const remainingMs = prev.endAt - Date.now();
        const remainingSec = Math.max(0, remainingMs / 1000);

        if (remainingMs <= 0) {
          // 종료 처리는 별도 effect에서 수행 (상태 일관성을 위해 여기선 remaining만 0으로)
          return { ...prev, remaining: 0 };
        }
        return { ...prev, remaining: remainingSec };
      });
    };

    tick();
    tickRef.current = setInterval(tick, 250);
    return () => clearInterval(tickRef.current);
  }, [timerState.status, timerState.endAt, setTimerState]);

  // ---- remaining이 0에 도달하면 phase 종료 처리 ----
  useEffect(() => {
    if (timerState.status === "running" && timerState.remaining <= 0) {
      finishPhase(timerState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState.remaining, timerState.status]);

  // ---- 컨트롤 핸들러 ----
  const handleStart = () => {
    if (!timerState.subjectId) {
      setToast("⚠️ 먼저 과목을 선택해주세요!");
      return;
    }
    const duration = FOCUS_SECONDS;
    setTimerState({
      ...timerState,
      phase: "focus",
      status: "running",
      remaining: duration,
      duration,
      endAt: Date.now() + duration * 1000,
    });
  };

  const handlePause = () => {
    if (timerState.status !== "running") return;
    setTimerState({
      ...timerState,
      status: "paused",
      endAt: null,
      // remaining은 그대로 유지
    });
  };

  const handleResume = () => {
    if (timerState.status !== "paused") return;
    setTimerState({
      ...timerState,
      status: "running",
      endAt: Date.now() + timerState.remaining * 1000,
    });
  };

  const handleReset = () => {
    setTimerState({
      ...DEFAULT_STATE,
      subjectId: timerState.subjectId,
    });
  };

  const handleSkipBreak = () => {
    setTimerState({
      ...DEFAULT_STATE,
      subjectId: timerState.subjectId,
    });
    setToast("휴식을 건너뛰었어요.");
  };

  const handleSubjectChange = (id) => {
    setTimerState({ ...timerState, subjectId: id });
  };

  // ---- 과목 관리 ----
  const handleAddSubject = async (e) => {
    e.preventDefault();
    const name = newSubjectName.trim();
    if (!name) return;
    try {
      const created = await api.createSubject(name);
      setSubjects((prev) => [...prev, created]);
      setNewSubjectName("");
      if (!timerState.subjectId) {
        setTimerState((prev) => ({ ...prev, subjectId: created.id }));
      }
    } catch (err) {
      setToast(`과목 추가 실패: ${err.message}`);
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      await api.deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      if (timerState.subjectId === id) {
        setTimerState((prev) => ({ ...prev, subjectId: null }));
      }
    } catch (err) {
      setToast(`과목 삭제 실패: ${err.message}`);
    }
  };

  const progress = useMemo(() => {
    if (timerState.duration <= 0) return 0;
    return 1 - timerState.remaining / timerState.duration;
  }, [timerState.remaining, timerState.duration]);

  const currentSubjectName = subjects.find((s) => s.id === timerState.subjectId)?.name;

  const phaseLabel =
    timerState.phase === "focus" ? "집중 중" : timerState.phase === "break" ? "휴식 중" : "시작 전";

  return (
    <main>
      {toast && <div className="toast">{toast}</div>}

      <h1 className="page-title">🍅 집중 타이머</h1>

      {errorMsg && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--tomato-light)" }}>
          <p style={{ margin: 0, color: "var(--tomato-dark)" }}>⚠️ {errorMsg}</p>
        </div>
      )}

      <section className="card timer-card">
        <div className="phase-tag-row">
          <span className={`phase-tag ${timerState.phase}`}>
            {timerState.phase === "focus" && "🍅 집중 세션"}
            {timerState.phase === "break" && "🌿 휴식 세션"}
            {timerState.phase === "idle" && "🌤️ 대기 중"}
          </span>
          {currentSubjectName && timerState.phase === "focus" && (
            <span className="subject-tag">#{currentSubjectName}</span>
          )}
        </div>

        <ProgressRing
          progress={timerState.phase === "idle" ? 0 : progress}
          mode={timerState.phase === "break" ? "break" : "focus"}
          label={
            timerState.phase === "idle"
              ? formatTime(FOCUS_SECONDS)
              : formatTime(timerState.remaining)
          }
          sublabel={phaseLabel}
        />

        {timerState.phase === "idle" && (
          <div className="subject-select-row">
            <label htmlFor="subject-select" className="field-label">
              과목 선택
            </label>
            {loadingSubjects ? (
              <p className="muted">과목을 불러오는 중...</p>
            ) : subjects.length === 0 ? (
              <p className="muted">먼저 과목을 추가해주세요 👇</p>
            ) : (
              <select
                id="subject-select"
                value={timerState.subjectId ?? ""}
                onChange={(e) => handleSubjectChange(Number(e.target.value))}
                className="subject-select"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="timer-controls">
          {timerState.phase === "idle" && (
            <button
              className="pill-btn primary big"
              onClick={handleStart}
              disabled={!timerState.subjectId}
            >
              ▶️ 25분 집중 시작
            </button>
          )}

          {timerState.phase === "focus" && timerState.status === "running" && (
            <>
              <button className="pill-btn secondary" onClick={handlePause}>
                ⏸ 일시정지
              </button>
              <button className="pill-btn ghost" onClick={handleReset}>
                ⏹ 리셋
              </button>
            </>
          )}

          {timerState.phase === "focus" && timerState.status === "paused" && (
            <>
              <button className="pill-btn primary" onClick={handleResume}>
                ▶️ 재개
              </button>
              <button className="pill-btn ghost" onClick={handleReset}>
                ⏹ 리셋
              </button>
            </>
          )}

          {timerState.phase === "break" && (
            <button className="pill-btn ghost" onClick={handleSkipBreak}>
              ⏭ 휴식 건너뛰기
            </button>
          )}
        </div>
      </section>

      <section className="card subject-manage-card">
        <button
          className="manage-toggle"
          onClick={() => setManagingSubjects((v) => !v)}
          aria-expanded={managingSubjects}
        >
          <span>🥬 과목 관리</span>
          <span className="chevron">{managingSubjects ? "▲" : "▼"}</span>
        </button>

        {managingSubjects && (
          <div className="manage-body">
            <form onSubmit={handleAddSubject} className="add-subject-form">
              <input
                type="text"
                placeholder="새 과목 이름 (예: Coding)"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                maxLength={30}
              />
              <button type="submit" className="pill-btn primary" disabled={!newSubjectName.trim()}>
                추가
              </button>
            </form>

            <ul className="subject-list">
              {subjects.map((s) => (
                <li key={s.id} className="subject-list-item">
                  <span>🌱 {s.name}</span>
                  <button
                    className="icon-btn"
                    onClick={() => handleDeleteSubject(s.id)}
                    aria-label={`${s.name} 삭제`}
                  >
                    🗑
                  </button>
                </li>
              ))}
              {subjects.length === 0 && <li className="muted">등록된 과목이 없어요.</li>}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}

// 배포 시 .env 또는 빌드 환경변수로 REACT_APP_API_URL을 지정하세요.
// 지정하지 않으면 로컬 개발 서버(http://localhost:5000)를 사용합니다.
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let message = `요청에 실패했어요 (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch (_) {
      /* ignore parse errors */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getSubjects: () => request("/subjects"),
  createSubject: (name) =>
    request("/subjects", { method: "POST", body: JSON.stringify({ name }) }),
  deleteSubject: (id) => request(`/subjects/${id}`, { method: "DELETE" }),

  getSessions: ({ subjectId, range } = {}) => {
    const params = new URLSearchParams();
    if (subjectId) params.set("subject_id", subjectId);
    if (range) params.set("range", range);
    const qs = params.toString();
    return request(`/sessions${qs ? `?${qs}` : ""}`);
  },
  createSession: (payload) =>
    request("/sessions", { method: "POST", body: JSON.stringify(payload) }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: "DELETE" }),

  getStats: () => request("/stats"),
};

export default api;

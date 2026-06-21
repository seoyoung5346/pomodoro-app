import os
import sqlite3
from datetime import datetime, timedelta

from flask import Flask, g, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pomodoro.db")
WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            duration INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
        )
        """
    )
    # 기본 과목이 하나도 없으면 시드 데이터 추가
    cur = db.execute("SELECT COUNT(*) FROM subjects")
    if cur.fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO subjects (name) VALUES (?)",
            [("Work",), ("Reading",), ("Exercise",), ("Study",)],
        )
    db.commit()
    db.close()


# ---------------------------------------------------------------------------
# Subjects
# ---------------------------------------------------------------------------
@app.route("/subjects", methods=["GET"])
def list_subjects():
    db = get_db()
    rows = db.execute("SELECT id, name FROM subjects ORDER BY id ASC").fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/subjects", methods=["POST"])
def create_subject():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    db = get_db()
    try:
        cur = db.execute("INSERT INTO subjects (name) VALUES (?)", (name,))
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "subject already exists"}), 409

    return jsonify({"id": cur.lastrowid, "name": name}), 201


@app.route("/subjects/<int:subject_id>", methods=["DELETE"])
def delete_subject(subject_id):
    db = get_db()
    db.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    db.commit()
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------
@app.route("/sessions", methods=["GET"])
def list_sessions():
    subject_id = request.args.get("subject_id")
    date_range = request.args.get("range", "all")

    query = """
        SELECT s.id, s.subject_id, sub.name AS subject_name, s.duration, s.created_at
        FROM sessions s
        JOIN subjects sub ON sub.id = s.subject_id
        WHERE 1 = 1
    """
    params = []

    if subject_id:
        query += " AND s.subject_id = ?"
        params.append(subject_id)

    if date_range == "week":
        start = (datetime.now() - timedelta(days=7)).isoformat()
        query += " AND s.created_at >= ?"
        params.append(start)
    elif date_range == "month":
        start = (datetime.now() - timedelta(days=30)).isoformat()
        query += " AND s.created_at >= ?"
        params.append(start)

    query += " ORDER BY s.created_at DESC"

    db = get_db()
    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/sessions", methods=["POST"])
def create_session():
    data = request.get_json(silent=True) or {}
    subject_id = data.get("subject_id")
    duration = data.get("duration")

    if not subject_id or not duration:
        return jsonify({"error": "subject_id and duration are required"}), 400

    created_at = data.get("created_at") or datetime.now().isoformat()

    db = get_db()
    subject = db.execute(
        "SELECT id FROM subjects WHERE id = ?", (subject_id,)
    ).fetchone()
    if not subject:
        return jsonify({"error": "subject not found"}), 404

    cur = db.execute(
        "INSERT INTO sessions (subject_id, duration, created_at) VALUES (?, ?, ?)",
        (subject_id, duration, created_at),
    )
    db.commit()

    return (
        jsonify(
            {
                "id": cur.lastrowid,
                "subject_id": subject_id,
                "duration": duration,
                "created_at": created_at,
            }
        ),
        201,
    )


@app.route("/sessions/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    db = get_db()
    db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    db.commit()
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------
@app.route("/stats", methods=["GET"])
def stats():
    db = get_db()

    # 전체 집중 시간(분 -> 시간)
    total_minutes = db.execute(
        "SELECT COALESCE(SUM(duration), 0) AS total FROM sessions"
    ).fetchone()["total"]
    total_hours = round(total_minutes / 60, 1)

    # 이번 주 세션 수
    week_start = (datetime.now() - timedelta(days=7)).isoformat()
    sessions_this_week = db.execute(
        "SELECT COUNT(*) AS cnt FROM sessions WHERE created_at >= ?", (week_start,)
    ).fetchone()["cnt"]

    # 과목별 집중 시간
    by_subject_rows = db.execute(
        """
        SELECT sub.name AS name, COALESCE(SUM(s.duration), 0) AS minutes
        FROM subjects sub
        LEFT JOIN sessions s ON s.subject_id = sub.id
        GROUP BY sub.id
        ORDER BY sub.id ASC
        """
    ).fetchall()
    by_subject = [dict(r) for r in by_subject_rows]

    # 요일별(월~일) 집중 시간
    all_sessions = db.execute("SELECT duration, created_at FROM sessions").fetchall()
    by_weekday = {day: 0 for day in WEEKDAY_NAMES}
    for row in all_sessions:
        try:
            dt = datetime.fromisoformat(row["created_at"])
        except ValueError:
            continue
        day_name = WEEKDAY_NAMES[dt.weekday()]
        by_weekday[day_name] += row["duration"]

    # 연속 집중일(streak) 계산: 세션이 있었던 날짜들을 기준으로 오늘(또는 어제)부터 역산
    date_rows = db.execute(
        "SELECT DISTINCT date(created_at) AS d FROM sessions ORDER BY d DESC"
    ).fetchall()
    session_dates = set(r["d"] for r in date_rows)

    streak = 0
    cursor_date = datetime.now().date()
    # 오늘 세션이 없으면 어제부터 카운트 (오늘이 아직 안 끝났을 수 있으므로)
    if cursor_date.isoformat() not in session_dates:
        cursor_date -= timedelta(days=1)

    while cursor_date.isoformat() in session_dates:
        streak += 1
        cursor_date -= timedelta(days=1)

    return jsonify(
        {
            "streak": streak,
            "total_hours": total_hours,
            "sessions_this_week": sessions_this_week,
            "by_subject": by_subject,
            "by_weekday": by_weekday,
        }
    )


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "pomodoro-api"})


init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)

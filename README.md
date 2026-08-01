# 🍅 토마토 뽀모도로 — 집중 시간 트래커

뽀모도로 타이머로 집중 세션을 진행하고, 과목별로 태그를 붙이고, 대시보드에서 패턴을 확인하는 풀스택 앱입니다.
**초록 파 🌿 + 빨강 토마토 🍅** 컨셉으로 디자인했습니다 — 집중 중엔 토마토가 빨갛게 익어가고, 휴식 중엔 파가 자랍니다.

```
pomodoro-app/
├── backend/            # Flask API
│   ├── main.py
│   ├── requirements.txt
│   ├── runtime.txt
│   └── .gitignore
├── frontend/           # React 앱
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
└── render.yaml         # Render 배포 설정 (Blueprint)
```
---

## 1. 로컬에서 실행하기

### 백엔드 (Flask)

### 프론트엔드 (React)

### 사전 준비

## 2-1. 백엔드를 Render에 배포하기

**방법 https://render.com 에 GitHub 계정으로 가입/로그인.

## 2-2. 프론트엔드를 GitHub Pages에 배포하기

## 3. 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React 18, React Router (HashRouter), Recharts |
| Backend | Python Flask, Flask-CORS, Gunicorn |
| DB | SQLite (파일 기반, 별도 설치 불필요) |
| 배포 | Frontend → GitHub Pages / Backend → Render (Free) |

## 4. 주요 기능 요약

- **Timer**: 25분 집중 → 자동 5분 휴식, 일시정지/재개/리셋, 원형 진행 인디케이터(토마토가 익어가는 연출), `localStorage`로 새로고침 후에도 진행 상태 복원, Web Audio API로 종료 알림음(외부 mp3 불필요)
- **History**: 과목/기간(이번 주·이번 달·전체) 필터, 세션 삭제
- **Dashboard**: 연속 집중일(streak), 총 집중 시간, 이번 주 세션 수, 과목별 막대 차트, 요일별(월~일) 막대 차트

## 5. API 명세

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/subjects` | 모든 과목 목록 |
| POST | `/subjects` | 새 과목 생성 |
| DELETE | `/subjects/<id>` | 과목 삭제 |
| GET | `/sessions?subject_id=&range=` | 세션 목록 (필터 지원) |
| POST | `/sessions` | 완료된 세션 저장 |
| DELETE | `/sessions/<id>` | 세션 삭제 |
| GET | `/stats` | 대시보드 통계 |

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

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

`http://localhost:5000` 에서 API가 실행됩니다. 첫 실행 시 `pomodoro.db` (SQLite)가 자동 생성되고, 기본 과목(Work/Reading/Exercise/Study)이 시드됩니다.

### 프론트엔드 (React)

```bash
cd frontend
npm install
cp .env.example .env       # REACT_APP_API_URL=http://localhost:5000
npm start
```

`http://localhost:3000` 에서 앱이 열립니다.

---

## 2. 배포 — Railway 대신 **Render 무료 플랜** 사용하기

Render는 신용카드 없이 가입 가능하고, **Web Service 무료 플랜**으로 Flask 백엔드를 영구적으로(슬립 모드 포함) 무료로 호스팅할 수 있습니다.
프론트엔드는 GitHub Pages에 무료로 올립니다.

### 사전 준비

1. 이 프로젝트를 GitHub 저장소에 푸시합니다.
   ```bash
   cd pomodoro-app
   git init
   git add .
   git commit -m "init: 토마토 뽀모도로 앱"
   git branch -M main
   git remote add origin https://github.com/<당신의-아이디>/pomodoro-app.git
   git push -u origin main
   ```

### 2-1. 백엔드를 Render에 배포하기

**방법 A — 대시보드에서 직접 (가장 쉬움)**

1. https://render.com 에 GitHub 계정으로 가입/로그인합니다.
2. 대시보드에서 **New +** → **Web Service** 클릭.
3. 방금 푸시한 GitHub 저장소를 선택하고 **Connect**.
4. 설정값을 다음과 같이 입력합니다.
   | 항목 | 값 |
   |---|---|
   | Name | `pomodoro-api` (원하는 이름) |
   | Region | Singapore (한국과 가장 가까움) |
   | Branch | `main` |
   | Root Directory | `backend` |
   | Runtime | Python 3 |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `gunicorn main:app --bind 0.0.0.0:$PORT` |
   | Instance Type | **Free** |
5. **Create Web Service** 클릭 → 빌드/배포가 자동 진행됩니다 (3~5분).
6. 배포가 끝나면 상단에 `https://pomodoro-api-xxxx.onrender.com` 같은 URL이 생깁니다. 이 URL을 복사해두세요 — 프론트엔드에서 사용합니다.

**방법 B — `render.yaml` Blueprint로 한 번에 (코드로 관리하고 싶다면)**

저장소 루트에 이미 포함된 `render.yaml`을 사용하면 대시보드 입력 없이 자동 설정됩니다.

1. Render 대시보드 → **New +** → **Blueprint**.
2. 저장소를 선택하면 Render가 `render.yaml`을 읽어 서비스를 자동 구성합니다.
3. **Apply** 클릭하면 끝.

> ⚠️ **무료 플랜 특이사항**
> - 15분간 요청이 없으면 서비스가 슬립 상태가 되고, 다음 요청 시 깨어나는 데 약 30~50초가 걸립니다 (첫 로딩이 느릴 수 있어요).
> - 무료 플랜은 디스크가 영구적이지 않을 수 있어, 재배포 시 SQLite(`pomodoro.db`)가 초기화될 수 있습니다. 데이터를 꼭 보존하고 싶다면 Render의 **PostgreSQL 무료 인스턴스**를 추가하고 `main.py`의 DB 연결부를 교체하는 것을 권장합니다 (이 가이드의 기본 구성은 SQLite로 빠르게 시작하는 버전입니다).

### 2-2. 프론트엔드를 GitHub Pages에 배포하기

1. `frontend/.env` 또는 빌드 시 환경변수로 Render 백엔드 URL을 지정합니다.
   ```bash
   cd frontend
   echo "REACT_APP_API_URL=https://pomodoro-api-xxxx.onrender.com" > .env
   ```
2. `package.json`의 `homepage` 필드를 GitHub Pages 주소로 바꿉니다.
   ```json
   "homepage": "https://<당신의-깃허브-아이디>.github.io/pomodoro-app"
   ```
3. 배포 패키지 설치 및 실행:
   ```bash
   npm install -g gh-pages   # 이미 devDependencies에 있다면 생략 가능
   npm run build
   npm run deploy            # = gh-pages -d build
   ```
4. GitHub 저장소 → **Settings** → **Pages** 에서 Source가 `gh-pages` 브랜치로 설정되어 있는지 확인합니다 (`gh-pages` 명령이 자동으로 만들어줍니다).
5. 1~2분 후 `https://<아이디>.github.io/pomodoro-app` 에서 접속됩니다.

> 💡 라우팅은 `HashRouter`를 사용해 GitHub Pages의 서브경로/새로고침 이슈 없이 바로 동작합니다 (`/#/history`, `/#/dashboard` 형태).

### 2-3. CORS 확인

`backend/main.py`는 `flask-cors`로 모든 출처를 허용(`CORS(app)`)하고 있어 별도 설정 없이 GitHub Pages → Render 호출이 바로 동작합니다. 운영 환경에서 출처를 제한하고 싶다면 다음처럼 좁힐 수 있습니다.

```python
CORS(app, origins=["https://<당신의-아이디>.github.io"])
```

---

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

// 외부 오디오 파일 없이 Web Audio API로 부드러운 멜로디 알림음을 생성합니다.
let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(ctx, freq, startTime, duration, volume = 0.18) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// 집중 세션 종료 알림: 상승하는 3음 멜로디 (활기찬 토마토 종소리 느낌)
export function playFocusEndChime() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      playTone(ctx, freq, now + i * 0.16, 0.35);
    });
  } catch (_) {
    /* 오디오를 지원하지 않는 환경이면 조용히 무시 */
  }
}

// 휴식 종료 알림: 차분한 2음 (파가 다 자랐다는 느낌)
export function playBreakEndChime() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [392.0, 523.25].forEach((freq, i) => {
      playTone(ctx, freq, now + i * 0.2, 0.4);
    });
  } catch (_) {
    /* ignore */
  }
}

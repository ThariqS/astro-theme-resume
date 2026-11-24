// Shared page runtime (same contract as ~/Projects/dioramas/lib/runtime.js).
//
//   diorama({ width, height, fps, duration, render(t), ready })
//
// - render(t) draws the frame for time t (0 <= t < duration) deterministically: no wall clock, no Math.random().
// - Live mode loops t over [0, duration) and scales #stage to fit the window.
//   Keys: space = pause, arrows = scrub 1/fps (shift = 1s).
// - ?t=<seconds> freezes on that frame (for review). ?record exposes window.DIORAMA for a recorder.
export function diorama({ width, height, fps = 30, duration, render, ready = Promise.resolve() }) {
  const params = new URLSearchParams(location.search);
  const record = params.has('record');
  const stage = document.getElementById('stage');
  Object.assign(stage.style, { width: width + 'px', height: height + 'px', position: 'absolute', left: '0', top: '0', overflow: 'hidden', transformOrigin: '0 0' });
  document.documentElement.style.background = record ? 'transparent' : '#111';
  document.body.style.margin = '0';
  window.DIORAMA = { width, height, fps, duration, render, ready: Promise.resolve(ready).then(() => document.fonts.ready) };
  if (record) return;

  const fit = () => {
    const s = Math.min(innerWidth / width, innerHeight / height);
    stage.style.transform = `translate(${(innerWidth - width * s) / 2}px, ${(innerHeight - height * s) / 2}px) scale(${s})`;
  };
  addEventListener('resize', fit); fit();
  let t = 0, paused = false, last = performance.now();
  if (params.has('t')) { t = ((+params.get('t') % duration) + duration) % duration; paused = true; }
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') paused = !paused;
    if (e.code === 'ArrowRight') t += e.shiftKey ? 1 : 1 / fps;
    if (e.code === 'ArrowLeft') t -= e.shiftKey ? 1 : 1 / fps;
    t = ((t % duration) + duration) % duration;
  });
  // A page embedding this in an iframe can postMessage({ diorama: 'sleep' | 'wake' }) to stop drawing while it's off screen.
  let asleep = false;
  addEventListener('message', (e) => {
    if (e.data?.diorama === 'sleep') asleep = true;
    if (e.data?.diorama === 'wake') asleep = false;
  });
  window.DIORAMA.ready.then(() => {
    const loop = (now) => {
      if (!asleep) {
        if (!paused) t = (t + (now - last) / 1000) % duration;
        render(t);
      }
      last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

import React, { useEffect, useRef, useState } from 'react';

// The flowering branch from titanleap.co. The MP4 holds colour on top and its alpha matte
// below; WebGL combines them so the branch has a transparent background in every browser
// (Safari has no alpha video). It grows once on load and stops fully grown.
const BASE = 'https://titanleap.co/hero';
const END = 6.3; // seconds: fully grown

export const GrowingBranch: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) { setFallback(true); return; }

    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.preload = 'auto'; video.crossOrigin = 'anonymous';
    video.src = video.canPlayType('video/mp4; codecs="avc1.640028"')
      ? (window.innerWidth < 900 ? `${BASE}/branch-sd.mp4` : `${BASE}/branch-2k.mp4`)
      : `${BASE}/branch.webm`;

    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 v;uniform sampler2D t;void main(){vec3 c=texture2D(t,vec2(v.x,v.y*.5)).rgb;float a=texture2D(t,vec2(v.x,.5+v.y*.5)).r;a=smoothstep(.03,.97,a);gl_FragColor=vec4(c*a,a);}'));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { setFallback(true); return; }
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.clearColor(0, 0, 0, 0);

    let alive = true;
    const size = () => {
      const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.min(2560, Math.round(r.width * d)), h = Math.round((w * 9) / 16);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h);
      draw();
    };
    const draw = () => {
      if (!alive || video.readyState < 2) return;
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video); }
      catch { setFallback(true); return; }
      gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const tick = () => {
      if (!alive) return;
      if (video.currentTime >= END - 0.02 && !video.paused) video.pause();
      draw();
      if (!video.paused) requestAnimationFrame(tick);
    };
    video.addEventListener('playing', () => requestAnimationFrame(tick));
    video.addEventListener('seeked', draw);
    video.addEventListener('loadeddata', () => {
      draw();
      if (reduce) { video.currentTime = END; return; }
      const p = video.play(); if (p?.catch) p.catch(() => { video.currentTime = END; });
    });
    video.addEventListener('error', () => setFallback(true));
    size();
    window.addEventListener('resize', size);
    return () => { alive = false; window.removeEventListener('resize', size); video.pause(); video.removeAttribute('src'); video.load(); };
  }, []);

  return fallback
    ? <img src={`${BASE}/branch-end.webp`} alt="" aria-hidden="true" className={className} />
    : <canvas ref={canvasRef} aria-hidden="true" className={className} />;
};

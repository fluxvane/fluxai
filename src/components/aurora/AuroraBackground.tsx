"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Fixed, behind-everything NIM-style backdrop: two soft green mesh glows
 * (CSS) plus a canvas particle field of drifting, twinkling green dots and
 * "+" sparkles. Never intercepts pointer events (z-index:-1,
 * pointer-events:none via .aurora-bg). Under reduced-motion the mesh drift is
 * disabled (CSS) and the canvas renders a single static frame instead of
 * animating.
 */

const PARTICLE_COLORS = ["#76b900", "#a3e635", "#34d399", "#eaffd0"];

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  plus: boolean;
}

function seedParticles(width: number, height: number): Particle[] {
  const count = Math.min(140, Math.floor((width * height) / 18_000));
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 0.8 + Math.random() * 1.7,
    vx: (Math.random() - 0.5) * 10,
    vy: -(4 + Math.random() * 10),
    alpha: 0.25 + Math.random() * 0.55,
    twinkleSpeed: 0.4 + Math.random() * 1.2,
    twinklePhase: Math.random() * Math.PI * 2,
    color:
      PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)] ??
      PARTICLE_COLORS[0],
    plus: Math.random() < 0.14,
  }));
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  width: number,
  height: number,
  timeSec: number,
) {
  ctx.clearRect(0, 0, width, height);
  for (const p of particles) {
    const twinkle =
      0.45 +
      0.55 * (0.5 + 0.5 * Math.sin(timeSec * p.twinkleSpeed + p.twinklePhase));
    ctx.globalAlpha = p.alpha * twinkle;
    ctx.fillStyle = p.color;
    if (p.plus) {
      const arm = p.size * 2.4;
      const thickness = Math.max(1, p.size * 0.7);
      ctx.fillRect(p.x - arm, p.y - thickness / 2, arm * 2, thickness);
      ctx.fillRect(p.x - thickness / 2, p.y - arm, thickness, arm * 2);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export default function AuroraBackground() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return; // jsdom / unsupported: CSS glows still show

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rafId = 0;
    let lastTs = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = seedParticles(width, height);
      if (reduce) drawFrame(ctx, particles, width, height, 0);
    };

    const tick = (ts: number) => {
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0;
      lastTs = ts;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Wrap around edges (with margin so plus arms don't pop).
        if (p.y < -8) p.y = height + 8;
        if (p.x < -8) p.x = width + 8;
        else if (p.x > width + 8) p.x = -8;
      }
      drawFrame(ctx, particles, width, height, ts / 1000);
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (reduce || rafId) return;
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce]);

  return (
    <div
      className="aurora-bg"
      data-static={reduce ? "true" : undefined}
      aria-hidden
    >
      <div className="aurora-bg__mesh aurora-bg__mesh--green" />
      <div className="aurora-bg__mesh aurora-bg__mesh--emerald" />
      <canvas ref={canvasRef} className="aurora-bg__particles" />
      <div className="aurora-bg__grain" />
    </div>
  );
}

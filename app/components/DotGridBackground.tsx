"use client";

import { useEffect, useRef } from "react";

interface DotGridBackground {
  dotSpacing?: number;
  dotRadius?: number;
  highlightRadius?: number;
  darkMode?: boolean;
}

export default function DotGridBackground({
  dotSpacing = 19.7, // tighter grid
  dotRadius = 1.9, // slightly smaller to match density
  highlightRadius = 90,
}: DotGridBackground) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const smoothMouse = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const animationFrameRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const isDarkMode = () => document.documentElement.classList.contains("dark");

  const getColors = () => {
    const dark = isDarkMode();
    return {
      bg: dark ? "#000000" : "#ffffff",
      dotNormal: dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)",
      dotHighlight: dark ? "#ffffff" : "#000000",
    };
  };

  const generateDots = (width: number, height: number, spacing: number) => {
    const dots: Array<{ x: number; y: number }> = [];
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        dots.push({
          x: col * spacing + spacing / 2,
          y: row * spacing + spacing / 2,
        });
      }
    }
    return dots;
  };

  const draw = (
    ctx: CanvasRenderingContext2D,
    dots: Array<{ x: number; y: number }>,
    width: number,
    height: number,
    colors: ReturnType<typeof getColors>,
  ) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const mx = smoothMouse.current.x;
    const my = smoothMouse.current.y;

    for (const dot of dots) {
      const dx = dot.x - mx;
      const dy = dot.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const t = Math.max(0, 1 - dist / highlightRadius);
      const eased = t * t * (3 - 2.6 * t);

      const radius = dotRadius + eased * 1;
      const alpha = 0.18 + eased * 0.65;

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${isDarkMode() ? "156,163,175" : "31,41,55"}, ${alpha})`;
      ctx.fill();
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = (canvas as any).__dots;
    if (!dots) return;

    smoothMouse.current.x += mousePos.current.x - smoothMouse.current.x;
    smoothMouse.current.y += mousePos.current.y - smoothMouse.current.y;

    draw(ctx, dots, canvas.width, canvas.height, getColors());

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width;
    canvas.height = height;

    (canvas as any).__dots = generateDots(width, height, dotSpacing);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    mousePos.current = {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleMouseLeave = () => {
    mousePos.current = { x: -9999, y: -9999 };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(parent);
    resizeObserverRef.current = resizeObserver;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    animate();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dotSpacing, dotRadius, highlightRadius]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}

'use client';

import React, { useEffect, useRef } from 'react';

/**
 * CyberBackground - Ultra-smooth 60fps dynamic video-like cybernetic canvas background.
 * Combines flowing fluid aurora plasma, 3D perspective cyber grid, interactive
 * constellation particle field, and volumetric neon lighting blooms.
 */
export default function CyberBackground({ interactive = true, density = 'normal', className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
    let time = 0;

    const particleCount = density === 'high' ? 85 : 55;
    const particles = [];

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Re-initialize particles across the new dimensions
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 1.8 + 0.8,
          color: i % 3 === 0 ? 'rgba(168, 85, 247, ' : i % 3 === 1 ? 'rgba(6, 182, 212, ' : 'rgba(236, 72, 153, ',
          baseAlpha: Math.random() * 0.45 + 0.25,
          pulseSpeed: Math.random() * 0.02 + 0.008,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    resize();
    window.addEventListener('resize', resize);

    const onPointerMove = (e) => {
      if (!interactive) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.targetX = clientX;
      mouse.targetY = clientY;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });

    // Draw dynamic fluid aurora ribbon
    function drawAuroraWave(t, offsetY, amp, freq, colorStart, colorMid, colorEnd) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height);

      const step = 16;
      for (let x = 0; x <= width + step; x += step) {
        const nx = x / width;
        const wave1 = Math.sin(nx * freq + t * 0.0008) * amp;
        const wave2 = Math.cos(nx * (freq * 1.6) - t * 0.0012) * (amp * 0.55);
        const wave3 = Math.sin(nx * (freq * 0.5) + t * 0.0004) * (amp * 0.35);
        const y = offsetY + wave1 + wave2 + wave3;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, offsetY - amp, width, height);
      grad.addColorStop(0, colorStart);
      grad.addColorStop(0.5, colorMid);
      grad.addColorStop(1, colorEnd);
      ctx.fillStyle = grad;
      ctx.globalCompositeOperation = 'screen';
      ctx.fill();
      ctx.restore();
    }

    // Draw 3D perspective cyber grid
    function drawCyberGrid(t) {
      const horizonY = height * 0.62;
      const gridHeight = height - horizonY;
      if (gridHeight <= 10) return;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Subtle horizon glow line
      const horizonGrad = ctx.createLinearGradient(0, horizonY - 10, 0, horizonY + 30);
      horizonGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
      horizonGrad.addColorStop(0.3, 'rgba(168, 85, 247, 0.22)');
      horizonGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.28)');
      horizonGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = horizonGrad;
      ctx.fillRect(0, horizonY - 10, width, 40);

      // Horizontal perspective grid lines
      ctx.lineWidth = 1;
      const numLines = 14;
      const speed = (t * 0.04) % 1;

      for (let i = 1; i <= numLines; i++) {
        const progress = ((i + speed) / numLines);
        // Exponential perspective falloff
        const y = horizonY + Math.pow(progress, 2.3) * gridHeight;
        const alpha = Math.sin(progress * Math.PI) * 0.18;
        if (alpha > 0.01) {
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Vertical perspective fan lines vanishing to center horizon
      const vanishX = width * 0.5 + (mouse.x - width * 0.5) * 0.05;
      const vanishY = horizonY - 15;
      const numVerticals = 20;

      for (let j = -numVerticals / 2; j <= numVerticals / 2; j++) {
        const bottomX = width * 0.5 + j * (width / (numVerticals * 0.65));
        const alpha = Math.max(0, 0.14 - Math.abs(j) * 0.006);
        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(vanishX, vanishY);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
      }

      ctx.restore();
    }

    function render(currentTime) {
      time = currentTime;

      // Mouse easing
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Deep obsidian void base
      ctx.fillStyle = '#07070b';
      ctx.fillRect(0, 0, width, height);

      // Radial ambient lighting blobs (volumetric neon blooms)
      const pulse = Math.sin(time * 0.001) * 0.15 + 0.85;

      const blob1X = width * 0.2 + Math.cos(time * 0.0006) * 120;
      const blob1Y = height * 0.3 + Math.sin(time * 0.0007) * 90;
      const rad1 = ctx.createRadialGradient(blob1X, blob1Y, 10, blob1X, blob1Y, width * 0.55 * pulse);
      rad1.addColorStop(0, 'rgba(147, 51, 234, 0.28)');
      rad1.addColorStop(0.5, 'rgba(91, 33, 182, 0.12)');
      rad1.addColorStop(1, 'rgba(7, 7, 11, 0)');
      ctx.fillStyle = rad1;
      ctx.fillRect(0, 0, width, height);

      const blob2X = width * 0.8 + Math.sin(time * 0.0005) * 140;
      const blob2Y = height * 0.65 + Math.cos(time * 0.0006) * 100;
      const rad2 = ctx.createRadialGradient(blob2X, blob2Y, 10, blob2X, blob2Y, width * 0.5 * pulse);
      rad2.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
      rad2.addColorStop(0.5, 'rgba(14, 116, 144, 0.08)');
      rad2.addColorStop(1, 'rgba(7, 7, 11, 0)');
      ctx.fillStyle = rad2;
      ctx.fillRect(0, 0, width, height);

      // Fluid Aurora ribbons
      drawAuroraWave(
        time,
        height * 0.42,
        height * 0.16,
        3.2,
        'rgba(168, 85, 247, 0.18)',
        'rgba(236, 72, 153, 0.12)',
        'rgba(7, 7, 11, 0)'
      );

      drawAuroraWave(
        time * 1.25 + 500,
        height * 0.55,
        height * 0.18,
        4.1,
        'rgba(6, 182, 212, 0.16)',
        'rgba(124, 58, 237, 0.14)',
        'rgba(7, 7, 11, 0)'
      );

      // Cyber Grid
      drawCyberGrid(time);

      // Constellation Particles
      ctx.save();
      const pLen = particles.length;

      for (let i = 0; i < pLen; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap boundaries
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Subtle interactive mouse repulsion/drift
        if (interactive && mouse.x > 0) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140) {
            const force = (140 - dist) / 140;
            p.x -= (dx / dist) * force * 1.8;
            p.y -= (dy / dist) * force * 1.8;
          }
        }

        // Particle pulse
        const alpha = p.baseAlpha + Math.sin(time * p.pulseSpeed + p.phase) * 0.18;
        ctx.fillStyle = `${p.color}${Math.max(0.05, Math.min(0.9, alpha))})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < pLen; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p2.x - p.x, p2.y - p.y);
          if (dist < 100) {
            const lineAlpha = (1 - dist / 100) * 0.16;
            ctx.strokeStyle = `rgba(168, 85, 247, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
    };
  }, [interactive, density]);

  return (
    <div className={`cyber-canvas-shell ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="cyber-canvas" />
      <div className="cyber-canvas-overlay" />
      <div className="cyber-canvas-vignette" />
    </div>
  );
}

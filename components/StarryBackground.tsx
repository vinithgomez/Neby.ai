import React, { useEffect, useRef } from 'react';

const StarryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars: {x: number, y: number, size: number, opacity: number, speed: number, twinkleSpeed: number}[] = [];
    const shootingStars: {x: number, y: number, len: number, speed: number, life: number, angle: number}[] = [];

    // Initialize static stars
    for(let i=0; i<300; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random(),
            speed: Math.random() * 0.05,
            twinkleSpeed: (Math.random() - 0.5) * 0.02
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        
        // Draw static stars
        stars.forEach(star => {
            star.opacity += star.twinkleSpeed;
            if (star.opacity > 1 || star.opacity < 0.2) star.twinkleSpeed *= -1;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(star.opacity)})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Manage shooting stars
        // Randomly spawn
        if (Math.random() < 0.015) { 
             shootingStars.push({
                 x: Math.random() * width,
                 y: Math.random() * height * 0.6, // Start mostly in upper 60%
                 len: Math.random() * 100 + 50,
                 speed: Math.random() * 15 + 10,
                 life: 1.0,
                 angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2 // Roughly diagonal
             });
        }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const s = shootingStars[i];
            
            const endX = s.x + Math.cos(s.angle) * s.len;
            const endY = s.y + Math.sin(s.angle) * s.len;

            // Create gradient trail
            const grad = ctx.createLinearGradient(s.x, s.y, endX, endY);
            grad.addColorStop(0, `rgba(255,255,255,${s.life})`);
            grad.addColorStop(1, `rgba(255,255,255,0)`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Move
            s.x += Math.cos(s.angle) * s.speed;
            s.y += Math.sin(s.angle) * s.speed;
            s.life -= 0.015;

            if (s.life <= 0 || s.x > width || s.y > height) {
                shootingStars.splice(i, 1);
            }
        }

        requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none mix-blend-screen" />;
};

export default StarryBackground;
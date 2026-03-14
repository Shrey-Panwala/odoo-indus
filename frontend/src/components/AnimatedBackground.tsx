import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  color: string
  opacity: number
  pulse: number
  pulseSpeed: number
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let particles: Particle[] = []

    const colors = ['#3fddff', '#14b8d4', '#22d3ee', '#f59e0b', '#38bdf8']

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    const initParticles = () => {
      particles = []
      const count = Math.floor((canvas.width * canvas.height) / 15000)
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.4,
          speedY: (Math.random() - 0.5) * 0.4,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.6 + 0.2,
          pulse: 0,
          pulseSpeed: Math.random() * 0.02 + 0.01,
        })
      }
    }

    const drawConnections = () => {
      const maxDist = 120
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = ((maxDist - dist) / maxDist) * 0.15
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(63, 221, 255, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw grid lines
      ctx.strokeStyle = 'rgba(63, 221, 255, 0.03)'
      ctx.lineWidth = 1
      const gridSize = 60
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      drawConnections()

      particles.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY
        p.pulse += p.pulseSpeed

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        const pulseOpacity = p.opacity + Math.sin(p.pulse) * 0.2

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.floor(pulseOpacity * 255).toString(16).padStart(2, '0')
        ctx.fill()

        // Glow effect
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        gradient.addColorStop(0, p.color + '40')
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'linear-gradient(150deg, #010b14 0%, #04111e 34%, #07182a 65%, #03111e 100%)' }}
      />
      <div className="scan-line" />
      {/* Ambient glow orbs */}
      <div
        className="fixed z-0 pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          top: '-200px',
          left: '-200px',
          background: 'radial-gradient(circle, rgba(63, 221, 255, 0.15) 0%, transparent 72%)',
          borderRadius: '50%',
          animation: 'pulse-glow 8s ease-in-out infinite',
        }}
      />
      <div
        className="fixed z-0 pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          bottom: '-150px',
          right: '-150px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'pulse-glow 6s ease-in-out infinite 3s',
        }}
      />
      <div
        className="fixed z-0 pointer-events-none"
        style={{
          width: '400px',
          height: '400px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(20, 184, 212, 0.08) 0%, transparent 72%)',
          borderRadius: '50%',
          animation: 'pulse-glow 10s ease-in-out infinite 1s',
        }}
      />
    </>
  )
}

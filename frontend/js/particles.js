class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.7 + 0.3;
        this.isHovered = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        if (mouse.x && mouse.y) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 100) {
                this.isHovered = true;
                this.x += dx * 0.02;
                this.y += dy * 0.02;
            } else {
                this.isHovered = false;
                this.x += (this.baseX - this.x) * 0.05;
                this.y += (this.baseY - this.y) * 0.05;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const color = this.isHovered ? '74, 144, 226' : '255, 255, 255';
        ctx.fillStyle = `rgba(${color}, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.connectionDistance = 100;
        this.particleCount = 80;
        this.init();
    }

    init() {
        canvas = document.getElementById('particleCanvas');
        ctx = canvas.getContext('2d');
        this.resizeCanvas();
        this.createParticles();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.createParticles();
        });
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('mouseleave', () => {
            mouse.x = undefined;
            mouse.y = undefined;
        });
        this.animate();
    }

    resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    createParticles() {
        this.particles = [];
        const density = (canvas.width * canvas.height) / 15000;
        this.particleCount = Math.floor(density);
        for (let i = 0; i < this.particleCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            this.particles.push(new Particle(x, y));
        }
    }

    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < this.connectionDistance) {
                    const opacity = 1 - (distance / this.connectionDistance);
                    ctx.strokeStyle = `rgba(74, 144, 226, ${opacity * 0.2})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.particles.forEach(particle => {
            particle.update();
            particle.draw(ctx);
        });
        this.drawConnections();
        requestAnimationFrame(() => this.animate());
    }
}

let canvas;
let ctx;
const mouse = { x: undefined, y: undefined };

document.addEventListener('DOMContentLoaded', () => {
    const particleSystem = new ParticleSystem();
    console.log('Particle system initialized with', particleSystem.particleCount, 'particles');
});
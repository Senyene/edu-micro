class Typewriter {
    constructor(element, words, wait = 3000) {
        this.element = element;
        this.words = words;
        this.txt = '';
        this.wordIndex = 0;
        this.wait = parseInt(wait, 10);
        this.type();
        this.isDeleting = false;
    }
    
    type() {
        const current = this.wordIndex % this.words.length;
        const fullTxt = this.words[current];
        
        if(this.isDeleting) {
            this.txt = fullTxt.substring(0, this.txt.length - 1);
        } else {
            this.txt = fullTxt.substring(0, this.txt.length + 1);
        }
        
        this.element.innerHTML = this.txt;
        let typeSpeed = 100;
        
        if(this.isDeleting) typeSpeed /= 2;
        
        if(!this.isDeleting && this.txt === fullTxt) {
            typeSpeed = this.wait;
            this.isDeleting = true;
        } else if(this.isDeleting && this.txt === '') {
            this.isDeleting = false;
            this.wordIndex++;
            typeSpeed = 500;
        }
        
        setTimeout(() => this.type(), typeSpeed);
    }
}

function animateCounter(element, target) {
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
        current += increment;
        if(current >= target) {
            element.textContent = target.toLocaleString() + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 20);
}

function smoothScroll(target) {
    const element = document.querySelector(target);
    if(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function startLearning() {
    window.location.href = 'pages/register.html';
}

function exploreCourses() {
    window.location.href = 'pages/dashboard.html#courses';
}

document.addEventListener('DOMContentLoaded', () => {
    const typewriterElement = document.getElementById('typewriter');
    if(typewriterElement) {
        const words = ['Learn Without Limits', 'Master New Skills', 'Build Your Future', 'Transform Your Career'];
        new Typewriter(typewriterElement, words);
    }
    
    const counters = document.querySelectorAll('.stat-number[data-target]');
    const observerOptions = { threshold: 0.5 };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target'));
                animateCounter(entry.target, target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => observer.observe(counter));
    
    document.querySelectorAll('a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            smoothScroll(`#${section}`);
        });
    });
    
    console.log('EduMicro landing page initialized');
});
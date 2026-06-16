/* ============================================================
   مملكة إيليت ⚜️ — السكربت المشترك
   (تبديل المظهر، القائمة المتنقلة للهواتف، تأثير الجزيئات)
   ============================================================ */

/* ---------------- تبديل المظهر (ذهبي / بنفسجي أسطوري) ---------------- */
function toggleCustomTheme() {
    const bodyEl = document.body;
    if (bodyEl.hasAttribute('data-theme')) {
        bodyEl.removeAttribute('data-theme');
        localStorage.removeItem('elite-theme');
    } else {
        bodyEl.setAttribute('data-theme', 'mythic-purple');
        localStorage.setItem('elite-theme', 'mythic-purple');
    }
}

/* استرجاع المظهر المحفوظ عند تحميل الصفحة */
(function restoreTheme() {
    try {
        const saved = localStorage.getItem('elite-theme');
        if (saved === 'mythic-purple') {
            document.body.setAttribute('data-theme', 'mythic-purple');
        }
    } catch (e) { /* تجاهل في حال عدم توفر التخزين */ }
})();

/* ---------------- القائمة المنسدلة الخاصة بالهواتف ---------------- */
function toggleMobileNav() {
    const panel = document.getElementById('mobile-nav-panel');
    const toggleBtn = document.getElementById('menu-toggle-btn');
    if (!panel || !toggleBtn) return;

    const isOpen = panel.classList.toggle('active');
    toggleBtn.classList.toggle('open', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('mobile-nav-panel');
    const toggleBtn = document.getElementById('menu-toggle-btn');
    if (!panel || !toggleBtn) return;

    /* إغلاق القائمة عند الضغط على أي رابط داخلها */
    panel.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            panel.classList.remove('active');
            toggleBtn.classList.remove('open');
            toggleBtn.setAttribute('aria-expanded', 'false');
        });
    });
});

/* ---------------- تأثير الجزيئات المتساقطة ---------------- */
const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PARTICLE_INTERVAL = isSmallScreen ? 650 : 320;
const PARTICLE_LIFETIME = 7500;

function createParticle() {
    const snowContainer = document.getElementById('snow-container');
    if (!snowContainer || document.hidden) return;

    const particle = document.createElement('div');
    particle.classList.add('snowflake');

    const isPurple = document.body.hasAttribute('data-theme');
    const shapes = isPurple ? ['🔮', '✨', '✧', '☪️'] : ['⚜️', '✨', '✧', '•'];

    particle.innerText = shapes[Math.floor(Math.random() * shapes.length)];
    particle.style.left = Math.random() * 100 + 'vw';
    particle.style.animationDuration = (Math.random() * 3 + 5) + 's';
    particle.style.fontSize = (Math.random() * 8 + 8) + 'px';
    particle.style.opacity = Math.random() * 0.4 + 0.3;

    snowContainer.appendChild(particle);
    setTimeout(function () { particle.remove(); }, PARTICLE_LIFETIME);
}

if (!isReducedMotion) {
    setInterval(createParticle, PARTICLE_INTERVAL);
}

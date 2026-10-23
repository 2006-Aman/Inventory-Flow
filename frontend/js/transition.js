
/* ==========================================
   PAGE TRANSITION CONTROLLER
   ========================================== */

(function() {
    const overlay = document.getElementById('page-transition');
    if (!overlay) return;

    const barFill = overlay.querySelector('.t-bar-fill');

    // On page load: quick enter animation
    window.addEventListener('DOMContentLoaded', () => {
        overlay.classList.add('active');
        // Start bar fill
        if (barFill) barFill.style.width = '100%';

        // Remove overlay after short delay
        setTimeout(() => {
            overlay.classList.add('exit');
            setTimeout(() => {
                overlay.classList.remove('active', 'exit');
                overlay.style.display = 'none';
            }, 350);
        }, 500);
    });

    // Intercept all link clicks for exit animation
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Skip: anchors, javascript:, blank targets, same-page anchors
        if (href.startsWith('#') || href.startsWith('javascript:') || href === '') return;
        if (link.target === '_blank') return;

        // Skip if it's the same page
        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        const targetFile = href.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
        if (targetFile === currentFile && !href.includes('#')) return;

        // Don't block the transition overlay's own close
        if (overlay.classList.contains('exit')) return;

        e.preventDefault();

        // Show transition
        overlay.style.display = 'flex';
        overlay.classList.remove('exit');
        overlay.classList.add('active');
        if (barFill) {
            barFill.style.transition = 'none';
            barFill.style.width = '0%';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    barFill.style.transition = 'width 0.5s cubic-bezier(0.4,0,0.2,1)';
                    barFill.style.width = '100%';
                });
            });
        }

        // Navigate after animation
        setTimeout(() => {
            window.location.href = href;
        }, 550);
    });
})();

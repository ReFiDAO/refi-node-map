document.addEventListener('DOMContentLoaded', () => {
    // Intersection Observer for Timeline Items
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the item is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    const timelineContents = document.querySelectorAll('.timeline-content');
    timelineContents.forEach(el => observer.observe(el));

    // Also observe date badges or dots if we want independent animation, but content is fine for now.

    // Smooth Scroll for "Scroll to Explore"
    const scrollIndicator = document.querySelector('.scroll-indicator');
    const timelineSection = document.querySelector('.timeline-section');

    if (scrollIndicator && timelineSection) {
        scrollIndicator.addEventListener('click', () => {
            timelineSection.scrollIntoView({ behavior: 'smooth' });
        });
        scrollIndicator.style.cursor = 'pointer';
    }
});

(() => {
    let theme = 'dark';
    try { theme = localStorage.getItem('theme') || theme; } catch (_) {}
    const apply = value => {
        document.documentElement.dataset.theme = value === 'light' ? 'light' : 'dark';
        document.querySelectorAll('.sidebar-theme').forEach(button => {
            button.setAttribute('aria-label', value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        });
    };
    apply(theme);
    window.toggleTheme = () => {
        theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        apply(theme);
        try { localStorage.setItem('theme', theme); } catch (_) {}
    };
    document.addEventListener('DOMContentLoaded', () => apply(document.documentElement.dataset.theme));
})();

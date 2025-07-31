document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const navItems = document.querySelectorAll('.nav-item');
    const submenuItems = document.querySelectorAll('.nav-item.has-submenu > a');

    // 1. Sidebar Toggle Functionality
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            // Save sidebar state to localStorage
            if (sidebar.classList.contains('collapsed')) {
                localStorage.setItem('sidebarCollapsed', 'true');
            }
            else {
                localStorage.setItem('sidebarCollapsed', 'false');
            }
        });
    }

    // Check localStorage for sidebar state on page load
    if (localStorage.getItem('sidebarCollapsed') === 'true' && sidebar) {
        sidebar.classList.add('collapsed');
    }

    // 2. Theme Toggle Functionality
    if (themeToggleBtn && themeIcon) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            updateThemeIcon();
            // Save theme preference to localStorage
            if (document.body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark');
            }
            else {
                localStorage.setItem('theme', 'light');
            }
        });

        function updateThemeIcon() {
            if (document.body.classList.contains('dark-theme')) {
                themeIcon.setAttribute('data-feather', 'sun');
            }
            else {
                themeIcon.setAttribute('data-feather', 'moon');
            }
            feather.replace(); // Re-render icons
        }

        // Check localStorage for theme preference on page load
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        updateThemeIcon(); // Initial icon based on theme
    }

    // 3. Active Navigation Item Highlighting
    navItems.forEach(item => {
        // Handle only direct children links, not submenu links for this part
        const link = item.querySelector('a:not(.submenu a)');
        if (link) {
            link.addEventListener('click', (e) => {
                // Prevent default if it's just a # link for demo purposes
                if (link.getAttribute('href') === '#') {
                    e.preventDefault();
                }

                // Remove active class from all items
                navItems.forEach(i => i.classList.remove('active'));
                // Add active class to the clicked item
                item.classList.add('active');

                // If it's a submenu parent, don't remove active from it when a child is clicked
                // This logic is handled by the submenu toggle itself
            });
        }
    });

    // 4. Submenu Toggle Functionality
    submenuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent page jump
            const parentNavItem = item.parentElement;
            parentNavItem.classList.toggle('open');

            // Optional: Close other open submenus
            // submenuItems.forEach(otherItem => {
            //     if (otherItem !== item && otherItem.parentElement.classList.contains('open')) {
            //         otherItem.parentElement.classList.remove('open');
            //     }
            // });
        });
    });

    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
});
(() => {
    const images = [...document.querySelectorAll('.gallery-item img')];
    const sections = [...document.querySelectorAll('.section-title')].map(heading => ({
        heading,
        images: [...heading.closest('.section-header').nextElementSibling.querySelectorAll('.gallery-item img')]
    }));
    const viewer = document.getElementById('photoViewer');
    const stage = document.getElementById('viewerStage');
    const photo = document.getElementById('viewerPhoto');
    const title = document.getElementById('viewerTitle');
    const status = document.getElementById('viewerStatus');
    const previous = document.getElementById('viewerPrevious');
    const next = document.getElementById('viewerNext');
    const zoom = document.getElementById('viewerZoom');
    let album, position = 0, opener, previousOverflow, touchStart, suppressClickUntil = 0;
    let requestVersion = 0;
    // Keep a bounded cache; prefetch only after the selected photo is ready.
    const fullImages = new Map();
    function loadFull(src, priority = 'low') {
        if (fullImages.has(src)) return fullImages.get(src);
        const pending = new Promise((resolve, reject) => {
            const loaded = new Image();
            loaded.referrerPolicy = 'no-referrer';
            loaded.fetchPriority = priority;
            loaded.onload = () => resolve(loaded);
            loaded.onerror = reject;
            loaded.src = src;
        });
        fullImages.set(src, pending);
        pending.catch(() => fullImages.delete(src));
        if (fullImages.size > 8) fullImages.delete(fullImages.keys().next().value);
        return pending;
    }

    function resetZoom() {
        stage.classList.remove('zoomed');
        stage.scrollTo(0, 0);
        zoom.textContent = '+';
        zoom.setAttribute('aria-label', 'Zoom in');
        zoom.setAttribute('aria-pressed', 'false');
    }
    function show() {
        resetZoom();
        const image = album.images[position];
        title.textContent = `${album.heading.textContent} · ${position + 1} / ${album.images.length}`;
        previous.disabled = position === 0;
        next.disabled = position === album.images.length - 1;
        const version = ++requestVersion;
        status.textContent = 'Loading sharp image…';
        photo.alt = `${album.heading.textContent}, photo ${position + 1}`;
        // Reuse the browser's already selected thumbnail immediately.
        photo.src = image.currentSrc || image.src;
        const full = image.dataset.fullSrc || image.src;
        loadFull(full, 'high').then(() => {
            if (version !== requestVersion || !viewer.open) return;
            photo.src = full;
            status.textContent = '';
            [position - 1, position + 1].filter(i => album.images[i]).forEach(i => {
                const neighbor = album.images[i];
                loadFull(neighbor.dataset.fullSrc || neighbor.src).catch(() => {});
            });
        }).catch(() => {
            if (version === requestVersion && viewer.open) status.textContent = 'Preview shown. Full-size photo could not load.';
        });
    }
    function open(image) {
        album = sections.find(section => section.images.includes(image));
        if (!album) return;
        position = album.images.indexOf(image);
        opener = image.closest('.gallery-item');
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        viewer.showModal();
        show();
        document.getElementById('viewerClose').focus();
    }
    function step(direction) {
        if (position + direction < 0 || position + direction >= album.images.length) return;
        position += direction;
        show();
    }
    images.forEach(image => {
        const item = image.closest('.gallery-item');
        const section = sections.find(section => section.images.includes(image));
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-haspopup', 'dialog');
        item.setAttribute('aria-label', `Open ${section.heading.textContent} photo ${section.images.indexOf(image) + 1}`);
        item.addEventListener('click', () => open(image));
        item.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(image); }
        });
    });
    previous.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    document.getElementById('viewerClose').addEventListener('click', () => viewer.close());
    viewer.addEventListener('close', () => {
        requestVersion++;
        document.body.style.overflow = previousOverflow;
        resetZoom();
        photo.removeAttribute('src');
        opener?.focus({ preventScroll: true });
    });
    viewer.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            if (stage.classList.contains('zoomed')) return;
            event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1);
        }
    });
    function toggleZoom() {
        if (stage.classList.contains('zoomed')) { resetZoom(); return; }
        stage.classList.add('zoomed');
        stage.scrollTo(stage.scrollWidth / 4, stage.scrollHeight / 4);
        zoom.textContent = '−';
        zoom.setAttribute('aria-label', 'Zoom out');
        zoom.setAttribute('aria-pressed', 'true');
    }
    zoom.addEventListener('click', toggleZoom);
    photo.addEventListener('click', () => { if (Date.now() >= suppressClickUntil) toggleZoom(); });
    stage.addEventListener('click', event => { if (event.target === stage && Date.now() >= suppressClickUntil) viewer.close(); });
    stage.addEventListener('touchstart', event => {
        touchStart = event.touches.length === 1 && !stage.classList.contains('zoomed')
            ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    stage.addEventListener('touchend', event => {
        if (!touchStart || stage.classList.contains('zoomed')) return;
        const dx = event.changedTouches[0].clientX - touchStart.x;
        const dy = event.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            suppressClickUntil = Date.now() + 500;
            step(dx < 0 ? 1 : -1);
        }
    }, { passive: true });
    stage.addEventListener('touchcancel', () => { touchStart = null; });

    // Keep season navigation at hand without changing the grid or its spacing.
    const remaining = document.getElementById('galleryRemaining');
    const remainingFill = remaining?.querySelector('.gallery-remaining-fill');
    const timelineNav = remaining ? document.querySelector('.archive-seasons') : null;
    const timelineLinks = timelineNav ? [...timelineNav.querySelectorAll('a')] : [];
    const timelineCaption = document.getElementById('timelineSeason');
    let timelineLine, timelineMarker;
    if (timelineNav) {
        timelineNav.classList.add('season-timeline');
        timelineLine = document.createElement('span');
        timelineMarker = document.createElement('span');
        timelineLine.className = 'timeline-line';
        timelineMarker.className = 'timeline-marker';
        timelineLine.setAttribute('aria-hidden', 'true');
        timelineMarker.setAttribute('aria-hidden', 'true');
        timelineNav.append(timelineLine, timelineMarker);
    }

    const scrub = document.getElementById('galleryScrub');
    let scrubbing = false;
    if (scrub) {
        scrub.addEventListener('pointerdown', () => { scrubbing = true; });
        window.addEventListener('pointerup', () => { scrubbing = false; });
        scrub.addEventListener('input', () => {
            const maximum = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo({ top: maximum * Number(scrub.value) / 10000, behavior: 'instant' });
        });
    }
    let scheduled = false;
    function updateDock() {
        scheduled = false;
        if (remaining) {
            const maximum = document.documentElement.scrollHeight - window.innerHeight;
            const fraction = maximum > 0 ? Math.max(0, Math.min(1, 1 - window.scrollY / maximum)) : 0;
            remainingFill.style.transform = `scaleX(${fraction})`;
            remaining.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
            remaining.setAttribute('aria-valuetext', `${Math.round(fraction * 100)}% remaining`);
        }
        let active = sections[0];
        sections.forEach(section => { if (section.heading.getBoundingClientRect().top <= 140) active = section; });
        if (timelineNav) {
            const index = sections.indexOf(active);
            const current = timelineLinks[index];
            const following = timelineLinks[index + 1] || current;
            const center = link => link.offsetTop + link.offsetHeight / 2;
            const first = center(timelineLinks[0]);
            timelineLine.style.top = `${first}px`;
            timelineLine.style.height = `${center(timelineLinks[timelineLinks.length - 1]) - first}px`;
            const top = active.heading.getBoundingClientRect().top;
            const nextTop = sections[index + 1]?.heading.getBoundingClientRect().top;
            const portion = nextTop === undefined ? 0 : Math.min(1, Math.max(0, (140 - top) / (nextTop - top)));
            const y = center(current) + (center(following) - center(current)) * portion;
            timelineMarker.style.top = `${y}px`;
            timelineCaption.textContent = active.heading.textContent;
        }
        if (scrub && !scrubbing) scrub.value = Math.round(10000 * window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
        if (scrub) scrub.setAttribute('aria-valuetext', active.heading.textContent);
        document.querySelectorAll('.archive-seasons a').forEach(link => {
            if (link.hash === `#${active.heading.id}`) {
                if (!link.hasAttribute('aria-current')) {
                    const navigation = link.parentElement;
                    const itemRect = link.getBoundingClientRect();
                    const navRect = navigation.getBoundingClientRect();
                    if (navigation.scrollWidth > navigation.clientWidth) navigation.scrollLeft += itemRect.left - navRect.left - (navRect.width - itemRect.width) / 2;
                    else if (itemRect.top < navRect.top || itemRect.bottom > navRect.bottom) navigation.scrollTop += itemRect.top - navRect.top - (navRect.height - itemRect.height) / 2;
                }
                link.setAttribute('aria-current', 'location');
            }
            else link.removeAttribute('aria-current');
        });
    }
    window.addEventListener('scroll', () => {
        if (!scheduled) { scheduled = true; requestAnimationFrame(updateDock); }
    }, { passive: true });
    window.addEventListener('resize', updateDock);
    updateDock();
})();

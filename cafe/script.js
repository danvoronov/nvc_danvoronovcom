/* ==========================================================================
   8-BIT INTERACTION & SOUND ENGINE - EMPATHETIC CAFE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- State Variables ---
    let soundEnabled = true;
    let crtEnabled = true;
    let audioCtx = null;

    // --- DOM Elements ---
    const crtToggle = document.getElementById('crt-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const body = document.body;
    
    const meetBtn = document.getElementById('meet-btn');
    const calendarBtn = document.getElementById('calendar-btn');
    
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    const itemTitle = document.getElementById('item-title');
    const itemTexts = document.querySelectorAll('.item-text');
    const itemPanel = document.getElementById('item-desc-panel');
    const {
        EVENT_DURATION_MS,
        formatCountdown,
        formatKyivDate,
        getCalendarRange,
        getNextEventDate
    } = globalThis.CafeSchedule;
    const getNextEvent = (now = new Date()) => getNextEventDate(
        now,
        globalThis.CAFE_EVENT_DATES || []
    );

    // --- Web Audio API Synth Engine ---
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Play a retro synth sound
    // type: 'sine', 'square', 'sawtooth', 'triangle'
    function playSound(freqs, duration, type = 'sine', volume = 0.1) {
        if (!soundEnabled) return;
        try {
            initAudio();
            const now = audioCtx.currentTime;
            
            // Primary Gain node
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(volume, now);
            // Exponential decay
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            gainNode.connect(audioCtx.destination);

            if (Array.isArray(freqs)) {
                // Play arpeggio
                const step = duration / freqs.length;
                freqs.forEach((freq, idx) => {
                    const osc = audioCtx.createOscillator();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, now + (idx * step));
                    osc.connect(gainNode);
                    osc.start(now + (idx * step));
                    osc.stop(now + ((idx + 1) * step));
                });
            } else {
                // Single tone or frequency sweep
                const osc = audioCtx.createOscillator();
                osc.type = type;
                
                if (typeof freqs === 'object' && freqs.start && freqs.end) {
                    osc.frequency.setValueAtTime(freqs.start, now);
                    osc.frequency.exponentialRampToValueAtTime(freqs.end, now + duration);
                } else {
                    osc.frequency.setValueAtTime(freqs, now);
                }
                
                osc.connect(gainNode);
                osc.start(now);
                osc.stop(now + duration);
            }
        } catch (e) {
            console.warn('Audio synthesis failed:', e);
        }
    }

    // --- Preset Sounds ---
    const sounds = {
        click: () => playSound({ start: 800, end: 150 }, 0.08, 'square', 0.08),
        hover: () => playSound(1200, 0.03, 'sine', 0.02),
        select: () => playSound([300, 450, 600], 0.15, 'triangle', 0.08),
        success: () => playSound([523.25, 659.25, 783.99, 1046.50], 0.25, 'sine', 0.1), // C5-E5-G5-C6
        toggleOn: () => playSound([440, 880], 0.12, 'sine', 0.08),
        toggleOff: () => playSound([880, 440], 0.12, 'sine', 0.08)
    };

    // --- MIDI-style Ambient Background Music ---
    const ambientTempo = 72;
    const beatLength = 60 / ambientTempo;
    const loopBeats = 32;
    const loopLength = loopBeats * beatLength;
    let ambientNodes = [];
    let ambientLoopTimer = null;
    let ambientStopTimer = null;
    let ambientMasterGain = null;

    function stopAmbient() {
        if (ambientLoopTimer) {
            clearTimeout(ambientLoopTimer);
            ambientLoopTimer = null;
        }
        if (ambientStopTimer) {
            clearTimeout(ambientStopTimer);
            ambientStopTimer = null;
        }

        const nodesToStop = ambientNodes.slice();
        ambientNodes = [];

        if (ambientMasterGain && audioCtx) {
            const now = audioCtx.currentTime;
            ambientMasterGain.gain.cancelScheduledValues(now);
            ambientMasterGain.gain.setTargetAtTime(0.0001, now, 0.04);
        }

        ambientStopTimer = setTimeout(() => {
            nodesToStop.forEach(node => {
                try {
                    node.stop();
                } catch {
                    // The oscillator may already have reached its scheduled stop.
                }
            });
            ambientStopTimer = null;
        }, 140);
    }

    function resetAmbientMaster() {
        if (!audioCtx) return null;

        ambientMasterGain = audioCtx.createGain();
        ambientMasterGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        ambientMasterGain.gain.linearRampToValueAtTime(0.78, audioCtx.currentTime + 0.7);
        ambientMasterGain.connect(audioCtx.destination);
        return ambientMasterGain;
    }

    function getAmbientOutput() {
        return ambientMasterGain || resetAmbientMaster() || audioCtx.destination;
    }

    function midiToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    function trackAmbientNode(node) {
        ambientNodes.push(node);
        node.addEventListener('ended', () => {
            ambientNodes = ambientNodes.filter(activeNode => activeNode !== node);
        }, { once: true });
    }

    function scheduleAmbientTone(note, beat, durationBeats, instrument = 'keys', velocity = 1) {
        if (!audioCtx) return;

        const start = audioCtx.currentTime + beat * beatLength;
        const duration = durationBeats * beatLength;
        const freq = midiToFreq(note);
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        if (instrument === 'bass') {
            osc.type = 'triangle';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(420, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(0.036 * velocity, start + 0.09);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        } else if (instrument === 'bell') {
            osc.type = 'sine';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1700, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(0.02 * velocity, start + 0.06);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        } else {
            osc.type = 'triangle';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(950, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(0.032 * velocity, start + 0.12);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        }

        osc.frequency.setValueAtTime(freq, start);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(getAmbientOutput());
        osc.start(start);
        osc.stop(start + duration + 0.08);
        trackAmbientNode(osc);
    }

    function scheduleCafeTick(beat, velocity = 1) {
        if (!audioCtx) return;

        const start = audioCtx.currentTime + beat * beatLength;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, start);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1250, start);
        filter.Q.setValueAtTime(10, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.012 * velocity, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(getAmbientOutput());
        osc.start(start);
        osc.stop(start + 0.1);
        trackAmbientNode(osc);
    }

    function scheduleAmbientLoop() {
        if (!soundEnabled || !audioCtx) return;

        const chords = [
            { beat: 0, notes: [60, 64, 67, 71] },   // Cmaj7
            { beat: 8, notes: [57, 60, 64, 67] },   // Am7
            { beat: 16, notes: [62, 65, 69, 72] },  // Dm7
            { beat: 24, notes: [55, 59, 62, 65] }   // G7
        ];
        const bass = [
            [0, 48], [4, 55], [8, 45], [12, 52],
            [16, 50], [20, 57], [24, 43], [28, 50]
        ];
        const melody = [
            [1.25, 72], [2, 72], [3.5, 74], [6, 71],
            [10, 69], [11.5, 67], [14, 64],
            [18, 65], [19.5, 69], [22, 72],
            [26, 71], [27.5, 69], [30, 67]
        ];
        const ticks = [1.5, 5.5, 9.5, 13.5, 17.5, 21.5, 25.5, 29.5];

        chords.forEach(chord => {
            chord.notes.forEach((note, idx) => {
                scheduleAmbientTone(note, chord.beat + idx * 0.04, 7.6, 'keys', 0.76);
            });
        });
        bass.forEach(([beat, note]) => scheduleAmbientTone(note, beat, 3.4, 'bass', 0.82));
        melody.forEach(([beat, note]) => scheduleAmbientTone(note, beat, 1.6, 'bell', 0.68));
        ticks.forEach(beat => scheduleCafeTick(beat, 0.36));

        ambientLoopTimer = setTimeout(scheduleAmbientLoop, loopLength * 1000);
    }

    async function startAmbient() {
        stopAmbient();
        if (!soundEnabled) return;
        try {
            initAudio();
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            resetAmbientMaster();
            scheduleAmbientLoop();
        } catch(e) {
            console.warn('Ambient music failed:', e);
        }
    }

    let ambientStarted = false;
    async function tryStartAmbient() {
        if (!ambientStarted && soundEnabled) {
            ambientStarted = true;
            await startAmbient();
        }
    }
    document.addEventListener('click', tryStartAmbient, { once: true });

    // --- Interactive Hover Effects ---
    const interactiveElements = document.querySelectorAll(
        'button, a, .inventory-slot, .step-node'
    );
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            sounds.hover();
        });
    });

    // --- Controls Panel Handlers ---
    crtToggle.addEventListener('click', () => {
        crtEnabled = !crtEnabled;
        if (crtEnabled) {
            body.classList.add('crt-active');
            crtToggle.classList.add('active');
            crtToggle.setAttribute('aria-pressed', 'true');
            sounds.toggleOn();
        } else {
            body.classList.remove('crt-active');
            crtToggle.classList.remove('active');
            crtToggle.setAttribute('aria-pressed', 'false');
            sounds.toggleOff();
        }
    });

    soundToggle.addEventListener('click', async () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            soundToggle.classList.add('active');
            soundToggle.setAttribute('aria-pressed', 'true');
            initAudio();
            sounds.toggleOn();
            await startAmbient();
        } else {
            soundToggle.classList.remove('active');
            soundToggle.setAttribute('aria-pressed', 'false');
            stopAmbient();
        }
    });

    // --- Google Calendar Event Handler ---
    calendarBtn.addEventListener('click', () => {
        sounds.click();

        const nextEvent = getNextEvent();
        if (!nextEvent) return;

        const url = `https://www.google.com/calendar/render?action=TEMPLATE` +
            `&text=${encodeURIComponent('Емпатійне Кафе')}` +
            `&dates=${getCalendarRange(nextEvent)}` +
            `&ctz=Europe/Kyiv` +
            `&location=${encodeURIComponent('https://meet.google.com/rwm-zzjr-bre')}` +
            `&details=${encodeURIComponent('Емпатійне Кафе — щотижнева зустріч.\nЩочетверга 19:20–21:30 (Київ)\n\nСайт: https://empathy.danvoronov.com/cafe/\nMeet: https://meet.google.com/rwm-zzjr-bre')}`;

        window.open(url, '_blank');
        sounds.success();
    });

    meetBtn.addEventListener('click', event => {
        if (meetBtn.getAttribute('aria-disabled') === 'true') {
            event.preventDefault();
            return;
        }
        sounds.success();
    });

    // --- RPG Inventory Tabs Handler ---
    const inventorySlotList = Array.from(inventorySlots);

    function activateInventoryTab(slot, moveFocus = false) {
        const key = slot.getAttribute('data-item');
        const nextText = document.querySelector(`.item-text[data-item="${key}"]`);
        const nextTitle = slot.querySelector('.slot-title');
        if (!key || !nextText || !nextTitle) return;

        sounds.select();

        inventorySlotList.forEach(candidate => {
            const isActive = candidate === slot;
            candidate.classList.toggle('active', isActive);
            candidate.setAttribute('aria-selected', String(isActive));
            candidate.tabIndex = isActive ? 0 : -1;
        });

        itemTexts.forEach(text => text.classList.toggle('active', text === nextText));
        itemTitle.textContent = nextTitle.textContent;
        itemPanel.setAttribute('aria-labelledby', slot.id);
        if (moveFocus) slot.focus();
    }

    inventorySlotList.forEach((slot, index) => {
        slot.addEventListener('click', () => activateInventoryTab(slot));
        slot.addEventListener('keydown', event => {
            let nextIndex = null;

            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                nextIndex = (index + 1) % inventorySlotList.length;
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                nextIndex = (index - 1 + inventorySlotList.length) % inventorySlotList.length;
            } else if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = inventorySlotList.length - 1;
            }

            if (nextIndex === null) return;
            event.preventDefault();
            activateInventoryTab(inventorySlotList[nextIndex], true);
        });
    });

    // Initialize styling triggers for interactive animations
    // Let's add basic keypress support to click controls
    document.addEventListener('keydown', (e) => {
        // Press 'C' to toggle CRT filter
        if (e.key.toLowerCase() === 'c' && document.activeElement.tagName !== 'INPUT') {
            crtToggle.click();
        }
        // Press 'S' to toggle Sound
        if (e.key.toLowerCase() === 's' && document.activeElement.tagName !== 'INPUT') {
            soundToggle.click();
        }
    });

    // --- Status & Countdown (ONLINE: Thu 19:20-21:30 Kyiv) ---
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    const infoDateEl = document.querySelector('.info-date');

    function setMeetAvailability(isAvailable) {
        meetBtn.classList.toggle('disabled', !isAvailable);
        meetBtn.setAttribute('aria-disabled', String(!isAvailable));
        meetBtn.tabIndex = isAvailable ? 0 : -1;

        if (isAvailable) {
            meetBtn.href = meetBtn.dataset.href;
        } else {
            meetBtn.removeAttribute('href');
        }
    }

    function updateStatus() {
        const now = new Date();
        const nextEvent = getNextEvent(now);

        if (!nextEvent) {
            if (infoDateEl) {
                infoDateEl.textContent = 'НЕЗАПЛАНОВАНО · ЧЕКАЙТЕ ОНОВЛЕНЬ';
            }
            statusText.innerHTML = '<span class="status-word status-offline">НЕЗАПЛАНОВАНО</span><span class="status-detail"> — чекайте оновлень</span>';
            statusIndicator.className = 'status-indicator offline';
            setMeetAvailability(false);
            if (calendarBtn) calendarBtn.style.display = 'none';
            return;
        }

        const eventEnd = new Date(nextEvent.getTime() + EVENT_DURATION_MS);

        if (infoDateEl) {
            const dateStr = formatKyivDate(nextEvent);
            infoDateEl.textContent = `${dateStr.toUpperCase()}, 19:20 (КИЇВСЬКИЙ ЧАС)`;
        }

        const isOnline = now >= nextEvent && now < eventEnd;

        if (isOnline) {
            statusText.innerHTML = '<span class="status-word status-online">ONLINE</span>';
            statusIndicator.className = 'status-indicator online blinking';
            setMeetAvailability(true);
            if (calendarBtn) calendarBtn.style.display = 'none';
            return;
        }

        if (calendarBtn) calendarBtn.style.display = '';

        const diffMs = nextEvent.getTime() - now.getTime();
        const countdown = (typeof formatCountdown === 'function' ? formatCountdown(diffMs) : '');
        if (countdown) {
            statusText.innerHTML = `<span class="status-word status-offline">ЧЕКАЄМО</span><span class="status-detail"> — ${countdown} до наступної зустрічі</span>`;
        } else {
            statusText.innerHTML = '<span class="status-word status-offline">ЧЕКАЄМО</span>';
        }
        statusIndicator.className = 'status-indicator offline';
        setMeetAvailability(false);
    }

    updateStatus();
    setInterval(updateStatus, 1000);

    // --- Global Timeline Tooltip ---
    const tooltip = document.getElementById('timeline-tooltip');
    const tooltipNum = document.getElementById('tooltip-step-num');
    const tooltipText = document.getElementById('tooltip-text');
    const stepNodes = document.querySelectorAll('.step-node');

    let activeNode = null;

    function showTooltip(node) {
        const desc = node.getAttribute('data-desc');
        const step = node.getAttribute('data-step');
        if (!desc) return;
        
        tooltipNum.textContent = `КРОК 0${step}`;
        tooltipText.textContent = desc;
        tooltip.classList.remove('hidden');
        activeNode = node;
        updateTooltipPosition();
    }

    function hideTooltip() {
        tooltip.classList.add('hidden');
        activeNode = null;
    }

    function updateTooltipPosition() {
        if (!activeNode || tooltip.classList.contains('hidden')) return;

        const rect = activeNode.getBoundingClientRect();
        const tw = tooltip.offsetWidth || 200;
        const th = tooltip.offsetHeight || 80;
        const gap = 12;

        // Default: position below the node
        let left = rect.left + (rect.width / 2) - (tw / 2);
        let top = rect.bottom + gap;

        // If it goes below the screen, position above the node
        if (top + th > window.innerHeight - gap) {
            top = rect.top - th - gap;
        }

        // Prevent it from going out of bounds horizontally
        if (left < gap) {
            left = gap;
        } else if (left + tw > window.innerWidth - gap) {
            left = window.innerWidth - tw - gap;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    stepNodes.forEach(node => {
        // Desktop hover
        node.addEventListener('mouseenter', () => {
            if (window.matchMedia('(hover: hover)').matches) {
                showTooltip(node);
            }
        });

        node.addEventListener('mouseleave', () => {
            if (window.matchMedia('(hover: hover)').matches) {
                hideTooltip();
            }
        });

        // Mobile click toggle
        node.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if (activeNode === node && !tooltip.classList.contains('hidden')) {
                hideTooltip();
            } else {
                showTooltip(node);
            }
        });
    });

    // Hide tooltip when clicking outside
    document.addEventListener('click', (e) => {
        if (activeNode && !activeNode.contains(e.target) && !tooltip.contains(e.target)) {
            hideTooltip();
        }
    });

    // Hide on scroll to prevent hanging on mobile
    window.addEventListener('scroll', () => {
        hideTooltip();
    }, { passive: true });

    // Update position on resize
    window.addEventListener('resize', () => {
        if (activeNode) {
            updateTooltipPosition();
        }
    }, { passive: true });

    // Load emoji artwork after the page is interactive. If the CDN is
    // unavailable, native emoji remain visible as a graceful fallback.
    const twemojiScript = document.createElement('script');
    twemojiScript.src = 'https://cdn.jsdelivr.net/npm/@twemoji/api@17.0.3/dist/twemoji.min.js';
    twemojiScript.async = true;
    twemojiScript.integrity = 'sha384-Y5xukbGJwykbHHkTbLJykYLcBPFxrwipTbEh0puxhkz9CZ90raTPGe2Ks4vCxsYU';
    twemojiScript.crossOrigin = 'anonymous';
    twemojiScript.addEventListener('load', () => {
        globalThis.twemoji.parse(document.querySelector('main'), {
            base: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/',
            folder: 'svg',
            ext: '.svg'
        });
    }, { once: true });
    document.head.append(twemojiScript);

    console.log("8-Bit Cafe Interaction Loaded! Press 'C' for CRT, 'S' for Sound.");
});

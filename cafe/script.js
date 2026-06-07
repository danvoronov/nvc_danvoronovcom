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
    
    const inventoryGrid = document.getElementById('inventory-grid');
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    const itemTitle = document.getElementById('item-title');
    const itemTextPrimary = document.getElementById('item-text-primary');
    const itemTexts = document.querySelectorAll('.item-text');
    const itemTitles = document.querySelectorAll('.item-title');

    // --- RPG Inventory Data ---
    const inventoryData = {
        heavy: {
            title: "ВАЖКЕ & СКЛАДНЕ",
            text: "З будь-чим: важким, заплутаним, незручним, радісним, дрібним, соромітним, невисловленим. Навіть із тим, що “ніби не така вже й проблема”, але чомусь не відпускає.",
            effect: "Тут не потрібно бути “достатньо досвідченими”, “достатньо правильними” чи приходити з ідеально сформульованим запитом."
        },
        intimacy: {
            title: "БЛИЗЬКІСТЬ & СЕКС",
            text: "Це простір прийняття квірного, кінк, поліаморного, немоногамного досвіду — і водночас дуже звичайних людських переживань, знайомих багатьом. Можна приходити з темами про близькість, довіру, дистанцію, сексуальність, згоду, турботу, ревнощі, прив’язаність, чесність, свободу, конфлікти, відновлення після болісного досвіду.",
            effect: "Допомагає шукати свої слова для складних розмов, розвивати вміння чути себе і потребу бути почутими без оцінок та порад."
        },
        relations: {
            title: "СТОСУНКИ & ПОЛІ",
            text: "Можна приходити з досвідом моногамних і немоногамних стосунків, труднощами у поліаморних конфігураціях, переживаннями через NRE (нову енергію стосунків), болем від ієрархій або нечітких ролей, складністю витримувати процеси партнерів/-ок, соромом говорити про секс, кінк чи фантазії, страхом осуду за свою ідентичність.",
            effect: "Знижує рівень тривоги та сорому за свій унікальний формат стосунків та проживання близькості."
        },
        small: {
            title: "ДРІБНИЦІ ЖИТТЯ",
            text: "Можна приходити і з тим, що наче “дрібниця”: незручна розмова, дивний осад після побачення, повідомлення без відповіді, невдалий жарт, накопичене роздратування, внутрішній ступор, фонове відчуття “зі мною щось не так”, складність попросити про підтримку, неможливість сказати “ні”, втома весь час пояснювати себе іншим.",
            effect: "Перетворює дрібні фонові подразники на ясність та емоційне полегшення."
        },
        joy: {
            title: "РАДІСТЬ & ЖИВЕ",
            text: "І можна приходити з хорошим: радістю, полегшенням, ніжністю, вдячністю, закоханістю, відчуттям живості, бажанням поділитися тим, що вийшло, або просто побути серед людей, де не треба стискатися, захищатися чи доводити право на свій досвід.",
            effect: "Насичує життєвою енергією, підсилює відчуття спільності та безпеки."
        }
    };

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
                try { node.stop(); } catch(e) {}
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
            crtToggle.textContent = 'ON';
            sounds.toggleOn();
        } else {
            body.classList.remove('crt-active');
            crtToggle.classList.remove('active');
            crtToggle.textContent = 'OFF';
            sounds.toggleOff();
        }
    });

    soundToggle.addEventListener('click', async () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            soundToggle.classList.add('active');
            soundToggle.textContent = 'ON';
            initAudio();
            sounds.toggleOn();
            await startAmbient();
        } else {
            soundToggle.classList.remove('active');
            soundToggle.textContent = 'OFF';
            stopAmbient();
        }
    });

    // --- Google Calendar Event Handler ---
    calendarBtn.addEventListener('click', () => {
        sounds.click();

        const nextEvent = getNextEventDate();
        const k = getKyivParts(nextEvent);

        const dateStr = `${k.year}${String(k.month).padStart(2, '0')}${String(k.dayOfMonth).padStart(2, '0')}T${String(k.hour).padStart(2, '0')}${String(k.minute).padStart(2, '0')}00`;
        const endDateStr = `${k.year}${String(k.month).padStart(2, '0')}${String(k.dayOfMonth).padStart(2, '0')}T${String(k.hour + 2).padStart(2, '0')}3000`;

        const url = `https://www.google.com/calendar/render?action=TEMPLATE` +
            `&text=${encodeURIComponent('Емпатійне Кафе')}` +
            `&dates=${dateStr}/${endDateStr}` +
            `&ctz=Europe/Kyiv` +
            `&location=${encodeURIComponent('https://meet.google.com/rwm-zzjr-bre')}` +
            `&details=${encodeURIComponent('Емпатійне Кафе — щотижнева зустріч.\nЩочетверга 19:20–21:30 (Київ)\n\nСайт: https://empathy.danvoronov.com/cafe/\nMeet: https://meet.google.com/rwm-zzjr-bre')}`;

        window.open(url, '_blank');
        sounds.success();
    });

    meetBtn.addEventListener('click', () => {
        sounds.success();
    });

    // --- RPG Inventory Tabs Handler ---
    inventorySlots.forEach(slot => {
        slot.addEventListener('click', () => {
            const key = slot.getAttribute('data-item');
            if (!key || !inventoryData[key]) return;

            sounds.select();

            // Set active classes in tablist
            inventorySlots.forEach(s => {
                s.classList.remove('active');
                s.setAttribute('aria-selected', 'false');
            });
            slot.classList.add('active');
            slot.setAttribute('aria-selected', 'true');

            itemTitle.style.opacity = 0;
            itemTextPrimary.style.opacity = 0;

            setTimeout(() => {
                const nextTitle = document.querySelector(`.item-title[data-item="${key}"]`);
                const nextText = document.querySelector(`.item-text[data-item="${key}"]`);
                if (nextTitle) itemTitle.textContent = nextTitle.textContent;
                if (nextText) itemTextPrimary.textContent = nextText.textContent;
                
                itemTitle.style.opacity = 1;
                itemTextPrimary.style.opacity = 1;
            }, 50);
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

    function getKyivParts(date) {
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Kyiv',
            weekday: 'short',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric',
            hour12: false
        });
        const map = {};
        for (const p of fmt.formatToParts(date)) {
            if (p.type !== 'literal') map[p.type] = p.value;
        }
        return {
            day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(map.weekday),
            year: parseInt(map.year),
            month: parseInt(map.month),
            dayOfMonth: parseInt(map.day),
            hour: parseInt(map.hour),
            minute: parseInt(map.minute)
        };
    }

    function getNextEventDate() {
        const now = new Date();
        const eventStart = 19 * 60 + 20;

        if (typeof nextDates !== 'undefined' && nextDates.length > 0) {
            for (let dateStr of nextDates) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10);
                    const day = parseInt(parts[2], 10);
                    
                    let candidate = new Date(year, month - 1, day, 19, 20, 0, 0);
                    for (let i = 0; i < 2; i++) {
                        const k = getKyivParts(candidate);
                        const diff = (k.hour * 60 + k.minute) - eventStart;
                        if (diff !== 0) candidate = new Date(candidate.getTime() - diff * 60000);
                    }
                    
                    const eventEnd = new Date(candidate.getTime() + (2 * 60 + 10) * 60000);
                    if (now < eventEnd) {
                        return candidate;
                    }
                }
            }
        }

        // Fallback
        const kyiv = getKyivParts(now);
        const totalMin = kyiv.hour * 60 + kyiv.minute;
        let daysToAdd;
        if (kyiv.day === 4) {
            daysToAdd = (totalMin < 21 * 60 + 30) ? 0 : 7;
        } else {
            daysToAdd = (4 - kyiv.day + 7) % 7;
        }

        let nextEvent = new Date(kyiv.year, kyiv.month - 1, kyiv.dayOfMonth + daysToAdd, 19, 20, 0, 0);
        for (let i = 0; i < 2; i++) {
            const k = getKyivParts(nextEvent);
            const diff = (k.hour * 60 + k.minute) - eventStart;
            if (diff !== 0) nextEvent = new Date(nextEvent.getTime() - diff * 60000);
        }

        return nextEvent;
    }

    function updateStatus() {
        const now = new Date();
        const nextEvent = getNextEventDate();
        const eventEnd = new Date(nextEvent.getTime() + (2 * 60 + 10) * 60000);

        if (infoDateEl) {
            const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
            let dateStr = nextEvent.toLocaleDateString('uk-UA', dateOptions);
            infoDateEl.textContent = `${dateStr.toUpperCase()}, 19:20 (КИЇВСЬКИЙ ЧАС)`;
        }

        const isOnline = now >= nextEvent && now < eventEnd;

        if (isOnline) {
            statusText.innerHTML = '<span class="status-word status-online">ONLINE</span>';
            statusIndicator.className = 'status-indicator online blinking';
            meetBtn.removeAttribute('disabled');
            meetBtn.classList.remove('disabled');
            return;
        }

        const diffMs = nextEvent.getTime() - now.getTime();
        if (diffMs > 0) {
            const days = Math.floor(diffMs / 86400000);
            const hours = Math.floor((diffMs % 86400000) / 3600000);
            const mins = Math.floor((diffMs % 3600000) / 60000);

            let countdown = '';
            if (days > 0) countdown += `${days}д `;
            if (hours > 0) countdown += `${hours}г `;
            countdown += `${mins}хв`;

            statusText.innerHTML = `<span class="status-word status-offline">OFFLINE</span><span class="status-detail"> — ${countdown} до наступної зустрічі</span>`;
        } else {
            statusText.innerHTML = '<span class="status-word status-offline">OFFLINE</span>';
        }
        statusIndicator.className = 'status-indicator offline';
        meetBtn.setAttribute('disabled', 'disabled');
        meetBtn.classList.add('disabled');
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

    console.log("8-Bit Cafe Interaction Loaded! Press 'C' for CRT, 'S' for Sound.");
});

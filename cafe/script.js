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
    const copyMeetBtn = document.getElementById('copy-meet-btn');
    const retroAlert = document.getElementById('retro-alert');
    const alertMsg = document.getElementById('alert-msg');
    
    const inventoryGrid = document.getElementById('inventory-grid');
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    const itemTitle = document.getElementById('item-title');
    const itemTextPrimary = document.getElementById('item-text-primary');

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

    // --- Interactive Hover Effects ---
    const interactiveElements = document.querySelectorAll(
        'button, a, .inventory-slot, .step-item'
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

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            soundToggle.classList.add('active');
            soundToggle.textContent = 'ON';
            // Force resume audio context
            initAudio();
            sounds.toggleOn();
        } else {
            soundToggle.classList.remove('active');
            soundToggle.textContent = 'OFF';
            // Audio context won't be called, so no sound
        }
    });

    // --- Google Meet Link Copy Handler ---
    copyMeetBtn.addEventListener('click', () => {
        sounds.click();
        
        // Custom message copying (since exact link is provided in DM)
        const textToCopy = "https://meet.google.com/rwm-zzjr-bre";
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            sounds.success();
            
            // Show custom retro alert toast
            alertMsg.textContent = "ДЕТАЛІ СКОПІЙОВАНО В БУФЕР!";
            retroAlert.classList.remove('hidden');
            
            setTimeout(() => {
                retroAlert.classList.add('hidden');
            }, 2500);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
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

            const data = inventoryData[key];
            
            itemTitle.style.opacity = 0;
            itemTextPrimary.style.opacity = 0;

            setTimeout(() => {
                itemTitle.textContent = data.title;
                itemTextPrimary.textContent = data.text;
                
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

    function updateStatus() {
        const now = new Date();
        const kyiv = getKyivParts(now);
        const totalMin = kyiv.hour * 60 + kyiv.minute;
        const eventStart = 19 * 60 + 20;
        const eventEnd = 21 * 60 + 30;

        const isOnline = kyiv.day === 4 && totalMin >= eventStart && totalMin < eventEnd;

        if (isOnline) {
            statusText.textContent = 'ONLINE';
            statusIndicator.className = 'status-indicator online blinking';
            return;
        }

        let daysToAdd;
        if (kyiv.day === 4) {
            daysToAdd = totalMin < eventStart ? 0 : 7;
        } else {
            daysToAdd = (4 - kyiv.day + 7) % 7;
        }

        let nextEvent = new Date(kyiv.year, kyiv.month - 1, kyiv.dayOfMonth + daysToAdd, 19, 20, 0, 0);
        for (let i = 0; i < 2; i++) {
            const k = getKyivParts(nextEvent);
            const diff = (k.hour * 60 + k.minute) - eventStart;
            if (diff !== 0) nextEvent = new Date(nextEvent.getTime() - diff * 60000);
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

            statusText.textContent = `OFFLINE — ${countdown} до наступної зустрічі`;
        } else {
            statusText.textContent = 'OFFLINE';
        }
        statusIndicator.className = 'status-indicator offline';
    }

    updateStatus();
    setInterval(updateStatus, 1000);

    console.log("8-Bit Cafe Interaction Loaded! Press 'C' for CRT, 'S' for Sound.");
});

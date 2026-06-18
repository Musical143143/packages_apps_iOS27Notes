const state = {
    notes: JSON.parse(localStorage.getItem('ios27_pro_notes')) || [],
    currentNoteId: null,
    selectedBgColor: '#000000',
    brushMode: 'solid' // solid | marker
};

const DOM = {
    notesContainer: document.getElementById('notesContainer'),
    emptyState: document.getElementById('emptyState'),
    noteCount: document.getElementById('noteCount'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    editorView: document.getElementById('editorView'),
    sketchView: document.getElementById('sketchView'),
    backBtn: document.getElementById('backBtn'),
    saveBtn: document.getElementById('saveBtn'),
    noteTitle: document.getElementById('noteTitle'),
    noteBody: document.getElementById('noteBody'),
    editorTimestamp: document.getElementById('editorTimestamp'),
    liveMetrics: document.getElementById('liveMetrics'),
    searchBar: document.getElementById('searchBar'),
    speakBtn: document.getElementById('speakBtn'),
    exportBtn: document.getElementById('exportBtn'),
    insertTodoBtn: document.getElementById('insertTodoBtn'),
    colorPaletteToggle: document.getElementById('colorPaletteToggle'),
    colorSheetOverlay: document.getElementById('colorSheetOverlay'),
    colorSheetCard: document.getElementById('colorSheetCard'),
    paintCanvas: document.getElementById('paintCanvas'),
    clearCanvasBtn: document.getElementById('clearCanvasBtn'),
    closeSketchBtn: document.getElementById('closeSketchBtn'),
    saveSketchBtn: document.getElementById('saveSketchBtn'),
    brushThickness: document.getElementById('brushThickness'),
    triggerInlineSketch: document.getElementById('triggerInlineSketch'),
    penModeBtn: document.getElementById('penModeBtn'),
    markerModeBtn: document.getElementById('markerModeBtn')
};

let ctx = DOM.paintCanvas.getContext('2d');
let drawing = false;
let activePaintColor = '#EAB308';

function init() {
    renderNotesList();
    setupEventListeners();
    initializeCanvasEngine();
    setupTodoCheckboxListener();
}

function formatDoc(command) {
    document.execCommand(command, false, null);
}

function renderNotesList(filterQuery = '') {
    DOM.notesContainer.innerHTML = '';
    const targetNotes = state.notes.filter(n => 
        n.title.toLowerCase().includes(filterQuery.toLowerCase()) || 
        n.body.toLowerCase().includes(filterQuery.toLowerCase())
    );

    DOM.noteCount.textContent = `${targetNotes.length} ${targetNotes.length === 1 ? 'Note' : 'Notes'}`;

    if (targetNotes.length === 0) {
        DOM.emptyState.classList.remove('hidden');
    } else {
        DOM.emptyState.classList.add('hidden');
        [...targetNotes].sort((a, b) => b.updatedAt - a.updatedAt).forEach(note => {
            const row = document.createElement('div');
            row.className = 'note-item p-4 cursor-pointer flex flex-col gap-0.5';
            
            let displayTitle = note.title.trim() || 'New Note';
            let displayBody = note.body.replace(/<[^>]*>/g, '').trim() || 'No additional text';

            if (filterQuery) {
                const regex = new RegExp(`(${filterQuery})`, 'gi');
                displayTitle = displayTitle.replace(regex, `<mark class="bg-[#EAB308]/40 text-white font-semibold rounded-sm">$1</mark>`);
                displayBody = displayBody.replace(regex, `<mark class="bg-[#EAB308]/40 text-white rounded-sm">$1</mark>`);
            }

            const stamp = new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });

            row.innerHTML = `
                <h3 class="text-[17px] font-semibold text-white truncate">${displayTitle}</h3>
                <div class="flex items-center gap-2 text-[15px] text-gray-400">
                    <span class="text-gray-500 font-light shrink-0">${stamp}</span>
                    <span class="truncate">${displayBody}</span>
                </div>
            `;
            row.addEventListener('click', () => openEditor(note.id));
            DOM.notesContainer.appendChild(row);
        });
    }
}

function openEditor(noteId = null) {
    state.currentNoteId = noteId;
    DOM.editorView.classList.remove('hidden', 'slide-out-right');
    DOM.editorView.classList.add('slide-in-right');

    if (noteId) {
        const note = state.notes.find(n => n.id === noteId);
        DOM.noteTitle.value = note.title;
        DOM.noteBody.innerHTML = note.body;
        state.selectedBgColor = note.bgColor || '#000000';
        DOM.editorTimestamp.textContent = new Date(note.updatedAt).toLocaleString([], {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit'}).toUpperCase();
    } else {
        DOM.noteTitle.value = '';
        DOM.noteBody.innerHTML = '';
        state.selectedBgColor = '#000000';
        DOM.editorTimestamp.textContent = new Date().toLocaleString([], {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit'}).toUpperCase();
    }
    DOM.editorView.style.backgroundColor = state.selectedBgColor;
    updateMetrics();
}

function updateMetrics() {
    const txt = DOM.noteBody.innerText || '';
    const chars = txt.length;
    const words = txt.trim() === '' ? 0 : txt.trim().split(/\s+/).length;
    DOM.liveMetrics.textContent = `${words}w ${chars}c`;
    
    const hasData = DOM.noteTitle.value.trim() || txt.trim();
    hasData ? DOM.saveBtn.classList.remove('opacity-40', 'pointer-events-none') : DOM.saveBtn.classList.add('opacity-40', 'pointer-events-none');
}

function saveAndClose() {
    const title = DOM.noteTitle.value.trim();
    const body = DOM.noteBody.innerHTML.trim();
    if (!title && !body && body !== '<br>') return discardAndClose();

    if (state.currentNoteId) {
        const note = state.notes.find(n => n.id === state.currentNoteId);
        note.title = title; note.body = body; note.bgColor = state.selectedBgColor; note.updatedAt = Date.now();
    } else {
        state.notes.push({ id: 'ios_' + Date.now(), title, body, bgColor: state.selectedBgColor, updatedAt: Date.now() });
    }
    localStorage.setItem('ios27_pro_notes', JSON.stringify(state.notes));
    renderNotesList(DOM.searchBar.value);
    discardAndClose();
}

function discardAndClose() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    DOM.editorView.classList.add('slide-out-right');
    setTimeout(() => DOM.editorView.classList.add('hidden'), 300);
}

function setupTodoCheckboxListener() {
    DOM.noteBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('todo-checkbox')) {
            e.target.classList.toggle('checked');
            // Force content editable change registration context
            updateMetrics();
        }
    });
}

function initializeCanvasEngine() {
    const syncSize = () => {
        DOM.paintCanvas.width = DOM.paintCanvas.parentElement.clientWidth;
        DOM.paintCanvas.height = DOM.paintCanvas.parentElement.clientHeight;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    };
    window.addEventListener('resize', syncSize);
    setTimeout(syncSize, 300);

    const position = (e) => {
        const boundary = DOM.paintCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - boundary.left, y: clientY - boundary.top };
    };

    DOM.paintCanvas.addEventListener('mousedown', (e) => { drawing = true; ctx.beginPath(); const p = position(e); ctx.moveTo(p.x, p.y); });
    DOM.paintCanvas.addEventListener('mousemove', (e) => {
        if (!drawing) return;
        const p = position(e);
        ctx.lineWidth = DOM.brushThickness.value;
        
        if (state.brushMode === 'marker') {
            ctx.strokeStyle = activePaintColor + "40"; // 25% Alpha dynamic translucency opacities
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.strokeStyle = activePaintColor;
            ctx.globalCompositeOperation = 'source-over';
        }
        
        ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    window.addEventListener('mouseup', () => drawing = false);

    DOM.paintCanvas.addEventListener('touchstart', (e) => { drawing = true; ctx.beginPath(); const p = position(e); ctx.moveTo(p.x, p.y); });
    DOM.paintCanvas.addEventListener('touchmove', (e) => {
        if (!drawing) return; e.preventDefault();
        const p = position(e);
        ctx.lineWidth = DOM.brushThickness.value;
        ctx.strokeStyle = state.brushMode === 'marker' ? activePaintColor + "40" : activePaintColor;
        ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    window.addEventListener('touchend', () => drawing = false);
}

function setupEventListeners() {
    DOM.newNoteBtn.addEventListener('click', () => openEditor(null));
    DOM.backBtn.addEventListener('click', saveAndClose);
    DOM.saveBtn.addEventListener('click', saveAndClose);
    DOM.noteTitle.addEventListener('input', updateMetrics);
    DOM.noteBody.addEventListener('input', updateMetrics);
    
    // Live Highlight Filtering
    DOM.searchBar.addEventListener('input', (e) => renderNotesList(e.target.value));

    // Dynamic Checklist Injection Function
    DOM.insertTodoBtn.addEventListener('click', () => {
        DOM.noteBody.focus();
        const rowId = 'todo_' + Date.now();
        const todoHtml = `<div class="todo-row" contenteditable="false"><span class="todo-checkbox"></span><span class="todo-text" contenteditable="true" style="outline:none; width:100%;">Task</span></div><br>`;
        document.execCommand('insertHTML', false, todoHtml);
        updateMetrics();
    });

    // Native Dictation Engine
    DOM.speakBtn.addEventListener('click', () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            DOM.speakBtn.classList.remove('text-[#EAB308]');
        } else {
            const bodyText = DOM.noteBody.innerText || '';
            if(!bodyText.trim()) return;
            const utterance = new SpeechSynthesisUtterance(bodyText);
            utterance.onend = () => DOM.speakBtn.classList.remove('text-[#EAB308]');
            DOM.speakBtn.classList.add('text-[#EAB308]');
            window.speechSynthesis.speak(utterance);
        }
    });

    // File Downloader Exporter (.txt)
    DOM.exportBtn.addEventListener('click', () => {
        const title = DOM.noteTitle.value.trim() || 'Untitled_Note';
        const rawContent = DOM.noteBody.innerText || '';
        const blob = new Blob([`${title}\n\n${rawContent}`], { type: 'text/plain' });
        const a = document.createElement('a');
        a.download = `${title.replace(/\s+/g, '_')}.txt`;
        a.href = URL.createObjectURL(blob);
        a.click();
    });

    // UI/Brush Custom Switching Modes
    DOM.penModeBtn.addEventListener('click', () => {
        state.brushMode = 'solid';
        DOM.penModeBtn.className = 'text-[#EAB308] text-xs font-semibold px-2.5 py-1 bg-white/10 rounded-full';
        DOM.markerModeBtn.className = 'text-gray-400 text-xs font-semibold px-2.5 py-1 rounded-full';
    });

    DOM.markerModeBtn.addEventListener('click', () => {
        state.brushMode = 'marker';
        DOM.markerModeBtn.className = 'text-[#EAB308] text-xs font-semibold px-2.5 py-1 bg-white/10 rounded-full';
        DOM.penModeBtn.className = 'text-gray-400 text-xs font-semibold px-2.5 py-1 rounded-full';
    });

    DOM.colorPaletteToggle.addEventListener('click', () => {
        DOM.colorSheetOverlay.classList.remove('hidden');
        setTimeout(() => {
            DOM.colorSheetOverlay.classList.remove('opacity-0');
            DOM.colorSheetCard.classList.remove('translate-y-full');
        }, 10);
    });

    DOM.colorSheetOverlay.addEventListener('click', (e) => {
        if (e.target === DOM.colorSheetOverlay) {
            DOM.colorSheetCard.classList.add('translate-y-full');
            DOM.colorSheetOverlay.classList.add('opacity-0');
            setTimeout(() => DOM.colorSheetOverlay.classList.add('hidden'), 300);
        }
    });

    document.querySelectorAll('.sheet-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.selectedBgColor = btn.dataset.bg;
            DOM.editorView.style.backgroundColor = state.selectedBgColor;
            document.querySelectorAll('.sheet-color-btn').forEach(b => { b.innerHTML = ''; b.style.borderColor = 'transparent'; });
            btn.innerHTML = '<span class="material-icons-round text-sm">check</span>';
            btn.style.borderColor = '#EAB308';
        });
    });

    DOM.triggerInlineSketch.addEventListener('click', () => {
        DOM.sketchView.classList.remove('hidden', 'translate-y-full');
        ctx.clearRect(0, 0, DOM.paintCanvas.width, DOM.paintCanvas.height);
    });

    DOM.closeSketchBtn.addEventListener('click', () => DOM.sketchView.classList.add('translate-y-full'));
    DOM.clearCanvasBtn.addEventListener('click', () => ctx.clearRect(0, 0, DOM.paintCanvas.width, DOM.paintCanvas.height));

    DOM.saveSketchBtn.addEventListener('click', () => {
        const imageUri = DOM.paintCanvas.toDataURL();
        DOM.noteBody.focus();
        document.execCommand('insertImage', false, imageUri);
        DOM.sketchView.classList.add('translate-y-full');
        updateMetrics();
    });

    document.querySelectorAll('.sketch-color').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.sketch-color').forEach(d => d.classList.remove('active-color'));
            dot.classList.add('active-color');
            activePaintColor = dot.dataset.color;
        });
    });
}

window.addEventListener('DOMContentLoaded', init);

const state = {
    notes: JSON.parse(localStorage.getItem('avium_pro_offline_notes')) || [],
    currentNoteId: null,
    isFabOpen: false,
    selectedBgColor: '#FFF8F6',
    brushMode: 'solid'
};

const DOM = {
    notesContainer: document.getElementById('notesContainer'),
    emptyState: document.getElementById('emptyState'),
    noteCount: document.getElementById('noteCount'),
    masterFab: document.getElementById('masterFab'),
    fabIcon: document.getElementById('fabIcon'),
    fabMenuOptions: document.getElementById('fabMenuOptions'),
    actionNewNote: document.getElementById('actionNewNote'),
    actionSketch: document.getElementById('actionSketch'),
    editorView: document.getElementById('editorView'),
    sketchView: document.getElementById('sketchView'),
    backBtn: document.getElementById('backBtn'),
    saveBtn: document.getElementById('saveBtn'),
    deleteNoteBtn: document.getElementById('deleteNoteBtn'),
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
let activePaintColor = '#EF4444';
let currentUtterance = null;

function init() {
    renderNotesList();
    setupEventListeners();
    initializeCanvasEngine();
    setupTodoCheckboxListener();
    resetFabStateInstantly(); // Force button variables to initialize correctly on launch
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

    DOM.noteCount.textContent = `${targetNotes.length} ${targetNotes.length === 1 ? 'note' : 'notes'}`;

    if (targetNotes.length === 0) {
        DOM.emptyState.classList.remove('hidden');
    } else {
        DOM.emptyState.classList.add('hidden');
        [...targetNotes].sort((a, b) => b.updatedAt - a.updatedAt).forEach(note => {
            const card = document.createElement('div');
            card.style.backgroundColor = note.bgColor || '#FFF0EC';
            card.className = 'note-card';
            
            let displayTitle = note.title.trim() || 'Untitled';
            let displayBody = note.body.replace(/<[^>]*>/g, '').trim() || 'No additional text';

            if (filterQuery) {
                const regex = new RegExp(`(${filterQuery})`, 'gi');
                displayTitle = displayTitle.replace(regex, `<mark>$1</mark>`);
                displayBody = displayBody.replace(regex, `<mark>$1</mark>`);
            }

            card.innerHTML = `
                <h3>${displayTitle}</h3>
                <div>${displayBody}</div>
            `;
            card.addEventListener('click', () => openEditor(note.id));
            DOM.notesContainer.appendChild(card);
        });
    }
}

function toggleFab() {
    state.isFabOpen = !state.isFabOpen;
    if (state.isFabOpen) {
        DOM.fabMenuOptions.classList.remove('hidden');
        DOM.masterFab.classList.add('master-fab-active');
        setTimeout(() => {
            DOM.fabMenuOptions.classList.remove('opacity-0', 'shift-down');
            DOM.fabMenuOptions.classList.add('shift-up');
        }, 10);
    } else {
        DOM.fabMenuOptions.classList.remove('shift-up');
        DOM.fabMenuOptions.classList.add('shift-down');
        DOM.fabMenuOptions.classList.add('opacity-0');
        DOM.masterFab.classList.remove('master-fab-active');
        setTimeout(() => DOM.fabMenuOptions.add('hidden'), 200);
    }
}

// 🛠️ FIX TRIGGER: Completely resets and collapses the speed dial values on navigation sweeps
function resetFabStateInstantly() {
    state.isFabOpen = false;
    DOM.fabMenuOptions.classList.add('hidden', 'opacity-0', 'shift-down');
    DOM.fabMenuOptions.classList.remove('shift-up');
    DOM.masterFab.classList.remove('master-fab-active');
    
    const wrapper = document.getElementById('masterFabWrapper');
    if (wrapper) wrapper.style.setProperty('display', 'flex', 'important');
}

function openEditor(noteId = null) {
    // Collapse option panels cleanly before entering documents workspace
    resetFabStateInstantly();
    state.currentNoteId = noteId;
    
    const wrapper = document.getElementById('masterFabWrapper');
    if (wrapper) wrapper.style.setProperty('display', 'none', 'important');

    DOM.editorView.classList.remove('hidden', 'mask-down');
    setTimeout(() => DOM.editorView.classList.add('mask-up'), 10);

    if (noteId) {
        const note = state.notes.find(n => n.id === noteId);
        DOM.noteTitle.value = note.title;
        DOM.noteBody.innerHTML = note.body;
        state.selectedBgColor = note.bgColor || '#FFF8F6';
        DOM.editorTimestamp.textContent = new Date(note.updatedAt).toLocaleString([], {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit'}).toUpperCase();
        DOM.deleteNoteBtn.classList.remove('hidden');
    } else {
        DOM.noteTitle.value = '';
        DOM.noteBody.innerHTML = '';
        state.selectedBgColor = '#FFF8F6';
        DOM.editorTimestamp.textContent = new Date().toLocaleString([], {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit'}).toUpperCase();
        DOM.deleteNoteBtn.classList.add('hidden');
    }
    DOM.editorView.style.backgroundColor = state.selectedBgColor;
    updateMetrics();
}

function deleteCurrentNote() {
    if (!state.currentNoteId) return;
    state.notes = state.notes.filter(n => n.id !== state.currentNoteId);
    localStorage.setItem('avium_pro_offline_notes', JSON.stringify(state.notes));
    renderNotesList(DOM.searchBar.value);
    discardAndClose();
}

function updateMetrics() {
    const txt = DOM.noteBody.innerText || '';
    const chars = txt.length;
    const words = txt.trim() === '' ? 0 : txt.trim().split(/\s+/).length;
    DOM.liveMetrics.textContent = `${words}w ${chars}c`;
    
    const hasData = DOM.noteTitle.value.trim() || txt.trim();
    if (hasData) {
        DOM.saveBtn.classList.remove('disabled-state');
    } else {
        DOM.saveBtn.classList.add('disabled-state');
    }
}

function saveAndClose() {
    const title = DOM.noteTitle.value.trim();
    const body = DOM.noteBody.innerHTML.trim();
    if (!title && !body && body !== '<br>') return discardAndClose();

    if (state.currentNoteId) {
        const note = state.notes.find(n => n.id === state.currentNoteId);
        note.title = title; note.body = body; note.bgColor = state.selectedBgColor; note.updatedAt = Date.now();
    } else {
        state.notes.push({ id: 'avium_' + Date.now(), title, body, bgColor: state.selectedBgColor, updatedAt: Date.now() });
    }
    localStorage.setItem('avium_pro_offline_notes', JSON.stringify(state.notes));
    renderNotesList(DOM.searchBar.value);
    discardAndClose();
}

function discardAndClose() {
    stopSpeakingEngine();
    DOM.editorView.classList.remove('mask-up');
    DOM.editorView.classList.add('mask-down');
    
    // Smoothly restore the master trigger on completion to a clean plus configuration layout
    resetFabStateInstantly();

    setTimeout(() => DOM.editorView.classList.add('hidden'), 300);
}

function handleSpeakingEngine() {
    const syn = window.speechSynthesis || window.webkitSpeechSynthesis;
    if (!syn) return;

    if (syn.speaking) {
        stopSpeakingEngine();
    } else {
        const bodyText = DOM.noteBody.innerText || '';
        if (!bodyText.trim()) return;

        syn.cancel(); 
        
        currentUtterance = new SpeechSynthesisUtterance(bodyText);
        currentUtterance.onend = () => DOM.speakBtn.style.backgroundColor = '#F5EBE8';
        currentUtterance.onerror = () => DOM.speakBtn.style.backgroundColor = '#F5EBE8';
        
        DOM.speakBtn.style.backgroundColor = '#FCDCD5'; 
        syn.speak(currentUtterance);
    }
}

function stopSpeakingEngine() {
    const syn = window.speechSynthesis || window.webkitSpeechSynthesis;
    if (syn && syn.speaking) {
        syn.cancel();
    }
    DOM.speakBtn.style.backgroundColor = '#F5EBE8';
}

function handleExportEngine() {
    const title = DOM.noteTitle.value.trim() || 'Untitled_Note';
    const rawContent = DOM.noteBody.innerText || '';
    const outputString = `${title}\n\n${rawContent}`;
    
    try {
        const base64Data = btoa(unescape(encodeURIComponent(outputString)));
        const cleanFileName = `${title.replace(/\s+/g, '_')}.txt`;
        
        const anchor = document.createElement('a');
        anchor.href = `data:text/plain;charset=utf-8;base64,${base64Data}`;
        anchor.download = cleanFileName;
        
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    } catch (e) {
        console.error(e);
    }
}

function setupTodoCheckboxListener() {
    DOM.noteBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('todo-checkbox')) {
            e.target.classList.toggle('checked');
            updateMetrics();
        }
    });
}

function syncCanvasSize() {
    const sheet = DOM.paintCanvas.parentElement;
    if (!sheet) return;
    DOM.paintCanvas.width = sheet.clientWidth;
    DOM.paintCanvas.height = sheet.clientHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function initializeCanvasEngine() {
    window.addEventListener('resize', syncCanvasSize);

    const position = (e) => {
        const boundary = DOM.paintCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - boundary.left, y: clientY - boundary.top };
    };

    const startDrawing = (e) => {
        drawing = true;
        ctx.beginPath();
        const p = position(e);
        ctx.moveTo(p.x, p.y);
    };

    const drawMove = (e) => {
        if (!drawing) return;
        if (e.touches) e.preventDefault();
        const p = position(e);
        ctx.lineWidth = DOM.brushThickness.value;
        ctx.strokeStyle = state.brushMode === 'marker' ? activePaintColor + "40" : activePaintColor;
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    };

    DOM.paintCanvas.addEventListener('mousedown', startDrawing);
    DOM.paintCanvas.addEventListener('mousemove', drawMove);
    window.addEventListener('mouseup', () => drawing = false);

    DOM.paintCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    DOM.paintCanvas.addEventListener('touchmove', drawMove, { passive: false });
    window.addEventListener('touchend', () => drawing = false);
}

function setupEventListeners() {
    DOM.masterFab.addEventListener('click', toggleFab);
    DOM.actionNewNote.addEventListener('click', () => openEditor(null));
    DOM.backBtn.addEventListener('click', saveAndClose);
    DOM.saveBtn.addEventListener('click', saveAndClose);
    DOM.deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    DOM.noteTitle.addEventListener('input', updateMetrics);
    DOM.noteBody.addEventListener('input', updateMetrics);
    
    DOM.searchBar.addEventListener('input', (e) => renderNotesList(e.target.value));

    DOM.insertTodoBtn.addEventListener('click', () => {
        DOM.noteBody.focus();
        const todoHtml = `<div class="todo-row" contenteditable="false"><span class="todo-checkbox"></span><span class="todo-text" contenteditable="true" style="outline:none; width:100%;">Task</span></div><br>`;
        document.execCommand('insertHTML', false, todoHtml);
        updateMetrics();
    });

    DOM.speakBtn.addEventListener('click', handleSpeakingEngine);
    DOM.exportBtn.addEventListener('click', handleExportEngine);

    DOM.penModeBtn.addEventListener('click', () => {
        state.brushMode = 'solid';
        DOM.penModeBtn.classList.add('active-pill');
        DOM.markerModeBtn.classList.remove('active-pill');
    });

    DOM.markerModeBtn.addEventListener('click', () => {
        state.brushMode = 'marker';
        DOM.markerModeBtn.classList.add('active-pill');
        DOM.penModeBtn.classList.remove('active-pill');
    });

    DOM.colorPaletteToggle.addEventListener('click', () => {
        DOM.colorSheetOverlay.classList.remove('hidden');
        setTimeout(() => {
            DOM.colorSheetOverlay.classList.add('fade-in');
            DOM.colorSheetCard.classList.remove('translate-down');
            DOM.colorSheetCard.classList.add('translate-up');
        }, 10);
    });

    DOM.colorSheetOverlay.addEventListener('click', (e) => {
        if (e.target === DOM.colorSheetOverlay) {
            DOM.colorSheetCard.classList.remove('translate-up');
            DOM.colorSheetCard.classList.add('translate-down');
            DOM.colorSheetOverlay.classList.remove('fade-in');
            setTimeout(() => DOM.colorSheetOverlay.classList.add('hidden'), 300);
        }
    });

    document.querySelectorAll('.sheet-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.selectedBgColor = btn.dataset.bg;
            DOM.editorView.style.backgroundColor = state.selectedBgColor;
            document.querySelectorAll('.sheet-color-btn').forEach(b => { b.innerHTML = ''; b.classList.remove('border-active'); });
            btn.innerHTML = '<span class="icon icon-check"></span>';
            btn.classList.add('border-active');
        });
    });

    const triggerSketchWindow = () => {
        // Force the speed-dial components to collapse and reset state handles cleanly
        resetFabStateInstantly();
        
        const wrapper = document.getElementById('masterFabWrapper');
        if (wrapper) wrapper.style.setProperty('display', 'none', 'important');
        DOM.sketchView.classList.remove('hidden', 'mask-down');
        DOM.sketchView.classList.add('mask-up');
        setTimeout(syncCanvasSize, 350);
    };

    DOM.actionSketch.addEventListener('click', triggerSketchWindow);
    DOM.triggerInlineSketch.addEventListener('click', triggerSketchWindow);

    DOM.closeSketchBtn.addEventListener('click', () => {
        DOM.sketchView.classList.remove('mask-up');
        DOM.sketchView.classList.add('mask-down');
        
        // Restore elements safely on drop back tracking loops
        if (DOM.editorView.classList.contains('hidden')) {
            resetFabStateInstantly();
        }
        setTimeout(() => DOM.sketchView.classList.add('hidden'), 300);
    });

    DOM.clearCanvasBtn.addEventListener('click', () => ctx.clearRect(0, 0, DOM.paintCanvas.width, DOM.paintCanvas.height));

    DOM.saveSketchBtn.addEventListener('click', () => {
        const imageUri = DOM.paintCanvas.toDataURL();
        if (DOM.editorView.classList.contains('hidden')) {
            openEditor(null);
        } else {
            DOM.noteBody.focus();
        }
        document.execCommand('insertImage', false, imageUri);
        DOM.sketchView.classList.remove('mask-up');
        DOM.sketchView.classList.add('mask-down');
        setTimeout(() => DOM.sketchView.classList.add('hidden'), 300);
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

const state = {
    notes: JSON.parse(localStorage.getItem('avium_pro_offline_notes')) || [],
    currentNoteId: null,
    isFabOpen: false,
    selectedBgColor: '#FFF8F6',
    brushMode: 'solid',
    isGridLayout: true
};

const DOM = {
    notesContainer: document.getElementById('notesContainer'),
    emptyState: document.getElementById('emptyState'),
    noteCount: document.getElementById('noteCount'),
    masterFab: document.getElementById('masterFab'),
    fabMenuOptions: document.getElementById('fabMenuOptions'),
    actionNewNote: document.getElementById('actionNewNote'),
    actionSketch: document.getElementById('actionSketch'),
    editorView: document.getElementById('editorView'),
    sketchView: document.getElementById('sketchView'),
    backBtn: document.getElementById('backBtn'),
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
    markerModeBtn: document.getElementById('markerModeBtn'),
    toolbarStreamBtn: document.getElementById('toolbarStreamBtn'),
    toolbarMenuBtn: document.getElementById('toolbarMenuBtn'),
    toggleRibbonBtn: document.getElementById('toggleRibbonBtn'),
    formattingRibbon: document.getElementById('formattingRibbon')
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
    resetFabStateInstantly(); 
}

function formatDoc(command) {
    document.execCommand(command, false, null);
}

// 🌟 REMAPPED ENGINE: Dynamically embeds the Quick Action Bar seen in 515.png
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
            card.dataset.id = note.id;
            
            let displayTitle = note.title.trim() || 'Untitled';
            let displayBody = note.body.replace(/<[^>]*>/g, '').trim() || 'No additional text';

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.body;
            const firstImg = tempDiv.querySelector('img');
            let sketchPreviewHtml = '';
            if (firstImg && firstImg.src) {
                sketchPreviewHtml = `<div class="card-sketch-container"><img src="${firstImg.src}" alt="Sketch"></div>`;
            }

            if (filterQuery) {
                const regex = new RegExp(`(${filterQuery})`, 'gi');
                displayTitle = displayTitle.replace(regex, `<mark>$1</mark>`);
                displayBody = displayBody.replace(regex, `<mark>$1</mark>`);
            }

            const noteDate = new Date(note.updatedAt).toLocaleString([], {month:'short', day:'numeric'});
            const textContent = displayBody === 'No additional text' && sketchPreviewHtml ? '' : `<p class="note-card-text">${displayBody}</p>`;

            // Inject the premium inline overlay toolbar header panel
            card.innerHTML = `
                <div class="card-quick-actions-bar">
                    <button class="quick-action-btn qa-delete" title="Delete entry"></button>
                    <button class="quick-action-btn qa-expand" title="Open editor"></button>
                    <button class="quick-action-btn qa-pin" title="Pin entry"></button>
                </div>
                <div class="card-content-wrapper">
                    <h3>${displayTitle}</h3>
                    <div class="card-metadata-chip">${noteDate}</div>
                    ${sketchPreviewHtml}
                    ${textContent}
                </div>
            `;
            
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
        setTimeout(() => DOM.fabMenuOptions.classList.add('hidden'), 150);
    }
}

function resetFabStateInstantly() {
    state.isFabOpen = false;
    DOM.fabMenuOptions.className = 'fab-options-stack hidden opacity-0 shift-down';
    DOM.masterFab.className = 'master-fab-trigger shadow-xl';
    
    const wrapper = document.getElementById('masterFabWrapper');
    if (wrapper) {
        wrapper.className = 'action-fab-system-wrapper';
        wrapper.style.setProperty('display', 'flex', 'important');
    }
}

function openEditor(noteId = null) {
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
    } else {
        DOM.noteTitle.value = '';
        DOM.noteBody.innerHTML = '';
        state.selectedBgColor = '#FFF8F6';
        DOM.editorTimestamp.textContent = new Date().toLocaleString([], {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit'}).toUpperCase();
    }
    
    document.querySelectorAll('.sheet-color-btn').forEach(b => {
        b.classList.remove('border-active');
        if (b.dataset.bg.toLowerCase() === state.selectedBgColor.toLowerCase()) {
            b.classList.add('border-active');
        }
    });

    DOM.editorView.style.backgroundColor = state.selectedBgColor;
    DOM.formattingRibbon.classList.remove('hidden'); 
    updateMetrics();
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
    resetFabStateInstantly();
    setTimeout(() => DOM.editorView.classList.add('hidden'), 300);
}

function handleSpeakingEngine() {
    try {
        const syn = window.speechSynthesis || window.webkitSpeechSynthesis;
        if (!syn) return;
        if (syn.speaking) { stopSpeakingEngine(); return; }
        const bodyText = DOM.noteBody.innerText || '';
        if (!bodyText.trim()) return;
        syn.cancel();
        currentUtterance = new SpeechSynthesisUtterance(bodyText.trim());
        syn.speak(currentUtterance);
    } catch (error) { console.error(error); }
}

function stopSpeakingEngine() {
    const syn = window.speechSynthesis || window.webkitSpeechSynthesis;
    if (syn) syn.cancel();
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
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
}

function initializeCanvasEngine() {
    window.addEventListener('resize', syncCanvasSize);
    const position = (e) => {
        const boundary = DOM.paintCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - boundary.left, y: clientY - boundary.top };
    };
    const startDrawing = (e) => { drawing = true; ctx.beginPath(); const p = position(e); ctx.moveTo(p.x, p.y); };
    const drawMove = (e) => {
        if (!drawing) return; if (e.touches) e.preventDefault(); const p = position(e);
        ctx.lineWidth = DOM.brushThickness.value; ctx.strokeStyle = state.brushMode === 'marker' ? activePaintColor + "40" : activePaintColor;
        ctx.lineTo(p.x, p.y); ctx.stroke();
    };
    DOM.paintCanvas.addEventListener('mousedown', startDrawing); DOM.paintCanvas.addEventListener('mousemove', drawMove);
    window.addEventListener('mouseup', () => drawing = false);
    DOM.paintCanvas.addEventListener('touchstart', startDrawing, { passive: false }); DOM.paintCanvas.addEventListener('touchmove', drawMove, { passive: false });
    window.addEventListener('touchend', () => drawing = false);
}

const triggerSketchWindow = () => {
    resetFabStateInstantly();
    const wrapper = document.getElementById('masterFabWrapper');
    if (wrapper) wrapper.style.setProperty('display', 'none', 'important');
    DOM.sketchView.classList.remove('hidden', 'mask-down');
    DOM.sketchView.classList.add('mask-up');
    setTimeout(syncCanvasSize, 350);
};

function setupEventListeners() {
    DOM.masterFab.addEventListener('click', toggleFab);
    DOM.backBtn.addEventListener('click', saveAndClose);
    
    DOM.actionNewNote.addEventListener('click', () => openEditor(null));
    DOM.actionSketch.addEventListener('click', triggerSketchWindow);
    DOM.noteTitle.addEventListener('input', updateMetrics);
    DOM.noteBody.addEventListener('input', updateMetrics);
    
    DOM.searchBar.addEventListener('click', () => resetFabStateInstantly());
    DOM.searchBar.addEventListener('input', (e) => renderNotesList(e.target.value));

    DOM.insertTodoBtn.addEventListener('click', () => {
        DOM.noteBody.focus();
        const todoHtml = `<div class="todo-row" contenteditable="false"><span class="todo-checkbox"></span><span class="todo-text" contenteditable="true" style="outline:none; width:100%;">Task</span></div><br>`;
        document.execCommand('insertHTML', false, todoHtml);
        updateMetrics();
    });

    DOM.toggleRibbonBtn.addEventListener('click', () => {
        DOM.formattingRibbon.classList.toggle('hidden');
    });

    // 🌟 BULLETPROOF CONTEXTUAL CARD ACTIONS
    DOM.notesContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.qa-delete');
        const expandBtn = e.target.closest('.qa-expand');
        const pinBtn = e.target.closest('.qa-pin');
        const card = e.target.closest('.note-card');

        // 1. Direct Delete Action
        if (deleteBtn && card) {
            e.stopPropagation();
            e.preventDefault();
            const noteId = card.dataset.id;
            
            // Check if the custom modal exists, otherwise fallback to native confirm
            if (DOM.deleteModalOverlay) {
                state.noteIdToDelete = noteId;
                DOM.deleteModalOverlay.classList.remove('hidden');
            } else {
                if (confirm("Delete this entry instantly?")) {
                    state.notes = state.notes.filter(n => n.id !== noteId);
                    localStorage.setItem('avium_pro_offline_notes', JSON.stringify(state.notes));
                    renderNotesList(DOM.searchBar.value);
                }
            }
            return;
        }

        // 2. Direct Expand Action
        if (expandBtn && card) {
            e.stopPropagation();
            e.preventDefault();
            // Route to correct editor based on available functions in your current script state
            if (typeof openEditor === "function") openEditor(card.dataset.id);
            else if (typeof openSketchEditor === "function") openSketchEditor(card.dataset.id);
            return;
        }

        // 3. Direct Pin Action
        if (pinBtn && card) {
            e.stopPropagation();
            e.preventDefault();
            const noteId = card.dataset.id;
            const noteIndex = state.notes.findIndex(n => n.id === noteId);
            if (noteIndex > -1) {
                const targetNote = state.notes.splice(noteIndex, 1)[0];
                targetNote.updatedAt = Date.now(); 
                state.notes.unshift(targetNote);
                localStorage.setItem('avium_pro_offline_notes', JSON.stringify(state.notes));
                renderNotesList(DOM.searchBar.value);
            }
            return;
        }

        // Default: Clicking the card body
        if (card) {
            if (typeof openEditor === "function") openEditor(card.dataset.id);
            else if (typeof openSketchEditor === "function") openSketchEditor(card.dataset.id);
        }
    });



        // 2. Direct Quick Expand Action
        if (e.target.closest('.qa-expand')) {
            e.stopPropagation();
            openEditor(noteId);
            return;
        }

        // 3. Direct Quick Pin Action
        if (e.target.closest('.qa-pin')) {
            e.stopPropagation();
            const noteIndex = state.notes.findIndex(n => n.id === noteId);
            if (noteIndex > -1) {
                const targetNote = state.notes.splice(noteIndex, 1)[0];
                targetNote.updatedAt = Date.now(); // Bump timestamp to sort to front
                state.notes.unshift(targetNote);
                localStorage.setItem('avium_pro_offline_notes', JSON.stringify(state.notes));
                renderNotesList(DOM.searchBar.value);
            }
            return;
        }

        // Default: Clicking anywhere else on card brings up editor safely
        openEditor(noteId);
    });

    document.addEventListener('click', (e) => {
        const paletteBtn = e.target.closest('#colorPaletteToggle');
        if (paletteBtn) {
            e.preventDefault(); e.stopPropagation();
            DOM.colorSheetOverlay.classList.remove('hidden');
            setTimeout(() => {
                DOM.colorSheetOverlay.classList.add('fade-in');
                DOM.colorSheetCard.classList.remove('translate-down');
                DOM.colorSheetCard.classList.add('translate-up');
            }, 10);
            return;
        }

        const colorOption = e.target.closest('.sheet-color-btn');
        if (colorOption) {
            state.selectedBgColor = colorOption.dataset.bg;
            DOM.editorView.style.backgroundColor = state.selectedBgColor;
            document.querySelectorAll('.sheet-color-btn').forEach(b => b.classList.remove('border-active'));
            colorOption.classList.add('border-active');
            
            DOM.colorSheetCard.classList.remove('translate-up');
            DOM.colorSheetCard.classList.add('translate-down');
            DOM.colorSheetOverlay.classList.remove('fade-in');
            setTimeout(() => DOM.colorSheetOverlay.classList.add('hidden'), 250);
        }
    });

    if (DOM.toolbarStreamBtn) {
        DOM.toolbarStreamBtn.addEventListener('click', () => {
            state.isGridLayout = !state.isGridLayout;
            if (state.isGridLayout) { DOM.notesContainer.classList.remove('list-layout-active'); }
            else { DOM.notesContainer.classList.add('list-layout-active'); }
        });
    }

    if (DOM.toolbarMenuBtn) {
        DOM.toolbarMenuBtn.addEventListener('click', () => {
            if (confirm("Clear local storage cache files completely?")) {
                localStorage.clear(); state.notes = []; renderNotesList();
            }
        });
    }

    DOM.penModeBtn.addEventListener('click', () => {
        state.brushMode = 'solid'; DOM.penModeBtn.classList.add('active-pill'); DOM.markerModeBtn.classList.remove('active-pill');
    });
    DOM.markerModeBtn.addEventListener('click', () => {
        state.brushMode = 'marker'; DOM.markerModeBtn.classList.add('active-pill'); DOM.penModeBtn.classList.remove('active-pill');
    });

    DOM.colorSheetOverlay.addEventListener('click', (e) => {
        if (e.target === DOM.colorSheetOverlay) {
            DOM.colorSheetCard.classList.remove('translate-up'); DOM.colorSheetCard.classList.add('translate-down');
            DOM.colorSheetOverlay.classList.remove('fade-in');
            setTimeout(() => DOM.colorSheetOverlay.classList.add('hidden'), 250);
        }
    });

    DOM.triggerInlineSketch.addEventListener('click', triggerSketchWindow);
    DOM.closeSketchBtn.addEventListener('click', () => {
        DOM.sketchView.classList.remove('mask-up'); DOM.sketchView.classList.add('mask-down');
        if (DOM.editorView.classList.contains('hidden')) { resetFabStateInstantly(); }
        setTimeout(() => DOM.sketchView.classList.add('hidden'), 300);
    });
    DOM.clearCanvasBtn.addEventListener('click', () => ctx.clearRect(0, 0, DOM.paintCanvas.width, DOM.paintCanvas.height));

    DOM.saveSketchBtn.addEventListener('click', () => {
        try {
            const imageUri = DOM.paintCanvas.toDataURL('image/png');
            const sketchImage = document.createElement('img');
            sketchImage.src = imageUri; sketchImage.className = 'inserted-sketch';
            sketchImage.style.maxWidth = '100%'; sketchImage.style.height = 'auto'; sketchImage.style.display = 'block'; sketchImage.style.margin = '12px 0'; sketchImage.style.borderRadius = '16px';
            DOM.noteBody.focus();
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0); range.deleteContents(); range.insertNode(sketchImage);
                range.setStartAfter(sketchImage); range.setEndAfter(sketchImage); selection.removeAllRanges(); selection.addRange(range);
            } else { DOM.noteBody.appendChild(sketchImage); }
            DOM.sketchView.classList.remove('mask-up'); DOM.sketchView.classList.add('mask-down');
            setTimeout(() => DOM.sketchView.classList.add('hidden'), 300);
            updateMetrics();
        } catch (error) { console.error("Save Sketch Error: ", error); }
    });

    document.querySelectorAll('.sketch-color').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.sketch-color').forEach(d => d.classList.remove('active-color'));
            dot.classList.add('active-color'); activePaintColor = dot.dataset.color;
        });
    });
}

function updateMetrics() {
    const txt = DOM.noteBody.innerText || '';
    const chars = txt.length;
    const words = txt.trim() === '' ? 0 : txt.trim().split(/\s+/).length;
    DOM.liveMetrics.textContent = `${words}w ${chars}c`;
}

window.addEventListener('DOMContentLoaded', init);

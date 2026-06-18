const state = {
    notes: JSON.parse(localStorage.getItem('ios27_notes')) || [],
    currentNoteId: null
};

const DOM = {
    notesContainer: document.getElementById('notesContainer'),
    noteCount: document.getElementById('noteCount'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    editorView: document.getElementById('editorView'),
    listView: document.getElementById('listView'),
    backBtn: document.getElementById('backBtn'),
    saveBtn: document.getElementById('saveBtn'),
    noteTitle: document.getElementById('noteTitle'),
    noteBody: document.getElementById('noteBody'),
    editorTimestamp: document.getElementById('editorTimestamp'),
    searchBar: document.getElementById('searchBar')
};

function init() {
    renderNotesList(state.notes);
    setupEventListeners();
}

function renderNotesList(notesArray) {
    DOM.notesContainer.innerHTML = '';
    DOM.noteCount.textContent = `${notesArray.length} ${notesArray.length === 1 ? 'Note' : 'Notes'}`;

    if (notesArray.length === 0) {
        DOM.notesContainer.innerHTML = `<div class="p-8 text-center text-gray-500 text-[15px]">No Notes</div>`;
        return;
    }

    const sorted = [...notesArray].sort((a, b) => b.updatedAt - a.updatedAt);

    sorted.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item p-4 flex flex-col gap-1 cursor-pointer transition-colors duration-150 bg-[#1c1c1e]';
        item.dataset.id = note.id;

        const cleanTitle = note.title.trim() || 'New Note';
        const cleanBody = note.body.trim() || 'No additional text';
        const formattedDate = new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        item.innerHTML = `
            <h2 class="text-[17px] font-semibold text-white truncate">${cleanTitle}</h2>
            <div class="flex items-center gap-2 text-[15px]">
                <span class="text-gray-500 shrink-0">${formattedDate}</span>
                <span class="text-gray-400 truncate">${cleanBody}</span>
            </div>
        `;

        item.addEventListener('click', () => openEditor(note.id));
        DOM.notesContainer.appendChild(item);
    });
}

function openEditor(noteId = null) {
    state.currentNoteId = noteId;
    DOM.editorView.classList.remove('hidden', 'slide-out');
    DOM.editorView.classList.add('slide-in');

    if (noteId) {
        const note = state.notes.find(n => n.id === noteId);
        DOM.noteTitle.value = note.title;
        DOM.noteBody.value = note.body;
        DOM.editorTimestamp.textContent = formatFullDate(note.updatedAt);
    } else {
        DOM.noteTitle.value = '';
        DOM.noteBody.value = '';
        DOM.editorTimestamp.textContent = formatFullDate(Date.now());
    }
    
    toggleSaveButtonState();
    DOM.noteTitle.focus();
}

function closeEditor() {
    DOM.editorView.classList.add('slide-out');
    DOM.editorView.classList.remove('slide-in');
    setTimeout(() => {
        DOM.editorView.classList.add('hidden');
        state.currentNoteId = null;
    }, 300);
}

function saveNote() {
    const title = DOM.noteTitle.value.trim();
    const body = DOM.noteBody.value.trim();

    if (!title && !body) {
        if (state.currentNoteId) {
            state.notes = state.notes.filter(n => n.id !== state.currentNoteId);
        }
    } else {
        if (state.currentNoteId) {
            const note = state.notes.find(n => n.id === state.currentNoteId);
            note.title = title;
            note.body = body;
            note.updatedAt = Date.now();
        } else {
            const newNote = {
                id: 'note_' + Date.now(),
                title: title,
                body: body,
                updatedAt: Date.now()
            };
            state.notes.push(newNote);
        }
    }

    localStorage.setItem('ios27_notes', JSON.stringify(state.notes));
    renderNotesList(state.notes);
    closeEditor();
}

function setupEventListeners() {
    DOM.newNoteBtn.addEventListener('click', () => openEditor(null));
    DOM.backBtn.addEventListener('click', closeEditor);
    DOM.saveBtn.addEventListener('click', saveNote);

    const inputHandler = () => toggleSaveButtonState();
    DOM.noteTitle.addEventListener('input', inputHandler);
    DOM.noteBody.addEventListener('input', inputHandler);

    DOM.searchBar.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = state.notes.filter(note => 
            note.title.toLowerCase().includes(query) || note.body.toLowerCase().includes(query)
        );
        renderNotesList(filtered);
    });
}

function toggleSaveButtonState() {
    const hasContent = DOM.noteTitle.value.trim().length > 0 || DOM.noteBody.value.trim().length > 0;
    if (hasContent) {
        DOM.saveBtn.classList.remove('opacity-40', 'pointer-events-none');
    } else {
        DOM.saveBtn.classList.add('opacity-40', 'pointer-events-none');
    }
}

function formatFullDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).toUpperCase();
}

window.addEventListener('DOMContentLoaded', init);

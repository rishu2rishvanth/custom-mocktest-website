import { fetchAndRenderResults } from './resultManager.js';

document.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('edit-question-btn')) return;

    const section = e.target.dataset.section;
    const question = e.target.dataset.question;

    const res = await fetch('/api/edit/get-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, question })
    });

    const data = await res.json();
    openEditModal(data);
});

function openEditModal(data) {
    const modal = document.createElement('div');
    modal.className = 'edit-modal';

    modal.innerHTML = `
    <div class="edit-modal-content">
      <div style="position:sticky;top:0;background:#fff;z-index:10;display:flex;gap:10px;">
        <button id="saveEdit" type="button">💾 Save</button>
        <button id="cancelEdit" type="button">Cancel</button>
      </div>

      <h3>Edit Question</h3>

      <label>Question</label>
      <textarea id="eq-question">${data.question}</textarea>

      <label>Options (JSON)</label>
      <textarea id="eq-options">${JSON.stringify(data.options, null, 2)}</textarea>

      <label>Correct Answer Index (MCQ)</label>
      <input id="eq-correct" value="${data.correctAnswerIndex ?? ''}">

      <label>MSQ Answers</label>
      <input id="eq-msq" value="${data.msqAnswers ?? ''}">

      <label>NAT Range</label>
      <input id="eq-nat" value="${data.natRange ?? ''}">

      <label>Type</label>
      <select id="eq-type">
        <option ${data.type==='MCQ'?'selected':''}>MCQ</option>
        <option ${data.type==='MSQ'?'selected':''}>MSQ</option>
        <option ${data.type==='NAT'?'selected':''}>NAT</option>
      </select>
    </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    // ⌨️ Attach Virtual Keyboard (after DOM insertion)
    attachVKIWithPosition(document.getElementById('eq-question'));
    attachVKIWithPosition(document.getElementById('eq-options'));
    attachVKIWithPosition(document.getElementById('eq-correct'));
    attachVKIWithPosition(document.getElementById('eq-msq'));
    attachVKIWithPosition(document.getElementById('eq-nat'));


    document.getElementById('cancelEdit').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        modal.remove();
        document.body.style.overflow = '';
    };

    document.getElementById('saveEdit').onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const payload = {
            section: data.section,
            rowIndex: data.rowIndex,
            question: document.getElementById('eq-question').value,
            options: JSON.parse(document.getElementById('eq-options').value),
            correctAnswerIndex: Number(document.getElementById('eq-correct').value),
            msqAnswers: document.getElementById('eq-msq').value,
            natRange: document.getElementById('eq-nat').value,
            type: document.getElementById('eq-type').value,
            marks: data.marks
        };

        const res = await fetch('/api/edit/save-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const r = await res.json();
        alert(r.message);

        modal.remove();
        document.body.style.overflow = '';
        fetchAndRenderResults(); // ✅ correct call
    };
}

function attachVKIWithPosition(el) {
    if (!el || typeof VKI_attach !== 'function') return;

    VKI_attach(el);

    el.addEventListener('focus', () => {
        setTimeout(() => {
            const kb = document.getElementById('keyboardInputMaster');
            if (!kb) return;

            const rect = el.getBoundingClientRect();

            kb.style.position = 'fixed';
            kb.style.left = rect.left + 'px';
            kb.style.top = (rect.bottom + 8) + 'px'; // 👈 BELOW input
            kb.style.zIndex = 10000;
        }, 50);
    });
}


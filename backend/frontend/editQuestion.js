import { fetchAndRenderResults } from './resultManager.js';

document.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('edit-question-btn')) return;

    const section = e.target.dataset.section;
    const questionId = e.target.dataset.questionId;

    if (!section || !questionId) {
        alert('❌ Missing section or QuestionID. Cannot edit.');
        return;
    }

    let data;
    try {
        const res = await fetch('/api/edit/get-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section, questionId })
        });

        data = await res.json();

        if (!res.ok || data.message) {
            throw new Error(data.message || 'Question not found');
        }
    } catch (err) {
        console.error(err);
        alert(`❌ Failed to load question.\n${err.message}`);
        return;
    }

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

      <label>Comprehension</label>
      <textarea id="eq-comprehension">${data.comprehension ?? ''}</textarea>

      <label>Question</label>
      <textarea id="eq-question">${data.question ?? ''}</textarea>

      <label>Options (JSON)</label>
      <textarea id="eq-options">${JSON.stringify(data.options || [], null, 2)}</textarea>

      <label>Correct Answer Index (MCQ)</label>
      <input id="eq-correct" value="${data.correctAnswerIndex ?? ''}">

      <label>MSQ Answers</label>
      <input id="eq-msq" value="${data.msqAnswers ?? ''}">

      <label>NAT Range</label>
      <input id="eq-nat" value="${data.natRange ?? ''}">

      <label>Type</label>
      <select id="eq-type">
        <option ${data.type === 'MCQ' ? 'selected' : ''}>MCQ</option>
        <option ${data.type === 'MSQ' ? 'selected' : ''}>MSQ</option>
        <option ${data.type === 'NAT' ? 'selected' : ''}>NAT</option>
      </select>

      <label>Marks (Weightage)</label>
      <input id="eq-marks" type="number" min="0" step="0.5" value="${data.marks ?? 1}">
    </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // ⌨️ Attach Virtual Keyboard
    [
        'eq-comprehension',
        'eq-question',
        'eq-options',
        'eq-correct',
        'eq-msq',
        'eq-nat',
        'eq-marks'
    ].forEach(id => attachVKIWithPosition(document.getElementById(id)));

    document.getElementById('cancelEdit').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        modal.remove();
        document.body.style.overflow = '';
    };

    document.getElementById('saveEdit').onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        let options;
        try {
            options = JSON.parse(document.getElementById('eq-options').value);
        } catch {
            alert('❌ Invalid Options JSON');
            return;
        }

        const payload = {
            section: data.section,
            questionId: data.questionId,
            comprehension: document.getElementById('eq-comprehension').value.trim(),
            question: document.getElementById('eq-question').value.trim(),
            options,
            correctAnswerIndex:
                document.getElementById('eq-correct').value === ''
                    ? null
                    : Number(document.getElementById('eq-correct').value),
            msqAnswers: document.getElementById('eq-msq').value.trim(),
            natRange: document.getElementById('eq-nat').value.trim(),
            type: document.getElementById('eq-type').value,
            marks: Number(document.getElementById('eq-marks').value) || 1
        };

        try {
            const res = await fetch('/api/edit/save-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const r = await res.json();
            if (!res.ok) throw new Error(r.message || 'Save failed');

            alert(r.message || 'Saved');
            modal.remove();
            document.body.style.overflow = '';
            fetchAndRenderResults();
        } catch (err) {
            console.error(err);
            alert(`❌ Failed to save.\n${err.message}`);
        }
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
            kb.style.top = rect.bottom + 8 + 'px';
            kb.style.zIndex = 10000;
        }, 50);
    });
}

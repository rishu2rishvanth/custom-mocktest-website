const vKeyboard = {
  saTypeQuesID: '',
  InsertionS: 0,
  allowedChars: [".", "-"],
  splKeys: ["Backspace", "←", "→", "Clear All"],
  mode: 'floating' // 'floating' | 'static' (quiz mode switch)
};

function showNumericKeyboard(inputEl) {
  // Track active input
  vKeyboard.saTypeQuesID = inputEl.id;
  vKeyboard.InsertionS = inputEl.value.length;

  // Remove any existing keyboard
  const existingKeyboard = document.getElementById('numericKeyboardContainer');
  if (existingKeyboard) {
    existingKeyboard.remove();
  }

  // Create the keyboard HTML
  const keyboardDiv = document.createElement('div');
  keyboardDiv.id = 'numericKeyboardContainer';
  keyboardDiv.className = 'vKeyboard';
  keyboardDiv.innerHTML = getNumericKeyboardHTML();

  // Insert keyboard based on mode
  if (vKeyboard.mode === 'static') {
    // Static mode (quiz): place keyboard directly below input
    keyboardDiv.classList.add('static-keyboard');
    inputEl.insertAdjacentElement('afterend', keyboardDiv);
  } else {
    // Floating mode: append to body
    document.body.appendChild(keyboardDiv);
  }

  // ⬇️ Position keyboard only in floating mode
  if (vKeyboard.mode === 'floating') {
    const inputRect = inputEl.getBoundingClientRect();
    keyboardDiv.style.position = 'absolute';
    keyboardDiv.style.top = `${inputRect.bottom + window.scrollY - 100}px`;

    if (window.matchMedia("(max-width: 1080px)").matches) {
      // On small screens, apply responsive width
      keyboardDiv.style.top = `${inputRect.bottom + window.scrollY + 5}px`;
      keyboardDiv.style.left = `${inputRect.left + window.scrollX}px`;
    } else {
      // On large screens, fix it to 900px from the left
      keyboardDiv.style.left = '900px';
    }

    keyboardDiv.style.zIndex = 1000;

    // Make draggable (jQuery UI required)
    $(keyboardDiv).draggable({
      containment: "body" // restrict drag area
    });
  }

  // Show the keyboard by adding 'show' class
  keyboardDiv.classList.add('show');

  // Prevent keyboard clicks from bubbling to document
  keyboardDiv.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  // Bind key events
  bindNumericKeys();
}

function getNumericKeyboardHTML() {
  const layout = [
    ["Backspace"],
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["0", ".", "-"],
    ["←", "→"],
    ["Clear All"]
  ];

  return layout.map(row => `
    <div class="vk-row">
      ${row.map(key => {
    const isSpl = vKeyboard.splKeys.includes(key);
    let label = key === "." ? "point" :
      key === "-" ? "negative" :
        key === "←" ? "left arrow" :
          key === "→" ? "right arrow" :
            key === "Backspace" ? "backspace" :
              key === "Clear All" ? "clear all" :
                "Number " + key;
    return `<span class="vk-btn ${isSpl ? 'spl' : ''}" role="button" tabindex="0" aria-label="${label}" data-key="${key}">${key}</span>`;
  }).join('')}
    </div>
  `).join('');
}

function bindNumericKeys() {
  document.querySelectorAll('#numericKeyboardContainer .vk-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      handleNumericKeyPress(key);
    });
  });
}

function handleNumericKeyPress(key) {
  const input = document.getElementById(vKeyboard.saTypeQuesID);
  let val = input.value;

  switch (key) {
    case "Backspace":
      if (vKeyboard.InsertionS > 0) {
        val = val.slice(0, vKeyboard.InsertionS - 1) + val.slice(vKeyboard.InsertionS);
        vKeyboard.InsertionS--;
      }
      break;
    case "Clear All":
      val = "";
      vKeyboard.InsertionS = 0;
      break;
    case "←":
      if (vKeyboard.InsertionS > 0) vKeyboard.InsertionS--;
      break;
    case "→":
      if (vKeyboard.InsertionS < val.length) vKeyboard.InsertionS++;
      break;
    default:
      const newVal = val.slice(0, vKeyboard.InsertionS) + key + val.slice(vKeyboard.InsertionS);
      if (numPadValidate(newVal)) {
        val = newVal;
        vKeyboard.InsertionS++;
      }
  }

  input.value = val;
  setCursor(input, vKeyboard.InsertionS);
}

function setCursor(input, pos) {
  input.setSelectionRange(pos, pos);
  input.focus();
}

function numPadValidate(text) {
  if (text.length > 15) return false;
  if ((text.match(/\./g) || []).length > 1) return false;
  if ((text.match(/-/g) || []).length > 1) return false;
  return true;
}

// Optional: auto-hide on outside click
document.addEventListener('click', function (e) {

  // 🔒 In STATIC mode, keep keyboard always visible
  if (vKeyboard.mode === 'static') return;

  const keyboard = document.getElementById('numericKeyboardContainer');
  const input = document.getElementById(vKeyboard.saTypeQuesID);

  // Do nothing if keyboard is not present
  if (!keyboard) return;

  // Do nothing if clicking inside keyboard
  if (keyboard.contains(e.target)) return;

  // Do nothing if clicking the active input
  if (input && input.contains(e.target)) return;

  // Otherwise, remove keyboard
  keyboard.remove();
});

document.addEventListener('focusin', function (e) {
  if (e.target.classList.contains('numeric-input')) {
    showNumericKeyboard(e.target);
  }
});

window.vKeyboard = vKeyboard;

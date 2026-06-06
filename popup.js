const DEFAULT_SELECTOR = ".chat-turn-container.code-block-aligner.model.render.ng-star-inserted";

document.addEventListener('DOMContentLoaded', async () => {
  const toggleExtension = document.getElementById('toggleExtension');
  const selectorInput = document.getElementById('selectorInput');
  const addSelectorBtn = document.getElementById('addSelector');
  const selectorsList = document.getElementById('selectorsList');
  const selectAllBtn = document.getElementById('selectAll');
  const forceApplyBtn = document.getElementById('forceApply');
  const preserveCodeToggle = document.getElementById('preserveCode');
  const rtlUserPromptsToggle = document.getElementById('rtlUserPrompts');
  const rtlUserInputToggle = document.getElementById('rtlUserInput');

  /// Load configuration from local storage
  let data = await chrome.storage.local.get(['enabled', 'selectors', 'preserveCode', 'rtlUserPrompts', 'rtlUserInput']);
  let enabled = data.enabled !== undefined ? data.enabled : true;
  let preserveCode = data.preserveCode !== undefined ? data.preserveCode : true;
  let rtlUserPrompts = data.rtlUserPrompts !== undefined ? data.rtlUserPrompts : true;
  let rtlUserInput = data.rtlUserInput !== undefined ? data.rtlUserInput : false; // Default is false (disabled)
  let selectors = data.selectors || [{ text: DEFAULT_SELECTOR, active: true, isDefault: true }];

  // Setup UI components
  toggleExtension.checked = enabled;
  preserveCodeToggle.checked = preserveCode;
  rtlUserPromptsToggle.checked = rtlUserPrompts;
  rtlUserInputToggle.checked = rtlUserInput;
  renderSelectors(selectors);

  async function saveState() {
    await chrome.storage.local.set({ enabled, selectors, preserveCode, rtlUserPrompts, rtlUserInput });
  }

  function renderSelectors(list) {
    selectorsList.innerHTML = '';
    list.forEach((sel, index) => {
      const item = document.createElement('div');
      item.className = 'selector-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = sel.active;
      checkbox.addEventListener('change', () => {
        list[index].active = checkbox.checked;
        saveState();
      });

      const label = document.createElement('span');
      label.className = 'selector-text';
      label.textContent = sel.text;
      label.title = sel.text;

      item.appendChild(checkbox);
      item.appendChild(label);

      if (!sel.isDefault) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', () => {
          selectors.splice(index, 1);
          saveState();
          renderSelectors(selectors);
        });
        item.appendChild(deleteBtn);
      } else {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'Default';
        item.appendChild(badge);
      }

      selectorsList.appendChild(item);
    });
  }

  // Handle master switch
  toggleExtension.addEventListener('change', () => {
    enabled = toggleExtension.checked;
    saveState();
  });

  // Handle preserve code blocks switch
  preserveCodeToggle.addEventListener('change', () => {
    preserveCode = preserveCodeToggle.checked;
    saveState();
  });

  // Handle RTL user prompts switch
  rtlUserPromptsToggle.addEventListener('change', () => {
    rtlUserPrompts = rtlUserPromptsToggle.checked;
    saveState();
  });

  // Handle RTL user input switch
  rtlUserInputToggle.addEventListener('change', () => {
    rtlUserInput = rtlUserInputToggle.checked;
    saveState();
  });

  // Handle adding custom selectors
  addSelectorBtn.addEventListener('click', () => {
    const value = selectorInput.value.trim();
    if (value) {
      if (!selectors.some(s => s.text === value)) {
        selectors.push({ text: value, active: true, isDefault: false });
        saveState();
        renderSelectors(selectors);
        selectorInput.value = '';
      }
    }
  });

  // Handle toggle selection for all items
  selectAllBtn.addEventListener('click', () => {
    const allChecked = selectors.every(s => s.active);
    selectors.forEach(s => s.active = !allChecked);
    saveState();
    renderSelectors(selectors);
  });

  // Handle Force Apply (Injects style directly bypasses url matching)
  forceApplyBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const activeSelectors = selectors.filter(s => s.active).map(s => s.text);
    if (activeSelectors.length === 0) return;

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selList, keepCodeLtr, applyRtlPrompts, applyRtlInput) => {
        let styleEl = document.getElementById('rtl-ext-style-force');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'rtl-ext-style-force';
          document.head.appendChild(styleEl);
        }
        let cssRules = selList.map(sel => {
          let rule = `${sel} { direction: rtl !important; }`;
          if (keepCodeLtr) {
            rule += `\n${sel} code, ${sel} pre, ${sel} .code-block { direction: ltr !important; text-align: left !important; }`;
          }
          return rule;
        }).join('\n');

        if (applyRtlPrompts) {
          const promptSelector = '.chat-turn-container.code-block-aligner.render.user.ng-star-inserted p.ng-star-inserted';
          cssRules += `\n${promptSelector} { direction: rtl !important; }`;
          if (keepCodeLtr) {
            cssRules += `\n${promptSelector} code, ${promptSelector} pre { direction: ltr !important; text-align: left !important; }`;
          }
        }

        if (applyRtlInput) {
          const inputSelector = '.prompt-box-container textarea';
          cssRules += `\n${inputSelector} { direction: rtl !important; }`;
        }

        styleEl.textContent = cssRules;
      },
      args: [activeSelectors, preserveCode, rtlUserPrompts, rtlUserInput]
    });
  });
});
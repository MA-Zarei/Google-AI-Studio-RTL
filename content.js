function updateRTL() {
  chrome.storage.local.get(['enabled', 'selectors', 'preserveCode', 'rtlUserPrompts', 'rtlUserInput'], (data) => {
    const enabled = data.enabled !== undefined ? data.enabled : true;
    const preserveCode = data.preserveCode !== undefined ? data.preserveCode : true;
    const rtlUserPrompts = data.rtlUserPrompts !== undefined ? data.rtlUserPrompts : true;
    const rtlUserInput = data.rtlUserInput !== undefined ? data.rtlUserInput : false;
    const selectors = data.selectors || [];
    
    let styleEl = document.getElementById('rtl-ext-style');
    
    if (!enabled) {
      if (styleEl) styleEl.remove();
      return;
    }

    const activeSelectors = selectors.filter(s => s.active).map(s => s.text);
    
    if (activeSelectors.length === 0) {
      if (styleEl) styleEl.remove();
      return;
    }

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'rtl-ext-style';
      document.head.appendChild(styleEl);
    }

    // Build the dynamic stylesheet
    let cssRules = activeSelectors.map(sel => {
      let rule = `${sel} { direction: rtl !important; }`;
      if (preserveCode) {
        rule += `\n${sel} code, ${sel} pre, ${sel} .code-block { direction: ltr !important; text-align: left !important; }`;
      }
      return rule;
    }).join('\n');

    if (rtlUserPrompts) {
      const promptSelector = '.chat-turn-container.code-block-aligner.render.user.ng-star-inserted p.ng-star-inserted';
      cssRules += `\n${promptSelector} { direction: rtl !important; }`;
      if (preserveCode) {
        cssRules += `\n${promptSelector} code, ${promptSelector} pre { direction: ltr !important; text-align: left !important; }`;
      }
    }

    if (rtlUserInput) {
      const inputSelector = '.prompt-box-container textarea';
      cssRules += `\n${inputSelector} { direction: rtl !important; }`;
    }

    styleEl.textContent = cssRules;
  });
}

// Initial execution
updateRTL();

// Listen to updates made in the extension popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.enabled || changes.selectors || changes.preserveCode || changes.rtlUserPrompts || changes.rtlUserInput)) {
    updateRTL();
  }
});
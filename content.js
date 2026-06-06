function updateRTL() {
  chrome.storage.local.get(['enabled', 'selectors', 'preserveCode'], (data) => {
    const enabled = data.enabled !== undefined ? data.enabled : true;
    const preserveCode = data.preserveCode !== undefined ? data.preserveCode : true;
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
    const cssRules = activeSelectors.map(sel => {
      let rule = `${sel} { direction: rtl !important; }`;
      if (preserveCode) {
        rule += `\n${sel} code, ${sel} pre, ${sel} .code-block { direction: ltr !important; text-align: left !important; }`;
      }
      return rule;
    }).join('\n');
    styleEl.textContent = cssRules;
  });
}

// Initial execution
updateRTL();

// Listen to updates made in the extension popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.enabled || changes.selectors || changes.preserveCode)) {
    updateRTL();
  }
});
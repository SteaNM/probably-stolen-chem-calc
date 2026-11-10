import { t, setLang } from './utils.js';
import { updateAll } from './logic.js';
import { renderMods, renderScannerInputs, renderStepsLayout, elements } from './ui.js';
import { RECIPES } from './constants.js';

window.updateAll = updateAll;

function updateLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerHTML = t(key);
    });
    
    const r = RECIPES[elements.recipeSel.value];
    renderMods(r, updateAll);
    renderScannerInputs(r, updateAll);
    renderStepsLayout(elements.recipeSel.value);
    updateAll();
}

function init() {
    updateLanguage();
    
    elements.langSwitch.addEventListener('change', (e) => {
        setLang(e.target.value);
        updateLanguage();
    });
    
    elements.recipeSel.addEventListener('change', () => {
        const r = RECIPES[elements.recipeSel.value];
        renderMods(r, updateAll);
        renderScannerInputs(r, updateAll);
        renderStepsLayout(elements.recipeSel.value);
        updateAll();
    });

    document.querySelectorAll('.calc input, .calc select').forEach(el => {
        el.addEventListener('input', updateAll);
        el.addEventListener('change', updateAll);
    });
}

init();
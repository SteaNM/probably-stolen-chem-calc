import { t, setLang } from './utils.js';
import { updateAll } from './logic.js';
import { addPortionRow, getPortionRows, removePortionRow, renderMods, renderScannerInputs, renderStepsLayout, elements } from './ui.js';
import { RECIPES } from './constants.js';

window.updateAll = updateAll;

function updateLanguage(preserveInputs = false) {
    const savedRows = preserveInputs ? getPortionRows() : [];
    const savedValues = preserveInputs
        ? new Map(
            Array.from(document.querySelectorAll('#modgrid input, #scannerInputs input, #steps input'))
                .map(input => [input.id, input.value])
        )
        : new Map();

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerHTML = t(key);
    });
    
    const r = RECIPES[elements.recipeSel.value];
    renderMods(r);
    renderScannerInputs(r, savedRows);
    renderStepsLayout(elements.recipeSel.value);

    savedValues.forEach((value, id) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
    });

    updateAll();
}

function init() {
    updateLanguage();
    
    elements.langSwitch.addEventListener('change', (e) => {
        setLang(e.target.value);
        updateLanguage(true);
    });
    
    elements.recipeSel.addEventListener('change', () => {
        const r = RECIPES[elements.recipeSel.value];
        renderMods(r);
        renderScannerInputs(r);
        renderStepsLayout(elements.recipeSel.value);
        updateAll();
    });

    const calc = document.querySelector('.calc');
    const handleInput = (event) => {
        if (event.target.id === 'recipe' && event.type === 'input') return;
        updateAll(event);
    };
    calc.addEventListener('input', handleInput);
    calc.addEventListener('change', handleInput);
    calc.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        if (button.dataset.action === 'add-portion') {
            addPortionRow();
            updateAll();
        } else if (button.dataset.action === 'remove-portion') {
            removePortionRow(Number(button.dataset.row));
            updateAll();
        }
    });
}

init();
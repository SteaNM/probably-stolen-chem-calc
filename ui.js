import { t } from './utils.js';

export const elements = {
    recipeSel: document.getElementById('recipe'),
    modgrid: document.getElementById('modgrid'),
    alcoholType: document.getElementById('alcoholType'),
    difficulty: document.getElementById('difficulty'),
    scannerInputs: document.getElementById('scannerInputs'),
    portionTotals: document.getElementById('portionTotals'),
    pipelineBox: document.getElementById('pipelineBox'),
    stepsEl: document.getElementById('steps'),
    warnEl: document.getElementById('warnings'),
    errEl: document.getElementById('error'),
    outputBox: document.getElementById('outputBox'),
    revenueContainer: document.getElementById('revenueContainer'),
    mainGrid: document.getElementById('mainGrid'),
    cartelBox: document.getElementById('cartelBox'),
    cartelResult: document.getElementById('cartelResult'),
    fillerInfo: document.getElementById('fillerInfo'),
    mushCostWrapper: document.getElementById('mushCostWrapper'),
    totalMushCost: document.getElementById('totalMushCost'),
    useChemCount: document.getElementById('useChemCount'),
    useRestrictedCount: document.getElementById('useRestrictedCount'),
    scanStarch: document.getElementById('scan_starch'),
    scanSugar: document.getElementById('scan_sugar'),
    cartelWeek: document.getElementById('cartelWeek'),
    cartelRep: document.getElementById('cartelRep'),
    cartelMode: document.getElementById('cartelMode'),
    langSwitch: document.getElementById('langSwitch')
};

export function renderMods(r) {
    elements.modgrid.innerHTML = '';
    const devs = [
        { k: 'blender', l: t('module_blender'), h: '−35%→0%' },
        { k: 'heater', l: t('module_heater'), h: `99°C→${t('manual')}` },
        { k: 'packer', l: t('module_packer'), h: '+12%→0%' }
    ];
    devs.forEach(d => {
        if (d.k === 'blender' && !r.isBlendable) return;
        const c = document.createElement('div'); c.className = 'modcard';
        c.innerHTML = `<h4>${d.l}</h4><input type="number" min="0" max="4" step="1" value="0" id="mod_${d.k}"><div class="hint">${d.h}</div>`;
        elements.modgrid.appendChild(c);
    });
}

const PORTION_RECIPES = new Set(['dream_dust', 'nightmare_dust', 'caffeine_pill', 'nomore_injector']);

function getPortionFields(id) {
    const fields = [
        { key: 'mush', label: id === 'nightmare_dust' ? t('input_mush_nightmare') : id === 'caffeine_pill' ? t('input_mush_coffee') : t('input_mush') },
        { key: 'protein', label: id === 'caffeine_pill' ? t('input_protein_coffee') : t('input_protein') }
    ];
    if (id === 'caffeine_pill') {
        fields.push({ key: 'fat', label: t('input_fat') });
        fields.push({ key: 'caffeine', label: t('input_caffeine_in_beans') });
    }
    if (id === 'nomore_injector') fields.push({ key: 'reducing', label: t('input_reducing') });
    return fields;
}

export function getPortionRows() {
    return Array.from(elements.scannerInputs.querySelectorAll('.portion-row')).map(row => {
        const values = {};
        row.querySelectorAll('[data-ingredient]').forEach(input => {
            values[input.dataset.ingredient] = input.value;
        });
        return {
            count: row.querySelector('[data-portion-count]').value,
            values
        };
    });
}

export function renderScannerInputs(r, savedRows = []) {
    elements.scannerInputs.innerHTML = '';
    const id = elements.recipeSel.value;
    const usesPortions = PORTION_RECIPES.has(id);
    elements.scannerInputs.classList.toggle('portion-list', usesPortions);

    if (usesPortions) {
        const rows = savedRows.length > 0 ? savedRows : [{ count: '1', values: {} }];
        const fields = getPortionFields(id);

        rows.forEach((row, rowIndex) => {
            const card = document.createElement('div');
            card.className = 'portion-row';
            card.innerHTML = `
                <div class="portion-row-header">
                    <strong>${t('portion_row', { number: rowIndex + 1 })}</strong>
                    <button type="button" class="portion-remove" data-action="remove-portion" data-row="${rowIndex}" ${rows.length === 1 ? 'disabled' : ''} aria-label="${t('remove_portion')}">−</button>
                </div>
                <div class="portion-fields">
                    ${fields.map(field => `
                        <label class="portion-field">
                            <span class="portion-field-label">${field.label}</span>
                            <span class="portion-input-wrap">
                                <input type="number" id="portion_${rowIndex}_${field.key}" min="0" step="0.1" value="${row.values?.[field.key] ?? '0'}" data-ingredient="${field.key}" aria-label="${field.label}">
                                <span>${t('label_ml')}</span>
                            </span>
                        </label>
                    `).join('')}
                </div>
                <label class="portion-count">
                    <span class="portion-field-label">${t('portion_count')}</span>
                    <span class="portion-input-wrap">
                        <input type="number" id="portion_${rowIndex}_count" min="1" step="1" value="${row.count || '1'}" data-portion-count aria-label="${t('portion_count')}">
                        <span>×</span>
                    </span>
                </label>
            `;
            elements.scannerInputs.appendChild(card);
        });

        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'portion-add';
        addButton.dataset.action = 'add-portion';
        addButton.textContent = `+ ${t('add_portion')}`;
        elements.scannerInputs.appendChild(addButton);
        return;
    }

    let inputs = [];
    if (id === 'phanta_pill') inputs = [{key:'methylol', label: t('input_methylol')}, {key:'stab', label: t('input_stab')}];

    inputs.forEach(inp => {
        const card = document.createElement('div');
        card.className = 'scanner-card';
        card.innerHTML = `<h4>${inp.label}</h4><input type="number" min="0" step="0.1" value="0" id="scan_${inp.key}">`;
        elements.scannerInputs.appendChild(card);
    });
}

export function addPortionRow() {
    renderScannerInputs(
        null,
        [...getPortionRows(), { count: '1', values: {} }]
    );
}

export function removePortionRow(index) {
    const rows = getPortionRows();
    if (rows.length <= 1) return;
    rows.splice(index, 1);
    renderScannerInputs(null, rows);
}

export function renderStepsLayout(id) {
    let html = '';
    const purityBlock = `
        <div class="line" style="margin-top:6px;border-top:1px solid #25323e;padding-top:6px">
            <span>${t('purity_after_evap')}</span>
            <span class="amt">
                <input type="number" id="purityInputValue" class="purity-input" value="100" min="1" max="100" step="any">
                <span style="color:#7bc8f2;font-weight:700">%</span>
            </span>
        </div>
        <div class="line">
            <span>${t('purity_after_packer')}</span>
            <span class="amt" id="purityGradeText" style="color:#a0d6a0">100.0%</span>
        </div>`;

    if (id === 'dream_dust' || id === 'nightmare_dust') {
        const descEvap = id === 'nightmare_dust' ? t('desc_evap_nightmare') : t('desc_evap_dream');
        const descMush = id === 'nightmare_dust' ? t('desc_nightmare') : t('desc_mush');
        html = `
            <div class="step"><div class="stitle">${t('step_blender')}</div><div class="desc">${descMush}</div></div>
            <div class="step"><div class="stitle">${t('step_extraction')}</div><div class="desc">${t('desc_extraction')}</div><div class="line"><span>${t('label_alcohol')}</span><span class="amt" id="amt-alc"></span></div></div>
            <div class="step"><div class="stitle">${t('step_cleaning')}</div><div class="desc">${t('desc_cleaning')}</div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-prot"></span></div></div>
            <div class="step"><div class="stitle">${t('step_filtering')}</div><div class="desc">${t('desc_filtering')}</div></div>
            <div class="step"><div class="stitle">${t('step_evap_pack')}</div><div class="desc">${descEvap}</div>${purityBlock}</div>`;
    } else if (id === 'caffeine_pill') {
        html = `
            <div class="step"><div class="stitle">${t('step_blender')}</div><div class="desc">${t('desc_coffee')}</div></div>
            <div class="step"><div class="stitle">${t('step_agent')}</div><div class="desc">${t('desc_agent_coffee')}</div><div class="line"><span>${t('label_agent')}</span><span class="amt" id="amt-fat"></span></div></div>
            <div class="step"><div class="stitle">${t('step_extraction')}</div><div class="desc">${t('desc_extract_coffee')}</div><div class="line"><span>${t('label_alcohol')}</span><span class="amt" id="amt-alc"></span></div></div>
            <div class="step"><div class="stitle">${t('step_cleaning')}</div><div class="desc">${t('desc_clean_coffee')}</div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-prot"></span></div></div>
            <div class="step"><div class="stitle">${t('step_evap_pack')}</div><div class="desc">${t('desc_evap_coffee')}</div>${purityBlock}</div>`;
    } else if (id === 'phanta_pill') {
        html = `
            <div class="step"><div class="stitle">${t('step_remove_stab')}</div><div class="desc">${t('desc_stab_phanta')}</div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-stab">0 ${t('label_ml')}</span></div></div>
            <div class="step"><div class="stitle">${t('step_filter_neutral')}</div><div class="desc">${t('desc_filter_phanta')}</div></div>
            <div class="step"><div class="stitle">${t('step_reduction')}</div><div class="desc">${t('desc_red_phanta')}</div><div class="line"><span>${t('label_reducing')}</span><span class="amt" id="amt-red">0 ${t('label_ml')}</span></div></div>
            <div class="step"><div class="stitle">${t('step_heating')}</div><div class="desc">${t('desc_heat_phanta')}</div></div>
            <div class="step"><div class="stitle">${t('step_evap_pack')}</div><div class="desc">${t('desc_evap_phanta')}</div>${purityBlock}</div>`;
    } else if (id === 'nomore_injector') {
        html = `
            <div class="step"><div class="stitle">${t('step_extract_nomore')}</div><div class="desc">${t('desc_extract_nomore')}</div><div class="line"><span>${t('label_alcohol')}</span><span class="amt" id="amt-alc"></span></div></div>
            <div class="step"><div class="stitle">${t('step_mix_nomore')}</div><div class="desc">${t('desc_clean_nomore')}</div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-prot"></span></div>${purityBlock}</div>
            <div class="step"><div class="stitle">${t('step_mix')}</div><div class="desc">${t('desc_mix_nomore')}</div><div class="line"><span>${t('label_extract')}</span><span class="amt" id="amt-ext"></span></div><div class="line"><span>${t('label_reducing')}</span><span class="amt" id="amt-red"></span></div></div>
            <div class="step"><div class="stitle">${t('step_agent')}</div><div class="desc">${t('desc_agent_nomore')}</div><div class="line"><span>${t('label_agent')}</span><span class="amt" id="amt-agent"></span></div></div>
            <div class="step"><div class="stitle">${t('step_reaction')}</div><div class="desc">${t('desc_react_nomore')}</div></div>
            <div class="step"><div class="stitle">${t('step_filtering')}</div><div class="desc">${t('desc_filter_nomore')}</div></div>`;
    }
    elements.stepsEl.innerHTML = html;
}

export function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = text;
}
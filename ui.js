import { t } from './utils.js';
import { BLENDER_LOSS, FINISHER_IMP, HEATER_SETTINGS } from './constants.js';

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
        { k: 'blender', l: t('module_blender') },
        { k: 'heater', l: t('module_heater') },
        { k: 'packer', l: t('module_packer') }
    ];
    devs.forEach(d => {
        if (d.k === 'blender' && !r.isBlendable) return;
        if (d.k === 'heater' && r.usesHeater === false) return;
        const c = document.createElement('div'); c.className = 'modcard';
        c.innerHTML = `<h4>${d.l}</h4><input type="number" min="0" max="4" step="1" value="0" id="mod_${d.k}"><div class="hint" id="mod_status_${d.k}"></div>`;
        elements.modgrid.appendChild(c);
    });
}

export function updateModuleStatuses(blenderModules, heaterModules, packerModules) {
    const statuses = [
        {
            id: 'blender',
            text: `${BLENDER_LOSS[blenderModules] * 100}% ${t('module_blender_loss')}`,
            isGood: BLENDER_LOSS[blenderModules] === 0
        },
        {
            id: 'heater',
            text: t(HEATER_SETTINGS[heaterModules]),
            isGood: heaterModules >= 1
        },
        {
            id: 'packer',
            text: `${FINISHER_IMP[packerModules] * 100}% ${t('module_packer_contamination')}`,
            isGood: FINISHER_IMP[packerModules] === 0
        }
    ];

    statuses.forEach(({ id, text, isGood }) => {
        const status = document.getElementById(`mod_status_${id}`);
        if (!status) return;
        status.textContent = text;
        status.classList.toggle('hint-good', isGood);
        status.classList.toggle('hint-bad', !isGood);
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
                                <input type="number" id="portion_${rowIndex}_${field.key}" min="0" step="0.01" value="${row.values?.[field.key] ?? '0'}" data-ingredient="${field.key}" aria-label="${field.label}">
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
    if (id === 'birth_control_pill') {
        inputs = [{key:'birth_control_count', label: t('input_birth_control_count'), step: 1}];
    }

    inputs.forEach(inp => {
        const card = document.createElement('div');
        card.className = 'scanner-card';
        card.innerHTML = `<h4>${inp.label}</h4><input type="number" min="0" step="${inp.step ?? '0.01'}" value="0" id="scan_${inp.key}">`;
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

function renderReagentPurityInput(id, label) {
    const inputId = `reagentPurity_${id}`;
    return `
        <div class="line purity-line">
            <label class="purity-label" for="${inputId}">${t(label)}</label>
            <span class="purity-value">
                <input type="number" id="${inputId}" class="purity-input reagent-purity-input" value="100" min="1" max="100" step="any" aria-label="${t(label)}">
                <span>%</span>
            </span>
        </div>`;
}

export function renderStepsLayout(id) {
    let html = '';
    const purityLabel = id === 'birth_control_pill'
        ? t('purity_before_packer')
        : t('purity_after_evap');
    const purityBlock = `
        ${id === 'birth_control_pill' ? `
        <div class="line purity-line">
            <label class="purity-label" for="scan_birth_control_filtered_volume">${t('input_birth_control_filtered_volume')}</label>
            <span class="purity-value">
                <input type="number" id="scan_birth_control_filtered_volume" class="purity-input" value="0" min="0" step="0.01" aria-label="${t('input_birth_control_filtered_volume')}">
                <span>${t('label_ml')}</span>
            </span>
        </div>` : ''}
        <div class="line purity-line">
            <span class="purity-label">${purityLabel}</span>
            <span class="purity-value">
                <input type="number" id="purityInputValue" class="purity-input" value="100" min="${id === 'birth_control_pill' ? '0' : '1'}" max="100" step="any">
                <span>%</span>
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
            <div class="step"><div class="stitle">${t('step_extraction')}</div><div class="desc">${t('desc_extraction')}</div><div class="line"><span id="label-alcohol">${t('label_alcohol')}</span><span class="amt" id="amt-alc"></span></div></div>
            <div class="step"><div class="stitle">${t('step_heating_dream')}</div><div class="desc">${t(id === 'nightmare_dust' ? 'desc_heat_nightmare' : 'desc_heat_dream')}</div></div>
            <div class="step"><div class="stitle">${t('step_cleaning')}</div><div class="desc">${t('desc_cleaning')}</div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-prot"></span></div>${renderReagentPurityInput('acidBase', 'reagent_purity_acid_base')}</div>
            <div class="step"><div class="stitle">${t('step_filtering')}</div><div class="desc">${t('desc_filtering')}</div></div>
            <div class="step"><div class="stitle">${t('step_evap_pack')}</div><div class="desc">${descEvap}</div>${purityBlock}</div>`;
    } else if (id === 'caffeine_pill') {
        html = `
            <div class="step"><div class="stitle">${t('step_blender')}</div><div class="desc">${t('desc_coffee')}</div></div>
            <div class="step"><div class="stitle">${t('step_agent_coffee')}</div><div class="desc">${t('desc_agent_coffee')}</div><div class="line"><span>${t('label_agent')}</span><span class="amt" id="amt-fat"></span></div>${renderReagentPurityInput('agent', 'reagent_purity_agent')}</div>
            <div class="step"><div class="stitle">${t('step_extraction_coffee')}</div><div class="desc">${t('desc_extract_coffee')}</div><div class="line"><span id="label-alcohol">${t('label_alcohol')}</span><span class="amt" id="amt-alc"></span></div></div>
            <div class="step"><div class="stitle">${t('step_heating_coffee')}</div><div class="desc">${t('desc_heat_coffee')}</div></div>
            <div class="step"><div class="stitle">${t('step_cleaning_coffee')}</div><div class="desc">${t('desc_clean_coffee')}</div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-prot"></span></div>${renderReagentPurityInput('acidBase', 'reagent_purity_acid_base')}</div>
            <div class="step"><div class="stitle">${t('step_evap_pack')}</div><div class="desc">${t('desc_evap_coffee')}</div>${purityBlock}</div>`;
    } else if (id === 'phanta_pill') {
        html = `
            <div class="step"><div class="stitle">${t('step_remove_stab')}</div><div class="desc">${t('desc_stab_phanta')}</div><div class="line"><span>${t('label_acid')}</span><span class="amt" id="amt-stab">0 ${t('label_ml')}</span></div>${renderReagentPurityInput('acidBase', 'reagent_purity_acid')}</div>
            <div class="step"><div class="stitle">${t('step_filter_neutral')}</div><div class="desc">${t('desc_filter_phanta')}</div><div class="line purity-line"><label class="purity-label" for="phantaAcidRemainder">${t('label_acid_remaining')}</label><span class="purity-value"><input type="number" id="phantaAcidRemainder" class="purity-input" value="0" min="0" step="0.01" aria-label="${t('label_acid_remaining')}"><span>${t('label_ml')}</span></span></div><div class="line"><span>${t('label_base')}</span><span class="amt" id="amt-base">0 ${t('label_ml')}</span></div>${renderReagentPurityInput('base', 'reagent_purity_base')}</div>
            <div class="step"><div class="stitle">${t('step_reduction')}</div><div class="desc">${t('desc_red_phanta')}</div><div class="line"><span>${t('label_reducing')}</span><span class="amt" id="amt-red">0 ${t('label_ml')}</span></div>${renderReagentPurityInput('reducing', 'reagent_purity_reducing')}</div>
            <div class="step"><div class="stitle">${t('step_heating_phanta')}</div><div class="desc">${t('desc_heat_phanta')}</div></div>
            <div class="step"><div class="stitle">${t('step_purify_phanta')}</div><div class="desc">${t('desc_purify_phanta')}</div></div>
            <div class="step"><div class="stitle">${t('step_evap_pack_phanta')}</div><div class="desc">${t('desc_evap_phanta')}</div>${purityBlock}</div>`;
    } else if (id === 'nomore_injector') {
        html = `
            <div class="step"><div class="stitle">${t('step_extract_nomore')}</div><div class="desc">${t('desc_extract_nomore')}</div><div class="line"><span id="label-alcohol">${t('label_alcohol')}</span><span class="amt" id="amt-alc"></span></div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-prot"></span></div>${renderReagentPurityInput('acidBase', 'reagent_purity_acid_base')}</div>
            <div class="step"><div class="stitle">${t('step_evap_nomore')}</div><div class="desc">${t('desc_evap_nomore')}</div>${purityBlock}</div>
            <div class="step"><div class="stitle">${t('step_reducing_nomore')}</div><div class="desc">${t('desc_mix_nomore')}</div><div class="line"><span>${t('label_extract')}</span><span class="amt" id="amt-ext"></span></div><div class="line"><span>${t('label_reducing')}</span><span class="amt" id="amt-red"></span></div>${renderReagentPurityInput('reducing', 'reagent_purity_reducing')}</div>
            <div class="step"><div class="stitle">${t('step_agent_nomore')}</div><div class="desc">${t('desc_agent_nomore')}</div><div class="line"><span>${t('label_agent')}</span><span class="amt" id="amt-agent"></span></div>${renderReagentPurityInput('agent', 'reagent_purity_agent')}</div>
            <div class="step"><div class="stitle">${t('step_reaction_nomore')}</div><div class="desc">${t('desc_react_nomore')}</div></div>
            <div class="step"><div class="stitle">${t('step_filter_nomore')}</div><div class="desc">${t('desc_filter_nomore')}</div></div>
            <div class="step"><div class="stitle">${t('step_finish_nomore')}</div><div class="desc">${t('desc_finish_nomore')}</div></div>`;
    } else if (id === 'birth_control_pill') {
        html = `
            <div class="step"><div class="stitle">${t('step_birth_control_blend')}</div><div class="desc">${t('desc_birth_control_blend')}</div></div>
            <div class="step"><div class="stitle">${t('step_birth_control_clean')}</div><div class="desc">${t('desc_birth_control_clean')}</div></div>
            <div class="step"><div class="stitle">${t('step_birth_control_check')}</div><div class="desc">${t('desc_birth_control_check')}</div>${purityBlock}</div>
            <div class="step"><div class="stitle">${t('step_birth_control_finish')}</div><div class="desc">${t('desc_birth_control_finish')}</div></div>`;
    }
    elements.stepsEl.innerHTML = html;
}

export function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = text;
}
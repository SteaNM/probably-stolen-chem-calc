import { t } from './utils.js';

export const elements = {
    recipeSel: document.getElementById('recipe'),
    modgrid: document.getElementById('modgrid'),
    alcoholType: document.getElementById('alcoholType'),
    difficulty: document.getElementById('difficulty'),
    scannerInputs: document.getElementById('scannerInputs'),
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

export function renderMods(r, updateCallback) {
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
        c.querySelector('input').addEventListener('input', updateCallback);
    });
}

export function renderScannerInputs(r, updateCallback) {
    elements.scannerInputs.innerHTML = '';
    let inputs = [];
    const id = elements.recipeSel.value;
    if (id === 'dream_dust') inputs = [{key:'mush', label: t('input_mush')}, {key:'protein', label: t('input_protein')}];
    else if (id === 'nightmare_dust') inputs = [{key:'mush', label: t('input_mush_nightmare')}, {key:'protein', label: t('input_protein')}];
    else if (id === 'caffeine_pill') inputs = [{key:'mush', label: t('input_mush_coffee')}, {key:'protein', label: t('input_protein_coffee')}, {key:'fat', label: t('input_fat')}];
    else if (id === 'phanta_pill') inputs = [{key:'methylol', label: t('input_methylol')}, {key:'stab', label: t('input_stab')}];
    else if (id === 'nomore_injector') inputs = [{key:'mush', label: t('input_mush')}, {key:'protein', label: t('input_protein')}, {key:'reducing', label: t('input_reducing')}];

    inputs.forEach(inp => {
        const card = document.createElement('div');
        card.className = 'scanner-card';
        card.innerHTML = `<h4>${inp.label}</h4><input type="number" min="0" step="0.1" value="0" id="scan_${inp.key}">`;
        elements.scannerInputs.appendChild(card);
        card.querySelector('input').addEventListener('input', updateCallback);
    });
}

export function renderStepsLayout(id) {
    let html = '';
    const purityBlock = `
        <div class="line" style="margin-top:6px;border-top:1px solid #25323e;padding-top:6px">
            <span>${t('purity_after_evap')}</span>
            <span class="amt">
                <input type="number" id="purityInputValue" class="purity-input" value="100" min="1" max="100" oninput="window.updateAll()">
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
            <div class="step"><div class="stitle">${t('step_extraction')}</div><div class="desc">${t('desc_extraction')}</div><div class="line"><span>${t('label_alcohol')}</span><span class="amt" id="amt-alc">0 ${t('label_ml')}</span></div></div>
            <div class="step"><div class="stitle">${t('step_cleaning')}</div><div class="desc">${t('desc_cleaning')}</div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-prot">0 ${t('label_ml')}</span></div></div>
            <div class="step"><div class="stitle">${t('step_filtering')}</div><div class="desc">${t('desc_filtering')}</div></div>
            <div class="step"><div class="stitle">${t('step_evap_pack')}</div><div class="desc">${descEvap}</div>${purityBlock}</div>`;
    } else if (id === 'caffeine_pill') {
        html = `
            <div class="step"><div class="stitle">${t('step_blender')}</div><div class="desc">${t('desc_coffee')}</div></div>
            <div class="step"><div class="stitle">${t('step_agent')}</div><div class="desc">${t('desc_agent_coffee')}</div><div class="line"><span>${t('label_agent')}</span><span class="amt" id="amt-fat">0 ${t('label_ml')}</span></div></div>
            <div class="step"><div class="stitle">${t('step_extraction')}</div><div class="desc">${t('desc_extract_coffee')}</div><div class="line"><span>${t('label_alcohol')}</span><span class="amt" id="amt-alc">0 ${t('label_ml')}</span></div></div>
            <div class="step"><div class="stitle">${t('step_cleaning')}</div><div class="desc">${t('desc_clean_coffee')}</div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-prot">0 ${t('label_ml')}</span></div></div>
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
            <div class="step"><div class="stitle">${t('step_extract_nomore')}</div><div class="desc">${t('desc_extract_nomore')}</div><div class="line"><span>${t('label_alcohol')}</span><span class="amt" id="amt-alc">0 ${t('label_ml')}</span></div></div>
            <div class="step"><div class="stitle">${t('step_mix_nomore')}</div><div class="desc">${t('desc_clean_nomore')}</div><div class="line"><span>${t('label_acid_base')}</span><span class="amt" id="amt-prot">0 ${t('label_ml')}</span></div>${purityBlock}</div>
            <div class="step"><div class="stitle">${t('step_mix')}</div><div class="desc">${t('desc_mix_nomore')}</div><div class="line"><span>${t('label_extract')}</span><span class="amt" id="amt-ext">0 ${t('label_ml')}</span></div><div class="line"><span>${t('label_reducing')}</span><span class="amt" id="amt-red">0 ${t('label_ml')}</span></div></div>
            <div class="step"><div class="stitle">${t('step_agent')}</div><div class="desc">${t('desc_agent_nomore')}</div><div class="line"><span>${t('label_agent')}</span><span class="amt" id="amt-agent">0 ${t('label_ml')}</span></div></div>
            <div class="step"><div class="stitle">${t('step_reaction')}</div><div class="desc">${t('desc_react_nomore')}</div></div>
            <div class="step"><div class="stitle">${t('step_filtering')}</div><div class="desc">${t('desc_filter_nomore')}</div></div>`;
    }
    elements.stepsEl.innerHTML = html;
}

export function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = text;
}
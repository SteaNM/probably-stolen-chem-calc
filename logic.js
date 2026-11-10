import { t, fmt, getMeasurementHtml, getGrade, calcReputation } from './utils.js';
import { RECIPES, DIFF_SETTINGS, BLENDER_LOSS, FINISHER_IMP } from './constants.js';
import { elements, updateText } from './ui.js';

export function updateAll() {
    elements.warnEl.innerHTML = '';
    elements.errEl.textContent = '';

    const id = elements.recipeSel.value;
    const r = RECIPES[id];
    
    const hasCartel = (id === 'dream_dust' || id === 'nomore_injector');
    if (hasCartel) {
        elements.mainGrid.classList.remove('no-cartel');
        elements.cartelBox.style.display = 'block';
    } else {
        elements.mainGrid.classList.add('no-cartel');
        elements.cartelBox.style.display = 'none';
    }
    
    elements.mushCostWrapper.style.display = (id === 'phanta_pill') ? 'none' : 'block';

    const inputs = {};
    ['mush', 'protein', 'fat', 'methylol', 'stab', 'reducing'].forEach(key => {
        const el = document.getElementById('scan_' + key);
        if (el) inputs[key] = parseFloat(el.value) || 0;
    });

    const fm = parseInt(document.getElementById('mod_packer')?.value) || 0;
    const hm = parseInt(document.getElementById('mod_heater')?.value) || 0;
    const bm = parseInt(document.getElementById('mod_blender')?.value) || 0;
    
    const alcPct = parseFloat(elements.alcoholType.value) || 0.7;
    const diffKey = elements.difficulty.value;
    const diffConfig = DIFF_SETTINGS[diffKey];

    const purityInput = document.getElementById('purityInputValue');
    let basePurity = purityInput ? parseFloat(purityInput.value) : 100;
    if (isNaN(basePurity) || basePurity <= 0) basePurity = 100;
    if (basePurity > 100) basePurity = 100;

    let purePurity = basePurity * (1 - FINISHER_IMP[Math.min(fm, 4)]);
    const g = getGrade(purePurity);
    
    const rawMushCost = id === 'phanta_pill' ? 0 : (parseFloat(elements.totalMushCost.value) || 0);
    const chemCountUsed = parseInt(elements.useChemCount.value) || 0;
    const restrictedCountUsed = parseInt(elements.useRestrictedCount.value) || 0;

    let totalExtract = 0;
    let lossPct = BLENDER_LOSS[Math.min(bm, 4)];
    let isCraftable = true;
    let errorMsg = '';
    let dreamExtractTotal = 0;
    let extractForCartel = 0;
    let extractForNomore = 0;

    // --- ОБНОВЛЕНИЕ КОНВЕЙЕРА С ДИНАМИЧЕСКИМ СБРОСОМ ---
    if (id === 'dream_dust' || id === 'nightmare_dust' || id === 'caffeine_pill') {
        const rawPaste = inputs.mush;
        if (rawPaste <= 0) {
            errorMsg = t('error_no_paste');
            elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_paste')} <b>0 ${t('pipe_ml')}</b><br>${t('pipe_blender_lost')} (${bm} ${t('pipe_mod')}) ${t('pipe_loses')} ${(lossPct * 100)}%: <b style="color:#f87171">−0 ${t('pipe_ml')}</b><br>${t('pipe_left')} <b>0 ${t('pipe_ml')}</b><br>${t('pipe_extract')} (${r.extractYield * 100}%): <b style="color:#a0d6a0">0 ${t('pipe_ml')}</b>`;
        } else {
            const lostAmount = rawPaste * lossPct;
            const usablePaste = rawPaste - lostAmount;
            totalExtract = usablePaste * r.extractYield;
            elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_paste')} <b>${fmt(rawPaste)} ${t('pipe_ml')}</b><br>${t('pipe_blender_lost')} (${bm} ${t('pipe_mod')}) ${t('pipe_loses')} ${(lossPct * 100)}%: <b style="color:#f87171">−${fmt(lostAmount)} ${t('pipe_ml')}</b><br>${t('pipe_left')} <b>${fmt(usablePaste)} ${t('pipe_ml')}</b><br>${t('pipe_extract')} (${r.extractYield * 100}%): <b style="color:#a0d6a0">${fmt(totalExtract)} ${t('pipe_ml')}</b>`;
        }
    } else if (id === 'nomore_injector') {
        const rawPaste = inputs.mush;
        if (rawPaste <= 0) {
            errorMsg = t('error_no_paste');
            elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_paste')} <b>0 ${t('pipe_ml')}</b>`;
        } else {
            const lostAmount = rawPaste * lossPct;
            const usablePaste = rawPaste - lostAmount;
            dreamExtractTotal = usablePaste * 0.5;
            
            const reqStr = elements.cartelWeek.value.split(',');
            const reqVials = parseInt(reqStr[0]);
            const reqPurity = parseFloat(reqStr[1]);
            const mode = elements.cartelMode.value;
            let targetPurity = reqPurity;
            if (mode === 'bonus') targetPurity += 10;
            
            extractForCartel = (targetPurity / purePurity) * (reqVials * 2);
            extractForNomore = Math.max(0, dreamExtractTotal - extractForCartel);
            
            const reducing = inputs.reducing;
            if (reducing <= 0) {
                errorMsg = t('error_no_reducing');
                elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_paste')} <b>${fmt(rawPaste)} ${t('pipe_ml')}</b><br>${t('pipe_dream_extract')} <b style="color:#7bc8f2">${fmt(dreamExtractTotal)} ${t('pipe_ml')}</b><br>${t('pipe_left_nomore')} <b style="color:#a0d6a0">${fmt(extractForNomore)} ${t('pipe_ml')}</b>`;
            } else {
                let effectiveExtract = Math.min(extractForNomore, reducing);
                if (reducing < extractForNomore) {
                    elements.warnEl.innerHTML = `<div class="warn">${t('warn_lack_reducing')} ${fmt(extractForNomore)} ${t('warn_lack_reducing_2')} ${fmt(extractForNomore)} ${t('warn_lack_reducing_3')} ${fmt(reducing)} ${t('warn_lack_reducing_4')}</div>`;
                    effectiveExtract = reducing;
                } else {
                    elements.warnEl.innerHTML = '';
                }
                totalExtract = effectiveExtract * 0.6;
                elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_paste')} <b>${fmt(rawPaste)} ${t('pipe_ml')}</b><br>${t('pipe_blender_lost')} (${bm} ${t('pipe_mod')}) ${t('pipe_loses')} ${(lossPct * 100)}%: <b style="color:#f87171">−${fmt(lostAmount)} ${t('pipe_ml')}</b><br>${t('pipe_left')} <b>${fmt(usablePaste)} ${t('pipe_ml')}</b><br>${t('pipe_dream_extract')} <b style="color:#7bc8f2">${fmt(dreamExtractTotal)} ${t('pipe_ml')}</b><br>${hasCartel ? `${t('pipe_for_cartel')} <b style="color:#f0b36a">${fmt(extractForCartel)} ${t('pipe_ml')}</b><br>` : ''}${t('pipe_left_nomore')} <b style="color:#a0d6a0">${fmt(extractForNomore)} ${t('pipe_ml')}</b><br>${t('pipe_nomore')} <b style="color:#a0d6a0">${fmt(totalExtract)} ${t('pipe_ml')}</b>`;
            }
        }
    } else if (id === 'phanta_pill') {
        const methylol = inputs.methylol;
        if (methylol <= 0) {
            errorMsg = t('error_no_methylol');
            elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_methylol')} <b>0 ${t('pipe_ml')}</b><br>${t('pipe_output')} <b>0 ${t('pipe_ml')}</b>`;
        } else if (hm < 1) {
            isCraftable = false; totalExtract = 0;
            elements.warnEl.innerHTML = `<div class="warn" style="border-left:4px solid #f87171;background:#2a1616;color:#f87171">${t('warn_no_heater')}</div>`;
            elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_methylol')} <b>${fmt(methylol)} ${t('pipe_ml')}</b><br>${t('pipe_output')} <b style="color:#f87171">0 ${t('pipe_ml')}</b>`;
        } else {
            totalExtract = methylol * r.extractYield;
            elements.warnEl.innerHTML = '';
            elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_methylol')} <b>${fmt(methylol)} ${t('pipe_ml')}</b><br>${t('pipe_output')} <b style="color:#a0d6a0">${fmt(totalExtract)} ${t('pipe_ml')}</b>`;
        }
    }

    // Если ошибка (например, пустые поля), очищаем результаты и выходим
    if (errorMsg) {
        elements.errEl.textContent = errorMsg;
        elements.outputBox.innerHTML = `
            <div style="font-size:.85rem;color:#cbd8e6;margin-bottom:6px">${t('total_output')}</div>
            <div class="line" style="padding:0 0 2px 0"><span>${t('ready_product')}</span><span class="amt" style="color:#f87171">0 ${t('label_ml')}</span></div>
            <div class="line" style="padding:0"><span>${t('ready_units')}</span><span class="amt" style="color:#f87171;font-size:1.1rem">0 ${t(r.unitKey)}</span></div>
        `;
        elements.revenueContainer.innerHTML = '';
        if (hasCartel) elements.cartelResult.innerHTML = '';
        return;
    }

    if (id === 'dream_dust' || id === 'nightmare_dust') {
        const usablePaste = inputs.mush * (1 - lossPct);
        const pureAlcNeeded = usablePaste * r.alcoholRatio;
        const bottleAlcNeeded = pureAlcNeeded / alcPct;
        updateText('amt-alc', `${fmt(bottleAlcNeeded)} ${t('label_ml')}`);
        updateText('amt-prot', `${fmt(inputs.protein)} ${t('label_ml')}` + getMeasurementHtml(inputs.protein));
    } else if (id === 'caffeine_pill') {
        const usablePaste = inputs.mush * (1 - lossPct);
        const pureAlcNeeded = usablePaste * r.alcoholRatio;
        const bottleAlcNeeded = pureAlcNeeded / alcPct;
        updateText('amt-fat', `${fmt(inputs.fat * 0.125)} ${t('label_ml')}` + getMeasurementHtml(inputs.fat * 0.125));
        updateText('amt-alc', `${fmt(bottleAlcNeeded)} ${t('label_ml')}`);
        updateText('amt-prot', `${fmt(inputs.protein)} ${t('label_ml')}` + getMeasurementHtml(inputs.protein));
    } else if (id === 'phanta_pill') {
        updateText('amt-stab', `${fmt(inputs.stab)} ${t('label_ml')}` + getMeasurementHtml(inputs.stab));
        updateText('amt-red', `${fmt(inputs.methylol * 0.75)} ${t('label_ml')}` + getMeasurementHtml(inputs.methylol * 0.75));
    } else if (id === 'nomore_injector') {
        const usablePaste = inputs.mush * (1 - lossPct);
        const pureExtract = usablePaste * 0.5;
        const pureAlcNeeded = usablePaste * 5;
        const bottleAlcNeeded = pureAlcNeeded / alcPct;
        const effectiveExtract = Math.min(Math.max(0, pureExtract - extractForCartel), inputs.reducing);
        updateText('amt-alc', `${fmt(bottleAlcNeeded)} ${t('label_ml')}`);
        updateText('amt-prot', `${fmt(inputs.protein)} ${t('label_ml')}` + getMeasurementHtml(inputs.protein));
        updateText('amt-ext', `${fmt(effectiveExtract)} ${t('label_ml')}`);
        updateText('amt-red', `${fmt(effectiveExtract)} ${t('label_ml')}` + getMeasurementHtml(effectiveExtract));
        updateText('amt-agent', `${fmt(effectiveExtract * 0.333)} ${t('label_ml')}` + getMeasurementHtml(effectiveExtract * 0.333));
    }
    
    updateText('purityGradeText', `<span style="color:${g.c}">${purePurity.toFixed(1)}% — ${g.n}</span>`);
    
    const totalItems = Math.floor(totalExtract / r.outputMl);
    const leftoverPure = totalExtract - (totalItems * r.outputMl);
    const actualMushCost = rawMushCost;
    const actualChemCost = chemCountUsed * 50;
    const actualRestrictedCost = restrictedCountUsed * 100;
    const totalCost = actualMushCost + actualChemCost + actualRestrictedCost;

    elements.outputBox.innerHTML = `
        <div style="font-size:.85rem;color:#cbd8e6;margin-bottom:6px">${t('total_output')}</div>
        <div class="line" style="padding:0 0 2px 0"><span>${t('ready_product')}</span><span class="amt" style="color:${isCraftable ? '#a0d6a0' : '#f87171'}">${fmt(totalExtract)} ${t('label_ml')}</span></div>
        <div class="line" style="padding:0"><span>${t('ready_units')}</span><span class="amt" style="color:${isCraftable ? '#a0d6a0' : '#f87171'};font-size:1.1rem">${totalItems} ${t(r.unitKey)}</span></div>
        ${leftoverPure > 0.1 ? `<div style="font-size:.7rem;color:#6e8aa5;margin-top:2px">${t('leftover_text', {amount: fmt(leftoverPure)})}</div>` : ''}
    `;

    let revenueHTML = '';
    if (r.baseValue && totalItems > 0) {
        const base = r.baseValue;
        const qualityBonus = base * g.m;
        const afterQuality = base + qualityBonus;
        const contrabandBonus = afterQuality * r.contrabandMarkup;
        const afterContraband = afterQuality + contrabandBonus;
        const diffBonus = afterContraband * (diffConfig.markup - 1);
        const finalPrice = afterContraband * diffConfig.markup;
        const pricePerItem = Math.round(finalPrice);
        const totalRevenue = pricePerItem * totalItems;
        const netProfit = totalRevenue - totalCost;
        
        revenueHTML = `
            <div class="sale-box">
                <div style="font-size:.85rem;color:#cbd8e6;font-weight:600;margin-bottom:6px">${t('price_per_item')}</div>
                <div class="sale-line"><span>${t('base_price')}</span><span>${base} ${t('currency')}</span></div>
                <div class="sale-line"><span>${t('quality_bonus')} (+${(g.m * 100).toFixed(0)}%)</span><span style="color:#7bc8f2">+${qualityBonus.toFixed(1)} ${t('currency')}</span></div>
                ${r.contrabandMarkup > 0 ? `<div class="sale-line"><span>${t('contraband_bonus')} (+${(r.contrabandMarkup * 100).toFixed(0)}%)</span><span style="color:#f0b36a">+${contrabandBonus.toFixed(1)} ${t('currency')}</span></div>` : ''}
                ${diffConfig.markup > 1 ? `<div class="sale-line"><span>${t('difficulty_bonus')} (${t('times')}${diffConfig.markup})</span><span style="color:#a0d6a0">+${diffBonus.toFixed(1)} ${t('currency')}</span></div>` : ''}
                <div class="sale-total"><span>${t('total_price')}</span><span>${t('approx')}${pricePerItem} ${t('currency')}</span></div>
                <div class="sale-line" style="margin-top:4px;font-size:.9rem;color:#e8edf2;font-weight:600"><span>${t('revenue_text', {amount: totalItems})}</span><span style="color:#a0d6a0">${t('approx')}${totalRevenue} ${t('currency')}</span></div>
            </div>
            <div class="cost-box" style="margin-bottom:8px">
                <div style="font-size:.85rem;color:#cbd8e6;font-weight:600;margin-bottom:4px">${t('costs_breakdown')}</div>
                ${id !== 'phanta_pill' ? `<div class="cost-line"><span>${t('cost_mushrooms')}</span><span class="amt" style="color:${actualMushCost > 0 ? '#f87171' : '#a0d6a0'}">${actualMushCost > 0 ? `−${actualMushCost.toFixed(1)} ${t('currency')}` : `0 ${t('currency')}`}</span></div>` : ''}
                <div class="cost-line"><span>${t('cost_chem_packs')} (${chemCountUsed} ${t('unit_pcs')})</span><span class="amt" style="color:${actualChemCost > 0 ? '#f87171' : '#a0d6a0'}">${actualChemCost > 0 ? `−${actualChemCost.toFixed(1)} ${t('currency')}` : `0 ${t('currency')}`}</span></div>
                <div class="cost-line"><span>${t('cost_restricted_packs')} (${restrictedCountUsed} ${t('unit_pcs')})</span><span class="amt" style="color:${actualRestrictedCost > 0 ? '#f87171' : '#a0d6a0'}">${actualRestrictedCost > 0 ? `−${actualRestrictedCost.toFixed(1)} ${t('currency')}` : `0 ${t('currency')}`}</span></div>
                <div class="cost-line" style="border-top:1px solid #25323e;padding-top:4px;margin-top:4px"><span><b>${t('total_costs')}</b></span><span class="amt" style="color:#f87171">−${totalCost.toFixed(1)} ${t('currency')}</span></div>
            </div>
            <div class="profit-box">
                <div class="profit-line" style="font-size:.9rem;font-weight:600;color:#e8edf2"><span>${t('profit')}</span><span class="amt" style="color:${netProfit >= 0 ? '#a0d6a0' : '#f87171'}">${t('approx')}${netProfit.toFixed(1)} ${t('currency')}</span></div>
            </div>
        `;
    }
    elements.revenueContainer.innerHTML = revenueHTML;

    if (hasCartel) {
        const starch = parseFloat(elements.scanStarch.value) || 0;
        const sugar = parseFloat(elements.scanSugar.value) || 0;
        const totalRawFiller = starch + sugar;
        const usableFiller = totalRawFiller * (1 - lossPct);
        elements.fillerInfo.innerHTML = `📥 <b>${t('cartel_filler')}:</b> ${fmt(totalRawFiller)} ${t('label_ml')} → ${t('after_blender')}: <b style="color:#f0b36a">${fmt(usableFiller)} ${t('label_ml')}</b>`;
        
        const reqStr = elements.cartelWeek.value.split(',');
        const reqVials = parseInt(reqStr[0]);
        const reqPurity = parseFloat(reqStr[1]);
        const mode = elements.cartelMode.value;
        const reputation = parseInt(elements.cartelRep.value) || 0;
        let targetPurity = reqPurity;
        if (mode === 'bonus') targetPurity += 10;

        if (id === 'dream_dust') {
            if (totalExtract <= 0) {
                elements.cartelResult.innerHTML = `<div class="warn">${t('error_no_extract')}</div>`;
            } else if (purePurity <= targetPurity) {
                elements.cartelResult.innerHTML = `<div class="warn">⚠️ ${purePurity.toFixed(0)}% < ${targetPurity}%</div>`;
            } else {
                const totalMixNeeded = reqVials * r.outputMl;
                const extractForCartelVal = (targetPurity / purePurity) * totalMixNeeded;
                const fillerNeeded = totalMixNeeded - extractForCartelVal;
                
                if (extractForCartelVal > totalExtract) {
                    elements.cartelResult.innerHTML = `<div class="warn" style="border-color:#f87171">${t('cartel_not_enough_extract')}</div>`;
                } else {
                    let fillerStatus = usableFiller >= fillerNeeded
                        ? `<span style="color:#a0d6a0">${t('cartel_filler_status_ok', {amount: fmt(usableFiller - fillerNeeded)})}</span>`
                        : `<span style="color:#f87171">${t('cartel_filler_status_bad', {amount: fmt(fillerNeeded - usableFiller)})}</span>`;
                    
                    const remainingExtract = totalExtract - extractForCartelVal;
                    const saleItems = Math.floor(remainingExtract / r.outputMl);
                    const saleLeftovers = remainingExtract - (saleItems * r.outputMl);
                    const usableMushForCartel = extractForCartelVal / r.extractYield;
                    const rawMushForCartel = usableMushForCartel / (1 - lossPct);
                    const rawMushRemaining = inputs.mush - rawMushForCartel;
                    
                    const actualRep = calcReputation(reqPurity, targetPurity, diffKey);
                    let repColor = actualRep > 10 ? '#7bc8f2' : '#a0d6a0';
                    let repDesc = actualRep > 10 ? t('cartel_rep_threshold') : t('cartel_rep_max');
                    const stipendWithPerk = 150 + (4 * reputation);
                    const mixPurity = targetPurity / (1 - FINISHER_IMP[Math.min(fm, 4)]);
                    
                    elements.cartelResult.innerHTML = `
                        <div style="font-size:.85rem;color:#cbd8e6;margin-bottom:8px">${t('cartel_turn_in_text', {vials: reqVials, purity: targetPurity})}</div>
                        <div style="background:#1e2a35;border-radius:6px;margin-bottom:8px;padding:8px">
                            <div style="font-size:.8rem;color:#a0d6a0;font-weight:600;margin-bottom:2px">${t('cartel_leave_sell')}</div>
                            <div class="line" style="padding:0"><span>${t('cartel_extract')}</span><span class="amt" style="color:#a0d6a0">${t('cartel_extract_amount_text', {amount: fmt(remainingExtract)})}</span></div>
                            <div class="line" style="padding:0"><span>${t('cartel_vials_label')}</span><span class="amt" style="color:#a0d6a0">${t('cartel_sale_items_text', {amount: saleItems})}</span></div>
                            ${saleLeftovers > 0.1 ? `<div style="font-size:.7rem;color:#6e8aa5;margin-top:2px">${t('leftover_text', {amount: fmt(saleLeftovers)})}</div>` : ''}
                        </div>
                        <div style="background:#1e2a35;border-radius:6px;padding:8px;margin-bottom:8px">
                            <div style="font-size:.8rem;color:#f0b36a;font-weight:600;margin-bottom:2px">${t('cartel_for_cartel')}</div>
                            <div class="line" style="padding:0"><span>${t('cartel_extract')}</span><span class="amt" style="color:#a0d6a0">${t('cartel_extract_amount_text', {amount: fmt(extractForCartelVal)})}</span></div>
                            <div class="line" style="padding:0"><span>${t('cartel_filler_amount')}</span><span class="amt" style="color:#f0b36a">${t('cartel_extract_amount_text', {amount: fmt(fillerNeeded)})}</span></div>
                            <div class="line" style="padding:0;margin-top:4px;border-top:1px solid #25323e;padding-top:4px"><span>${t('cartel_mix_purity')}</span><span class="amt" style="color:#7bc8f2">${mixPurity.toFixed(1)}%</span></div>
                            <div class="line" style="padding:0"><span>${t('cartel_final_purity')}</span><span class="amt" style="color:#a0d6a0">${targetPurity}%</span></div>
                            <div style="font-size:.75rem;margin-top:4px">${fillerStatus}</div>
                        </div>
                        <div class="rep-box" style="border-left-color:#f0b36a;background:#1c1f26;padding:6px;margin-top:4px">
                            <div style="font-size:.8rem;color:#cbd8e6;font-weight:600">${t('cartel_stipend')} <span style="color:#f0b36a">${t('approx')}${stipendWithPerk} ${t('currency')}</span></div>
                            <div style="font-size:.7rem;color:#8b9eb0">${t('cartel_stipend_base', {rep: reputation})}</div>
                        </div>
                        <div class="rep-box" style="padding:6px;margin-top:6px">
                            <div style="font-size:.8rem;color:#cbd8e6;font-weight:600">${t('cartel_rep_bonus')} <span style="color:${repColor}">+${actualRep} ${t('rep_points')}</span></div>
                            <div style="font-size:.7rem;color:#8b9eb0">${repDesc}</div>
                        </div>
                        <div style="font-size:.75rem;color:#8b9eb0;margin-top:8px;background:#1a232e;padding:6px;border-radius:6px">
                            ${t('cartel_paste_usage_text', {cartel: fmt(rawMushForCartel), sell: fmt(rawMushRemaining)})}
                        </div>
                    `;
                }
            }
        } else if (id === 'nomore_injector') {
            if (dreamExtractTotal <= 0) {
                elements.cartelResult.innerHTML = `<div class="warn">${t('error_no_extract')}</div>`;
            } else if (extractForCartel > dreamExtractTotal) {
                elements.cartelResult.innerHTML = `<div class="warn" style="border-color:#f87171">${t('cartel_not_enough_extract')}</div>`;
            } else {
                const mixNeededForCartel = reqVials * 2;
                const fillerNeeded = mixNeededForCartel - extractForCartel;
                const extractForNomoreVal = dreamExtractTotal - extractForCartel;
                const pureNomoreVolume = extractForNomoreVal * 0.6;
                const saleItems = Math.floor(pureNomoreVolume / r.outputMl);
                
                let fillerStatus = usableFiller >= fillerNeeded
                    ? `<span style="color:#a0d6a0">${t('cartel_filler_status_ok', {amount: fmt(usableFiller - fillerNeeded)})}</span>`
                    : `<span style="color:#f87171">${t('cartel_filler_status_bad', {amount: fmt(fillerNeeded - usableFiller)})}</span>`;
                
                const actualRep = calcReputation(reqPurity, targetPurity, diffKey);
                let repColor = actualRep > 10 ? '#7bc8f2' : '#a0d6a0';
                let repDesc = actualRep > 10 ? t('cartel_rep_threshold') : t('cartel_rep_max');
                const stipendWithPerk = 150 + (4 * reputation);
                const mixPurity = targetPurity / (1 - FINISHER_IMP[Math.min(fm, 4)]);
                
                elements.cartelResult.innerHTML = `
                    <div style="font-size:.85rem;color:#cbd8e6;margin-bottom:8px">${t('cartel_turn_in_text', {vials: reqVials, purity: targetPurity})}</div>
                    <div style="background:#1e2a35;border-radius:6px;margin-bottom:8px;padding:8px">
                        <div style="font-size:.8rem;color:#a0d6a0;font-weight:600;margin-bottom:2px">${t('cartel_leave_nomore')}</div>
                        <div class="line" style="padding:0"><span>${t('cartel_raw_extract')}</span><span class="amt" style="color:#a0d6a0">${t('cartel_extract_amount_text', {amount: fmt(extractForNomoreVal)})}</span></div>
                        <div class="line" style="padding:0"><span>${t('cartel_product_60')}</span><span class="amt" style="color:#a0d6a0">${t('cartel_extract_amount_text', {amount: fmt(pureNomoreVolume)})}</span></div>
                        <div class="line" style="padding:0"><span>${t('cartel_injectors')}</span><span class="amt" style="color:#a0d6a0">${t('cartel_sale_items_text', {amount: saleItems})}</span></div>
                    </div>
                    <div style="background:#1e2a35;border-radius:6px;padding:8px;margin-bottom:8px">
                        <div style="font-size:.8rem;color:#f0b36a;font-weight:600;margin-bottom:2px">${t('cartel_for_cartel')}</div>
                        <div class="line" style="padding:0"><span>${t('cartel_raw_extract')}</span><span class="amt" style="color:#a0d6a0">${t('cartel_extract_amount_text', {amount: fmt(extractForCartel)})}</span></div>
                        <div class="line" style="padding:0"><span>${t('cartel_filler_amount')}</span><span class="amt" style="color:#f0b36a">${t('cartel_extract_amount_text', {amount: fmt(fillerNeeded)})}</span></div>
                        <div class="line" style="padding:0;margin-top:4px;border-top:1px solid #25323e;padding-top:4px"><span>${t('cartel_mix_purity')}</span><span class="amt" style="color:#7bc8f2">${mixPurity.toFixed(1)}%</span></div>
                        <div class="line" style="padding:0"><span>${t('cartel_final_purity')}</span><span class="amt" style="color:#a0d6a0">${targetPurity}%</span></div>
                        <div style="font-size:.75rem;margin-top:4px">${fillerStatus}</div>
                    </div>
                    <div class="rep-box" style="border-left-color:#f0b36a;background:#1c1f26;padding:6px;margin-top:4px">
                        <div style="font-size:.8rem;color:#cbd8e6;font-weight:600">${t('cartel_stipend')} <span style="color:#f0b36a">${t('approx')}${stipendWithPerk} ${t('currency')}</span></div>
                        <div style="font-size:.7rem;color:#8b9eb0">${t('cartel_stipend_base', {rep: reputation})}</div>
                    </div>
                    <div class="rep-box" style="padding:6px;margin-top:6px">
                        <div style="font-size:.8rem;color:#cbd8e6;font-weight:600">${t('cartel_rep_bonus')} <span style="color:${repColor}">+${actualRep} ${t('rep_points')}</span></div>
                        <div style="font-size:.7rem;color:#8b9eb0">${repDesc}</div>
                    </div>
                `;
            }
        }
    }
}
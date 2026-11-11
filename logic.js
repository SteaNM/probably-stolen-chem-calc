import { t, fmt, getMeasurementHtml, getGrade, calcReputation } from './utils.js';
import { RECIPES, DIFF_SETTINGS, BLENDER_LOSS, FINISHER_IMP } from './constants.js';
import { elements, getPortionRows, updateText } from './ui.js';

function getCartelRequirements(weekValue) {
    const week = Math.max(1, Math.floor(weekValue || 1));
    return {
        vials: 10 + (week - 1) * 5,
        purity: Math.min(70, 40 + (week - 1) * 5)
    };
}

function estimateCartelDelivery(requiredVials, targetPurity, extractPurity, extractAvailable, fillerAvailable, vialVolume) {
    if (extractPurity <= 0) return 0;

    const achievablePurity = Math.min(targetPurity, extractPurity);
    const extractPerVial = achievablePurity / extractPurity * vialVolume;
    const fillerPerVial = vialVolume - extractPerVial;
    const byExtract = Math.floor((extractAvailable + 1e-9) / extractPerVial);
    const byFiller = fillerPerVial > 1e-9
        ? Math.floor((fillerAvailable + 1e-9) / fillerPerVial)
        : requiredVials;
    return Math.max(0, Math.min(requiredVials, byExtract, byFiller));
}

function getCartelReputationHtml(requiredPurity, actualPurity, requiredVials, deliveredVials) {
    const result = calcReputation(requiredPurity, actualPurity, requiredVials, deliveredVials);
    const color = result.gameOver
        ? '#f87171'
        : result.total > 10 ? '#7bc8f2' : '#a0d6a0';
    const value = result.gameOver
        ? t('cartel_game_over')
        : `${result.total >= 0 ? '+' : ''}${result.total} ${t('rep_points')}`;
    const detail = t('cartel_rep_breakdown', {
        count: result.count,
        purity: result.purity
    });

    return `<div class="rep-box" style="padding:6px;margin-top:6px"><div style="font-size:.8rem;color:#cbd8e6;font-weight:600">${t('cartel_rep_bonus')} <span style="color:${color}">${value}</span></div><div style="font-size:.7rem;color:#8b9eb0">${detail}</div></div>`;
}

function getCartelStipendHtml(reputation) {
    const stipend = 150 + 4 * reputation;
    return `<div class="rep-box" style="border-left-color:#f0b36a;background:#1c1f26;padding:6px;margin-top:4px"><div style="font-size:.8rem;color:#cbd8e6;font-weight:600">${t('cartel_stipend')} <span style="color:#f0b36a">${t('approx')}${stipend} ${t('currency')}</span></div><div style="font-size:.7rem;color:#8b9eb0">${t('cartel_stipend_base', {rep: reputation})}</div></div>`;
}

function normalizeNumberInput(input) {
    const fallback = input.id === 'purityInputValue' ? 100 : 0;
    const min = input.min === '' ? -Infinity : Number(input.min);
    const max = input.max === '' ? Number.MAX_SAFE_INTEGER : Number(input.max);
    const step = input.step === '' ? 1 : Number(input.step);
    let value = input.value === '' ? fallback : Number(input.value);

    if (!Number.isFinite(value)) value = fallback;
    value = Math.max(min, Math.min(max, value));

    if (Number.isFinite(step) && step > 0) {
        const stepBase = Number.isFinite(min) ? min : 0;
        const steppedValue = stepBase + Math.round((value - stepBase) / step) * step;
        value = Number.isFinite(steppedValue) ? steppedValue : max;
        value = Math.max(min, Math.min(max, value));
    }

    value = Number(value.toFixed(10));
    const originalValue = input.value === '' ? NaN : Number(input.value);
    return { value, changed: !Number.isFinite(originalValue) || value !== originalValue };
}

function getInputLabel(input) {
    return input.labels?.[0]?.textContent.trim()
        || input.closest('.scanner-card, .modcard, .cost-input, .field')
            ?.querySelector('label, h4')?.textContent.trim()
        || input.id;
}

function showInputCorrections(adjustedInputs) {
    if (adjustedInputs.length === 0) return;

    const notice = document.createElement('div');
    notice.className = 'warn';
    notice.textContent = t('warn_invalid_input', { fields: adjustedInputs.join(', ') });
    elements.warnEl.appendChild(notice);
}

function getPortionData(index, numericValues) {
    const values = {};
    ['mush', 'protein', 'fat', 'reducing', 'caffeine'].forEach(key => {
        values[key] = numericValues.get(`portion_${index}_${key}`) || 0;
    });
    return {
        values,
        count: numericValues.get(`portion_${index}_count`) || 1
    };
}

function updatePortionedText(id, rows, amountForBatch, { wholeMlOnly = false, alcoholStrength = 1 } = {}) {
    const rowAmounts = rows.map((row, index) => {
        const amount = amountForBatch(row, index);
        const measuredAmount = wholeMlOnly ? Math.ceil(amount - 1e-9) : amount;
        return { count: row.count, amount, measuredAmount };
    });
    const total = rowAmounts.reduce((sum, row) => sum + row.amount * row.count, 0);
    const rowHtml = rowAmounts.map((row, index) => {
        const perBatch = row.measuredAmount;
        const amountText = wholeMlOnly ? String(perBatch) : fmt(perBatch);
        const measurement = wholeMlOnly
            ? getMeasurementHtml(perBatch, { wholeMlOnly: true })
            : getMeasurementHtml(perBatch);
        const label = wholeMlOnly
            ? t('alcohol_portion_line', {
                number: index + 1,
                amount: amountText,
                pureAmount: fmt(perBatch * alcoholStrength),
                count: row.count
            })
            : t('portion_instruction_line', {
            number: index + 1,
            count: row.count,
            amount: fmt(perBatch),
            total: fmt(row.amount * row.count)
        });
        return `<span>${label}${measurement}</span>`;
    });

    const summary = wholeMlOnly
        ? [
            `<span>${t('alcohol_all_at_once', {
                amount: Math.ceil(total - 1e-9),
                pureAmount: fmt(Math.ceil(total - 1e-9) * alcoholStrength)
            })}${getMeasurementHtml(total, { wholeMlOnly: true })}</span>`,
            `<span>${t('alcohol_reused', {
                amount: Math.ceil(Math.max(0, ...rowAmounts.map(row => row.amount)) - 1e-9),
                pureAmount: fmt(Math.ceil(Math.max(0, ...rowAmounts.map(row => row.amount)) - 1e-9) * alcoholStrength)
            })}${getMeasurementHtml(Math.max(0, ...rowAmounts.map(row => row.amount)), { wholeMlOnly: true })}</span>`
        ]
        : [`<span>${t('instruction_total')}: ${fmt(total)} ${t('label_ml')}${getMeasurementHtml(total)}</span>`];

    updateText(id, [...rowHtml, ...summary].join(''));
}

export function updateAll(event) {
    elements.warnEl.innerHTML = '';
    elements.errEl.textContent = '';

    const numericValues = new Map();
    const adjustedInputs = [];
    document.querySelectorAll('.calc input[type="number"]').forEach(input => {
        const { value, changed } = normalizeNumberInput(input);
        numericValues.set(input.id, value);

        if (changed) {
            adjustedInputs.push(getInputLabel(input));
            if (event?.type === 'change') input.value = String(value);
        }
    });

    const id = elements.recipeSel.value;
    const r = RECIPES[id];
    const usesAlcohol = ['dream_dust', 'nightmare_dust', 'caffeine_pill', 'nomore_injector'].includes(id);
    elements.portionTotals.style.display = usesAlcohol ? 'block' : 'none';
    
    const hasCartel = (id === 'dream_dust' || id === 'nomore_injector');
    if (hasCartel) {
        elements.mainGrid.classList.remove('no-cartel');
        elements.cartelBox.style.display = 'block';
    } else {
        elements.mainGrid.classList.add('no-cartel');
        elements.cartelBox.style.display = 'none';
    }
    
    elements.mushCostWrapper.style.display = (id === 'phanta_pill') ? 'none' : 'block';

    const batchRows = usesAlcohol
        ? getPortionRows().map((row, index) => getPortionData(index, numericValues))
        : [];
    const inputs = {};
    if (usesAlcohol) {
        ['mush', 'protein', 'fat', 'reducing', 'caffeine'].forEach(key => {
            inputs[key] = batchRows.reduce(
                (sum, row) => sum + row.values[key] * row.count,
                0
            );
        });
    } else {
        ['methylol', 'stab'].forEach(key => {
            const value = numericValues.get(`scan_${key}`);
            if (value !== undefined) inputs[key] = value;
        });
    }

    const portionFields = [
        { key: 'mush', label: id === 'nightmare_dust' ? t('input_mush_nightmare') : id === 'caffeine_pill' ? t('input_mush_coffee') : t('input_mush') },
        { key: 'protein', label: id === 'caffeine_pill' ? t('input_protein_coffee') : t('input_protein') },
        ...(id === 'caffeine_pill' ? [{ key: 'fat', label: t('input_fat') }] : []),
        ...(id === 'caffeine_pill' ? [{ key: 'caffeine', label: t('input_caffeine_in_beans') }] : []),
        ...(id === 'nomore_injector' ? [{ key: 'reducing', label: t('input_reducing') }] : [])
    ];
    if (usesAlcohol) {
        elements.portionTotals.textContent = `${t('portion_total_label')} ${portionFields
            .map(field => `${field.label}: ${fmt(inputs[field.key])} ${t('label_ml')}`)
            .join(' · ')}`;
    }

    const fm = numericValues.get('mod_packer') || 0;
    const hm = numericValues.get('mod_heater') || 0;
    const bm = numericValues.get('mod_blender') || 0;
    
    const alcPct = parseFloat(elements.alcoholType.value) || 0.7;
    updateText('label-alcohol', t(alcPct < 1 ? 'label_diluted_alcohol' : 'label_pure_alcohol'));
    const diffKey = elements.difficulty.value;
    const diffConfig = DIFF_SETTINGS[diffKey];

    const purityInput = document.getElementById('purityInputValue');
    const basePurity = purityInput ? numericValues.get('purityInputValue') : 100;
    const totalPaste = inputs.mush || 0;

    const extractPurity = basePurity * (1 - FINISHER_IMP[Math.min(fm, 4)]);
    const purePurity = id === 'nomore_injector' ? extractPurity * 0.6 : extractPurity;
    const g = getGrade(purePurity);
    
    const rawMushCost = id === 'phanta_pill' ? 0 : numericValues.get('totalMushCost');
    const chemCountUsed = numericValues.get('useChemCount');
    const restrictedCountUsed = numericValues.get('useRestrictedCount');

    let totalExtract = 0;
    let lossPct = BLENDER_LOSS[Math.min(bm, 4)];
    const usableProtein = (inputs.protein || 0) * (1 - lossPct);
    const usableBeanCaffeine = (inputs.caffeine || 0) * (1 - lossPct);
    const blenderProteinLines = inputs.protein > 0
        ? `<br>${t('pipe_blender_protein_lost')} <b style="color:#f87171">−${fmt(inputs.protein * lossPct)} ${t('pipe_ml')}</b><br>${t('pipe_protein_after_blender')} <b>${fmt(usableProtein)} ${t('pipe_ml')}</b>`
        : '';
    const blenderCaffeineLines = id === 'caffeine_pill' && inputs.caffeine > 0
        ? `<br>${t('pipe_caffeine_from_beans')} <b>${fmt(inputs.caffeine)} ${t('pipe_ml')}</b><br>${t('pipe_blender_caffeine_lost')} <b style="color:#f87171">−${fmt(inputs.caffeine * lossPct)} ${t('pipe_ml')}</b><br>${t('pipe_caffeine_after_blender')} <b>${fmt(usableBeanCaffeine)} ${t('pipe_ml')}</b>`
        : '';
    let isCraftable = true;
    let errorMsg = '';
    let dreamExtractTotal = 0;
    let extractForCartel = 0;
    let extractForNomore = 0;
    let effectiveExtract = 0;

    // --- ОБНОВЛЕНИЕ КОНВЕЙЕРА С ДИНАМИЧЕСКИМ СБРОСОМ ---
    if (id === 'dream_dust' || id === 'nightmare_dust' || id === 'caffeine_pill') {
        const rawPaste = inputs.mush;
        if (rawPaste <= 0) {
            errorMsg = t('error_no_paste');
            elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_paste')} <b>0 ${t('pipe_ml')}</b><br>${t('pipe_blender_lost')} (${bm} ${t('pipe_mod')}) ${t('pipe_loses')} ${(lossPct * 100)}%: <b style="color:#f87171">−0 ${t('pipe_ml')}</b><br>${t('pipe_left')} <b>0 ${t('pipe_ml')}</b><br>${t('pipe_extract')} (${r.extractYield * 100}%): <b style="color:#a0d6a0">0 ${t('pipe_ml')}</b>`;
        } else {
            const lostAmount = rawPaste * lossPct;
            const usablePaste = rawPaste - lostAmount;
            totalExtract = usablePaste * r.extractYield + (id === 'caffeine_pill' ? usableBeanCaffeine : 0);
            const extractLabel = id === 'caffeine_pill' ? t('pipe_coffee_extract') : `${t('pipe_extract')} (${r.extractYield * 100}%)`;
            elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_paste')} <b>${fmt(rawPaste)} ${t('pipe_ml')}</b><br>${t('pipe_blender_lost')} (${bm} ${t('pipe_mod')}) ${t('pipe_loses')} ${(lossPct * 100)}%: <b style="color:#f87171">−${fmt(lostAmount)} ${t('pipe_ml')}</b><br>${t('pipe_left')} <b>${fmt(usablePaste)} ${t('pipe_ml')}</b>${blenderProteinLines}${blenderCaffeineLines}<br>${extractLabel} <b style="color:#a0d6a0">${fmt(totalExtract)} ${t('pipe_ml')}</b>`;
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
            
            const { vials: reqVials, purity: reqPurity } = getCartelRequirements(numericValues.get('cartelWeek'));
            const mode = elements.cartelMode.value;
            let targetPurity = reqPurity;
            if (mode === 'bonus') targetPurity += 10;
            
            extractForCartel = (targetPurity / extractPurity) * (reqVials * 2);
            extractForNomore = Math.max(0, dreamExtractTotal - extractForCartel);
            
            const reducing = inputs.reducing;
            if (reducing <= 0) {
                errorMsg = t('error_no_reducing');
                elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_paste')} <b>${fmt(rawPaste)} ${t('pipe_ml')}</b><br>${t('pipe_blender_lost')} (${bm} ${t('pipe_mod')}) ${t('pipe_loses')} ${(lossPct * 100)}%: <b style="color:#f87171">−${fmt(lostAmount)} ${t('pipe_ml')}</b><br>${t('pipe_left')} <b>${fmt(usablePaste)} ${t('pipe_ml')}</b>${blenderProteinLines}<br>${t('pipe_dream_extract')} <b style="color:#7bc8f2">${fmt(dreamExtractTotal)} ${t('pipe_ml')}</b><br>${t('pipe_left_nomore')} <b style="color:#a0d6a0">${fmt(extractForNomore)} ${t('pipe_ml')}</b>`;
            } else {
                effectiveExtract = Math.min(extractForNomore, reducing);
                if (reducing < extractForNomore) {
                    elements.warnEl.innerHTML = `<div class="warn">${t('warn_lack_reducing')} ${fmt(extractForNomore)} ${t('warn_lack_reducing_2')} ${fmt(extractForNomore)} ${t('warn_lack_reducing_3')} ${fmt(reducing)} ${t('warn_lack_reducing_4')}</div>`;
                } else {
                    elements.warnEl.innerHTML = '';
                }
                totalExtract = effectiveExtract * 0.6;
                elements.pipelineBox.innerHTML = `<b>${t('pipe_title')}</b><br>${t('pipe_paste')} <b>${fmt(rawPaste)} ${t('pipe_ml')}</b><br>${t('pipe_blender_lost')} (${bm} ${t('pipe_mod')}) ${t('pipe_loses')} ${(lossPct * 100)}%: <b style="color:#f87171">−${fmt(lostAmount)} ${t('pipe_ml')}</b><br>${t('pipe_left')} <b>${fmt(usablePaste)} ${t('pipe_ml')}</b>${blenderProteinLines}<br>${t('pipe_dream_extract')} <b style="color:#7bc8f2">${fmt(dreamExtractTotal)} ${t('pipe_ml')}</b><br>${hasCartel ? `${t('pipe_for_cartel')} <b style="color:#f0b36a">${fmt(extractForCartel)} ${t('pipe_ml')}</b><br>` : ''}${t('pipe_left_nomore')} <b style="color:#a0d6a0">${fmt(extractForNomore)} ${t('pipe_ml')}</b><br>${t('pipe_nomore')} <b style="color:#a0d6a0">${fmt(totalExtract)} ${t('pipe_ml')}</b>`;
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

    if (usesAlcohol) {
        const alcoholRatio = id === 'nomore_injector' ? 5 : r.alcoholRatio;

        updatePortionedText('amt-alc', batchRows, (row) =>
            row.values.mush * (1 - lossPct) * alcoholRatio / alcPct,
        { wholeMlOnly: true, alcoholStrength: alcPct });
        updatePortionedText('amt-prot', batchRows, (row) => row.values.protein * (1 - lossPct));

        if (id === 'caffeine_pill') {
            updatePortionedText('amt-fat', batchRows, (row) => row.values.fat * 0.125);
        } else if (id === 'nomore_injector') {
            const rawNomoreTotal = batchRows.reduce(
                (sum, row) => sum + row.values.mush * (1 - lossPct) * 0.5 * row.count,
                0
            );
            const remainingRatio = rawNomoreTotal > 0
                ? Math.max(0, extractForNomore) / rawNomoreTotal
                : 0;
            const extractPerBatch = (row) =>
                row.values.mush * (1 - lossPct) * 0.5 * remainingRatio;
            const actualPerBatch = (row) => {
                const batchAllocation = extractPerBatch(row);
                const reductionRatio = extractForNomore > 0
                    ? Math.min(1, effectiveExtract / extractForNomore)
                    : 0;
                return batchAllocation * reductionRatio;
            };
            updatePortionedText('amt-ext', batchRows, actualPerBatch);
            updatePortionedText('amt-red', batchRows, actualPerBatch);
            updatePortionedText('amt-agent', batchRows, (row) => actualPerBatch(row) * 0.333);
        }
    } else if (id === 'phanta_pill') {
        const stabilizer = inputs.stab || 0;
        const methylolReduction = (inputs.methylol || 0) * 0.75;
        updateText('amt-stab', `${fmt(stabilizer)} ${t('label_ml')}` + getMeasurementHtml(stabilizer));
        updateText('amt-red', `${fmt(methylolReduction)} ${t('label_ml')}` + getMeasurementHtml(methylolReduction));
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
        if (hasCartel) {
            elements.cartelResult.innerHTML = getCartelStipendHtml(numericValues.get('cartelRep') || 0);
        }
        showInputCorrections(adjustedInputs);
        return;
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
        const qualityPercentText = `${g.m >= 0 ? '+' : ''}${(g.m * 100).toFixed(0)}%`;
        const qualityBonusText = `${qualityBonus >= 0 ? '+' : '−'}${Math.abs(qualityBonus).toFixed(1)}`;
        const afterQuality = base + qualityBonus;
        const contrabandBonus = afterQuality * r.contrabandMarkup;
        const marketMarkup = diffConfig.markup - 1;
        const diffBonus = afterQuality * marketMarkup;
        const finalPrice = afterQuality * (1 + r.contrabandMarkup + marketMarkup);
        const pricePerItem = Math.round(finalPrice);
        const totalRevenue = pricePerItem * totalItems;
        const netProfit = totalRevenue - totalCost;
        
        revenueHTML = `
            <div class="sale-box">
                <div style="font-size:.85rem;color:#cbd8e6;font-weight:600;margin-bottom:6px">${t('price_per_item')}</div>
                <div class="sale-line"><span>${t('base_price')}</span><span>${base} ${t('currency')}</span></div>
                <div class="sale-line"><span>${t('quality_bonus')} (${qualityPercentText})</span><span style="color:${qualityBonus >= 0 ? '#7bc8f2' : '#f87171'}">${qualityBonusText} ${t('currency')}</span></div>
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
        const starch = numericValues.get('scan_starch');
        const sugar = numericValues.get('scan_sugar');
        const totalRawFiller = starch + sugar;
        const usableFiller = totalRawFiller * (1 - lossPct);
        elements.fillerInfo.innerHTML = `📥 <b>${t('cartel_filler')}:</b> ${fmt(totalRawFiller)} ${t('label_ml')} → ${t('after_blender')}: <b style="color:#f0b36a">${fmt(usableFiller)} ${t('label_ml')}</b>`;
        
        const { vials: reqVials, purity: reqPurity } = getCartelRequirements(numericValues.get('cartelWeek'));
        const reputation = numericValues.get('cartelRep') || 0;
        const mode = elements.cartelMode.value;
        let targetPurity = reqPurity;
        if (mode === 'bonus') targetPurity += 10;

        if (id === 'dream_dust') {
            if (totalExtract <= 0) {
                elements.cartelResult.innerHTML = `<div class="warn">${t('error_no_extract')}</div>${getCartelStipendHtml(reputation)}${getCartelReputationHtml(reqPurity, 0, reqVials, 0)}`;
            } else if (purePurity < targetPurity) {
                const deliveredVials = estimateCartelDelivery(reqVials, targetPurity, purePurity, totalExtract, usableFiller, r.outputMl);
                elements.cartelResult.innerHTML = `<div class="warn">⚠️ ${purePurity.toFixed(0)}% < ${targetPurity}%</div>${getCartelStipendHtml(reputation)}${getCartelReputationHtml(reqPurity, purePurity, reqVials, deliveredVials)}`;
            } else {
                const totalMixNeeded = reqVials * r.outputMl;
                const extractForCartelVal = (targetPurity / purePurity) * totalMixNeeded;
                const fillerNeeded = totalMixNeeded - extractForCartelVal;
                
                if (extractForCartelVal > totalExtract) {
                    const deliveredVials = estimateCartelDelivery(reqVials, targetPurity, purePurity, totalExtract, usableFiller, r.outputMl);
                    elements.cartelResult.innerHTML = `<div class="warn" style="border-color:#f87171">${t('cartel_not_enough_extract')}</div>${getCartelStipendHtml(reputation)}${getCartelReputationHtml(reqPurity, targetPurity, reqVials, deliveredVials)}`;
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
                    
                    const deliveredVials = estimateCartelDelivery(
                        reqVials,
                        targetPurity,
                        purePurity,
                        totalExtract,
                        usableFiller,
                        r.outputMl
                    );
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
                        ${getCartelStipendHtml(reputation)}
                        ${getCartelReputationHtml(reqPurity, targetPurity, reqVials, deliveredVials)}
                        <div style="font-size:.75rem;color:#8b9eb0;margin-top:8px;background:#1a232e;padding:6px;border-radius:6px">
                            ${t('cartel_paste_usage_text', {cartel: fmt(rawMushForCartel), sell: fmt(rawMushRemaining)})}
                        </div>
                    `;
                }
            }
        } else if (id === 'nomore_injector') {
            if (dreamExtractTotal <= 0) {
                elements.cartelResult.innerHTML = `<div class="warn">${t('error_no_extract')}</div>${getCartelStipendHtml(reputation)}${getCartelReputationHtml(reqPurity, 0, reqVials, 0)}`;
            } else if (extractForCartel > dreamExtractTotal) {
                const deliveredVials = estimateCartelDelivery(reqVials, targetPurity, extractPurity, dreamExtractTotal, usableFiller, 2);
                elements.cartelResult.innerHTML = `<div class="warn" style="border-color:#f87171">${t('cartel_not_enough_extract')}</div>${getCartelStipendHtml(reputation)}${getCartelReputationHtml(reqPurity, Math.min(targetPurity, extractPurity), reqVials, deliveredVials)}`;
            } else {
                const mixNeededForCartel = reqVials * 2;
                const fillerNeeded = mixNeededForCartel - extractForCartel;
                const extractForNomoreVal = dreamExtractTotal - extractForCartel;
                const convertedExtract = Math.min(extractForNomoreVal, inputs.reducing);
                const pureNomoreVolume = convertedExtract * 0.6;
                const saleItems = Math.floor(pureNomoreVolume / r.outputMl);
                
                let fillerStatus = usableFiller >= fillerNeeded
                    ? `<span style="color:#a0d6a0">${t('cartel_filler_status_ok', {amount: fmt(usableFiller - fillerNeeded)})}</span>`
                    : `<span style="color:#f87171">${t('cartel_filler_status_bad', {amount: fmt(fillerNeeded - usableFiller)})}</span>`;
                
                const deliveredVials = estimateCartelDelivery(
                    reqVials,
                    targetPurity,
                    extractPurity,
                    dreamExtractTotal,
                    usableFiller,
                    2
                );
                const mixPurity = targetPurity / (1 - FINISHER_IMP[Math.min(fm, 4)]);
                
                elements.cartelResult.innerHTML = `
                    <div style="font-size:.85rem;color:#cbd8e6;margin-bottom:8px">${t('cartel_turn_in_text', {vials: reqVials, purity: targetPurity})}</div>
                    <div style="background:#1e2a35;border-radius:6px;margin-bottom:8px;padding:8px">
                        <div style="font-size:.8rem;color:#a0d6a0;font-weight:600;margin-bottom:2px">${t('cartel_leave_nomore')}</div>
                        <div class="line" style="padding:0"><span>${t('cartel_raw_extract')}</span><span class="amt" style="color:#a0d6a0">${t('cartel_extract_amount_text', {amount: fmt(convertedExtract)})}</span></div>
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
                    ${getCartelStipendHtml(reputation)}
                    ${getCartelReputationHtml(reqPurity, targetPurity, reqVials, deliveredVials)}
                `;
            }
        }

    }

    showInputCorrections(adjustedInputs);
}
import { TRANSLATIONS } from './translations.js';

let currentLang = 'ru';

export const setLang = (lang) => { currentLang = lang; };
export const getLang = () => currentLang;

export const t = (key, params = {}) => {
    let str = TRANSLATIONS[currentLang][key] || key;
    for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`{${k}}`, 'g'), v);
    }
    return str;
};

export function fmt(v) {
    if (v === 0) return '0';
    const rounded = Number(v.toFixed(2));
    if (rounded === 0) return '<0.01';
    return String(rounded);
}

function getPrecisionDilutionHtml(amount, substance) {
    const totalHundredths = Math.round(amount * 100);
    const remainderHundredths = totalHundredths % 10;
    if (remainderHundredths === 0) return '';

    const remainder = remainderHundredths / 100;
    const denominator = 100;
    let divisor = remainderHundredths;
    let other = denominator;
    while (other !== 0) {
        [divisor, other] = [other, divisor % other];
    }

    const solutionVolume = denominator / divisor;
    const reagentVolume = remainderHundredths / divisor;
    const waterVolume = solutionVolume - reagentVolume;
    const instructions = t('dilution_prepare', {
        water: waterVolume,
        reagent: reagentVolume,
        substance
    });

    return `<details class="precision-dilution"><summary>${t('dilution_title', {amount: fmt(remainder)})}</summary><div class="precision-dilution-content">${t('dilution_intro', {instructions})}</div></details>`;
}

export function getMeasurementHtml(amount, {
    wholeMlOnly = false,
    precisionLabel,
    showDilutionGuide = true
} = {}) {
    if (!amount || amount <= 0) return '';
    const amountHundredths = Math.round(amount * 100);
    let rem = wholeMlOnly
        ? Math.ceil(amount - 1e-9)
        : precisionLabel
            ? Math.floor(amountHundredths / 10) / 10
            : Math.round(amount * 10) / 10;
    let integerPart = Math.floor(rem);
    const fractionalPart = Math.round((rem - integerPart) * 10) / 10;
    const flasks = [];
    const pipettes = [];

    for (const size of [100, 50, 25]) {
        const count = Math.floor(integerPart / size);
        if (count > 0) flasks.push(`${count}×${size}${t('label_ml')}`);
        integerPart %= size;
    }

    for (const size of [5, 1]) {
        const count = Math.floor(integerPart / size);
        if (count > 0) pipettes.push(`${count}×${size}${t('label_ml')}`);
        integerPart %= size;
    }

    let pills = [];
    if (!wholeMlOnly) {
        let tempFrac = fractionalPart;
        let c06 = Math.floor(tempFrac / 0.6);
        if (c06 > 0) { pills.push(`${c06}×${t('pill_zyanide')}`); tempFrac = Math.round((tempFrac - c06 * 0.6) * 10) / 10; }
        let c05 = Math.floor(tempFrac / 0.5);
        if (c05 > 0) { pills.push(`${c05}×${t('pill_phanta')}`); tempFrac = Math.round((tempFrac - c05 * 0.5) * 10) / 10; }
        let c01 = Math.round(tempFrac / 0.1);
        if (c01 > 0) pills.push(`${c01}×${t('pill_birth')}`);
    }
    
    let res = '';
    if (flasks.length > 0) {
        res += `<span style="color:#a0d6a0">${t('flasks')}</span> <span style="color:#f0b36a">${flasks.join(' + ')}</span>`;
    }

    if (pipettes.length > 0) {
        if (res) res += ` <span style="color:#4a6a52">|</span> `;
        res += `<span style="color:#a0d6a0">${t('pipettes')}</span> <span style="color:#f0b36a">${pipettes.join(' + ')}</span>`;
    }
    
    if (pills.length > 0) {
        if (res) res += ` <span style="color:#4a6a52">|</span> `;
        res += `<span style="color:#a0d6a0">${t('pills')}</span> <span style="color:#f0b36a">${pills.join(' + ')}</span>`;
    }
    
    const measurement = res ? `<span class="pill-text">${res}</span>` : '';
    const dilution = precisionLabel && showDilutionGuide
        ? getPrecisionDilutionHtml(amount, precisionLabel)
        : '';
    return measurement + dilution;
}

export function getGrade(p) {
    if (p >= 99) return { n: t('grade_pure'), c: '#a050a0', m: 1.35 };
    if (p >= 90) return { n: t('grade_pharma'), c: '#c05070', m: 0.85 };
    if (p >= 80) return { n: t('grade_near'), c: '#d898b0', m: 0.40 };
    if (p >= 60) return { n: t('grade_street'), c: '#706080', m: 0 };
    if (p >= 45) return { n: t('grade_cut'), c: '#b06040', m: -0.45 };
    if (p >= 30) return { n: t('grade_junk'), c: '#e07050', m: -0.75 };
    return { n: t('grade_starch'), c: '#f0a070', m: -0.95 };
}

export function calcReputation(targetPurity, actualPurity, requiredCount, deliveredCount) {
    if (deliveredCount <= 0 || actualPurity <= targetPurity / 4) {
        return { gameOver: true, count: 0, purity: 0, total: 0 };
    }

    const count = deliveredCount < requiredCount
        ? (deliveredCount - requiredCount) * 4
        : deliveredCount;
    let purity = 0;

    if (actualPurity < targetPurity) purity = -(targetPurity - actualPurity);
    else if (actualPurity <= targetPurity + 10) purity = actualPurity - targetPurity;
    else purity = 10 + Math.floor((actualPurity - targetPurity - 10) / 4);

    return { gameOver: false, count, purity, total: count + purity };
}

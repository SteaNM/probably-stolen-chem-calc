import { TRANSLATIONS } from './translations.js';
import { DIFF_SETTINGS } from './constants.js';

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
    if (v < 0.01) return v.toFixed(4);
    if (v < 0.1) return v.toFixed(3);
    if (v < 1) return v.toFixed(2);
    if (v < 10) return v.toFixed(2);
    return v.toFixed(1);
}

export function getMeasurementHtml(amount) {
    if (!amount || amount <= 0) return '';
    let rem = Math.round(amount * 10) / 10, integerPart = Math.floor(rem), fractionalPart = Math.round((rem - integerPart) * 10) / 10;
    let beakers = [];
    if (integerPart >= 50) { let c = Math.floor(integerPart / 50); beakers.push(`${c}×50${t('label_ml')}`); integerPart %= 50; }
    if (integerPart >= 25) { let c = Math.floor(integerPart / 25); beakers.push(`${c}×25${t('label_ml')}`); integerPart %= 25; }
    if (integerPart >= 5) { let c = Math.floor(integerPart / 5); beakers.push(`${c}×5${t('label_ml')}`); integerPart %= 5; }
    if (integerPart >= 1) beakers.push(`${integerPart}×1${t('label_ml')}`);
    
    let pills = [], tempFrac = fractionalPart;
    let c06 = Math.floor(tempFrac / 0.6);
    if (c06 > 0) { pills.push(`${c06}×${t('pill_zyanide')}`); tempFrac = Math.round((tempFrac - c06 * 0.6) * 10) / 10; }
    let c05 = Math.floor(tempFrac / 0.5);
    if (c05 > 0) { pills.push(`${c05}×${t('pill_phanta')}`); tempFrac = Math.round((tempFrac - c05 * 0.5) * 10) / 10; }
    let c01 = Math.round(tempFrac / 0.1);
    if (c01 > 0) pills.push(`${c01}×${t('pill_birth')}`);
    
    let res = '';
    if (beakers.length > 0) res += `<span style="color:#a0d6a0">${t('beakers')}</span> ${beakers.join(' + ')}`;
    if (pills.length > 0) {
        if (res) res += ` <span style="color:#4a3622">|</span> `;
        res += `<span style="color:#f0b36a">${t('pills')}</span> ${pills.join(' + ')}`;
    }
    if (!res) return '';
    return `<span class="pill-text">${res}</span>`;
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

export function calcReputation(targetPurity, actualPurity, diffKey) {
    let baseRep = 0;
    if (actualPurity < targetPurity) baseRep = -(targetPurity - actualPurity);
    else if (actualPurity === targetPurity) baseRep = 0;
    else if (actualPurity <= targetPurity + 10) baseRep = actualPurity - targetPurity;
    else { const bonus10 = 10, excess = actualPurity - (targetPurity + 10); baseRep = bonus10 + Math.floor(excess / 4); }
    const diff = DIFF_SETTINGS[diffKey];
    if (baseRep > 0) return Math.floor(baseRep * diff.repGain);
    if (baseRep < 0) return Math.ceil(baseRep * diff.repLoss);
    return 0;
}
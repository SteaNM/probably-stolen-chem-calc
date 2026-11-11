export const RECIPES = {
    dream_dust: { outputMl: 2, unitKey: 'unit_vials', isBlendable: true, extractYield: 0.5, alcoholRatio: 5, baseValue: 18, contrabandMarkup: 0.70 },
    nightmare_dust: { outputMl: 4, unitKey: 'unit_vials', isBlendable: true, extractYield: 0.5, alcoholRatio: 5, baseValue: 36, contrabandMarkup: 1.00 },
    caffeine_pill: { outputMl: 5, unitKey: 'unit_pills', isBlendable: true, extractYield: 0.75, alcoholRatio: 0.75, baseValue: 10, contrabandMarkup: 0 },
    phanta_pill: { outputMl: 0.5, unitKey: 'unit_pills', isBlendable: false, extractYield: 0.1, baseValue: 12, contrabandMarkup: 1.00 },
    nomore_injector: { outputMl: 4, unitKey: 'unit_injectors', isBlendable: true, extractYield: 0.5, baseValue: 50, contrabandMarkup: 0 }
};

export const DIFF_SETTINGS = {
    easy: { markup: 1.20 },
    normal: { markup: 1.15 },
    hard: { markup: 1.00 },
    extreme: { markup: 1.00 }
};

export const BLENDER_LOSS = [0.35, 0.20, 0.10, 0.05, 0.00];
export const FINISHER_IMP = [0.12, 0.06, 0.03, 0.01, 0.00];
export const HEATER_SETTINGS = [
    'module_heater_99_fixed',
    'module_heater_160_fixed',
    'module_heater_adjustable',
    'module_heater_4x_speed',
    'module_heater_16x_speed'
];
export const MIN_HEATER_MODULES = 1;
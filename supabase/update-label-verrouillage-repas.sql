-- Corrige le libellé affiché dans Paramètres pour refléter la règle « clôture la veille ».
-- (Le champ reste une heure paramétrable ; l'ancien libellé laissait croire à un verrouillage le jour même.)
UPDATE public.app_settings
SET label = 'Heure de clôture la veille des inscriptions repas (un jour se ferme la veille à cette heure)'
WHERE key = 'verrouillage_repas';

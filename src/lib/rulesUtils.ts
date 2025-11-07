import { Rule } from '@/types/Rule';

/**
 * Retourne la règle la plus récente selon updated_at ou created_at
 */
export const getMostRecentRule = (rules: Rule[]): Rule | null => {
  if (!rules.length) return null;

  return [...rules].sort((a, b) => {
    const dateA = new Date(a.updated_at ?? a.created_at).getTime();
    const dateB = new Date(b.updated_at ?? b.created_at).getTime();
    return dateB - dateA; // décroissant
  })[0];
};

/**
 * Retourne un Record avec la règle la plus récente par service
 * ou uniquement pour un service spécifique si précisé
 */
export const getLatestRulesByService = (
    rules: Rule[],
    service?: Rule['service']
    ): Record<Rule['service'], Rule> | Rule => { 
        const grouped: Record<Rule['service'], Rule[]> = { dejeuner: [], diner: [] };

        rules.forEach((r) => grouped[r.service].push(r));

        if (service) {
            return getMostRecentRule(grouped[service])!;
        }

        return {
            dejeuner: getMostRecentRule(grouped.dejeuner)!,
            diner: getMostRecentRule(grouped.diner)!,
        };
};


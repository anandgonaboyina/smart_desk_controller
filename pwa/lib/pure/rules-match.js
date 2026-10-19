/**
 * rules-match.js — Pure rule matching and caption formatting.
 *
 * Purpose : Evaluate reactive rules (face expression, sound effect, caption)
 *           against incoming system events with priority and cooldown checking.
 * Depends : Nothing (pure JavaScript).
 * Used by : rules.js, useFace.js, useAudio.js.
 */

/**
 * Check if a rule is currently within its cooldown period.
 *
 * Example pairs:
 *   isRuleInCooldown({ cooldownMs: 5000 }, 6000, 2000) -> false (4000ms elapsed < 5000ms -> true!)
 *   isRuleInCooldown({ cooldownMs: 2000 }, 5000, 2000) -> false (3000ms elapsed >= 2000ms)
 *
 * @param {object} rule
 * @param {number} nowMs
 * @param {number} [lastFiredMs]
 * @returns {boolean} true if cooldown is active
 */
export function isRuleInCooldown(rule, nowMs, lastFiredMs = 0) {
  if (!rule || !rule.cooldownMs || !lastFiredMs) return false;
  const elapsed = Math.max(0, nowMs - lastFiredMs);
  return elapsed < rule.cooldownMs;
}

/**
 * Format a caption template safely without eval.
 * Replaces ${varName} with values from payload object.
 *
 * Example pairs:
 *   formatCaption("${name} turned ON", { name: "Monitor" }) -> "Monitor turned ON"
 *   formatCaption("Timer ended for relay ${relayIndex}", { relayIndex: 2 }) -> "Timer ended for relay 2"
 *
 * @param {string} template
 * @param {object} payload
 * @returns {string}
 */
export function formatCaption(template, payload = {}) {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    return payload[key] !== undefined ? String(payload[key]) : '';
  });
}

/**
 * Find all matching rules for an event, taking condition and cooldown into account.
 *
 * @param {Array<object>} rules          - List of rule objects
 * @param {string} eventType             - The event name (e.g. 'RELAY_TOGGLED')
 * @param {object} payload               - Event data payload
 * @param {number} nowMs                 - Current time in ms
 * @param {Map<string, number>|object} lastFiredMap - Map of rule.id -> last fired ms
 * @returns {Array<object>} Matching rules
 */
export function findMatchingRules(rules, eventType, payload = {}, nowMs = 0, lastFiredMap = {}) {
  if (!Array.isArray(rules)) return [];

  return rules.filter((rule) => {
    if (!rule || rule.event !== eventType) return false;

    // Check cooldown
    const lastFired = (lastFiredMap instanceof Map)
      ? (lastFiredMap.get(rule.id) || 0)
      : (lastFiredMap[rule.id] || 0);

    if (isRuleInCooldown(rule, nowMs, lastFired)) {
      return false;
    }

    // Check optional condition function or object
    if (typeof rule.condition === 'function') {
      try {
        if (!rule.condition(payload)) return false;
      } catch {
        return false;
      }
    } else if (rule.condition && typeof rule.condition === 'object') {
      for (const [key, val] of Object.entries(rule.condition)) {
        if (payload[key] !== val) return false;
      }
    }

    return true;
  });
}

/**
 * Select the highest priority rule among matching rules.
 * If priorities are equal, returns the first one.
 *
 * @param {Array<object>} matchingRules
 * @returns {object|null} The chosen rule, or null if none
 */
export function selectHighestPriorityRule(matchingRules) {
  if (!Array.isArray(matchingRules) || matchingRules.length === 0) return null;

  let best = matchingRules[0];
  let bestPriority = Number(best.priority || 0);

  for (let i = 1; i < matchingRules.length; i++) {
    const candidate = matchingRules[i];
    const prio = Number(candidate.priority || 0);
    if (prio > bestPriority) {
      best = candidate;
      bestPriority = prio;
    }
  }

  return best;
}

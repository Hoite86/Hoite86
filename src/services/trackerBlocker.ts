import { detectTrackingAttempt, detectTrackingScript, getTrackerIntel } from './trackerIntel';

export const shouldBlockRequest = (url: string): boolean => {
  const decision = detectTrackingAttempt(url);
  return decision.action === 'HARD_BLOCK';
};

export const trackerBlockingScript = `
(function() {
  const intel = ${JSON.stringify(getTrackerIntel())};

  const evaluate = (url) => {
    const text = (url || '').toLowerCase();
    try {
      const parsed = new URL(url, window.location.origin);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();
      const query = parsed.search.toLowerCase();

      if (intel.globalAllowExceptions.some((entry) => host === entry || host.endsWith('.' + entry))) {
        return { action: 'ALLOW', reason: 'allow_exception' };
      }

      if (intel.domainSuffixes.some((suffix) => host === suffix || host.endsWith('.' + suffix))) {
        return { action: intel.blockingMode === 'LOG_ONLY' ? 'LOG' : 'HARD_BLOCK', reason: 'domain_suffix' };
      }

      const heuristics = [
        intel.urlKeywords.some((keyword) => text.includes(keyword)),
        intel.pathKeywords.some((keyword) => path.includes(keyword)),
        intel.queryParamKeywords.some((keyword) => query.includes(keyword))
      ].filter(Boolean).length;

      if (heuristics === 0) {
        return { action: 'ALLOW', reason: 'none' };
      }

      if (intel.blockingMode === 'HARD_BLOCK') {
        return { action: heuristics >= 2 ? 'HARD_BLOCK' : 'SOFT_BLOCK', reason: 'heuristics' };
      }

      if (intel.blockingMode === 'SOFT_BLOCK') {
        return { action: 'SOFT_BLOCK', reason: 'heuristics' };
      }

      return { action: 'LOG', reason: 'heuristics' };
    } catch (_) {
      return { action: text.includes('track') ? 'SOFT_BLOCK' : 'ALLOW', reason: 'fallback' };
    }
  };

  const scriptLooksTracking = (content) => {
    const lower = (content || '').toLowerCase();
    return intel.scriptSignatures.some((sig) => lower.includes(sig.toLowerCase()));
  };

  const notify = (reason, value, action) =>
    window.ReactNativeWebView?.postMessage('Tracking [' + action + '] ' + reason + ': ' + value);

  const originalFetch = window.fetch;
  window.fetch = function(resource, config) {
    const url = typeof resource === 'string' ? resource : resource.url;
    const decision = evaluate(url);
    if (decision.action === 'HARD_BLOCK') {
      notify(decision.reason, url, decision.action);
      return Promise.resolve(new Response('', { status: 204 }));
    }
    if (decision.action === 'SOFT_BLOCK' || decision.action === 'LOG') {
      notify(decision.reason, url, decision.action);
    }
    return originalFetch(resource, config);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    const decision = evaluate(url);
    if (decision.action === 'HARD_BLOCK') {
      notify(decision.reason, url, decision.action);
      throw new Error('Blocked tracking request');
    }
    if (decision.action === 'SOFT_BLOCK' || decision.action === 'LOG') {
      notify(decision.reason, url, decision.action);
    }
    return originalOpen.apply(this, arguments);
  };

  const observer = new MutationObserver(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    scripts.forEach((script) => {
      const text = script.textContent || '';
      const src = script.src || '';
      const decision = evaluate(src);
      const looksLikeTracker = scriptLooksTracking(text);
      if ((decision.action === 'HARD_BLOCK' || looksLikeTracker) && script.parentNode) {
        notify('script', src || text.slice(0, 80), 'HARD_BLOCK');
        script.remove();
      } else if (decision.action === 'SOFT_BLOCK' || decision.action === 'LOG') {
        notify('script', src || text.slice(0, 80), decision.action);
      }
    });
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });
})();
true;
`;

export const evaluateTrackingConfidence = (url: string): number => {
  return detectTrackingAttempt(url).confidence;
};

export const evaluateTrackingScriptDecision = (content: string) => {
  return detectTrackingScript(content);
};

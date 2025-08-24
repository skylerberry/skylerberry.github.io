// js/discord-alert-parser.js
// Parses Discord-style trade alerts and returns { entry, stop, riskPct? } or throws Error.

export function parseDiscordAlert(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Paste an alert to import.');
  }

  const text = raw.trim();
  const toNum = (s) => {
    const clean = String(s).replace(/[, ]+/g, '');
    return Number(clean);
  };

  const entryRe = /^(?:\s)*(?:adding|add|starter)[^\n]*@\s*([\d,]+(?:\.\d+)?)/gim;
  const stopRe  = /^(?:\s)*(?:stop(?:\s*loss)?|sl)[^\n]*@\s*([\d,]+(?:\.\d+)?)/gim;
  const riskRe  = /^(?:\s)*(?:risk(?:ing)?)[^\d%]*?(\d+(?:\.\d+)?)\s*%?/gim;

  const entryMatch = entryRe.exec(text);
  const stopMatch  = stopRe.exec(text);
  const riskMatch  = riskRe.exec(text);

  const entry = entryMatch ? toNum(entryMatch[1]) : NaN;
  const stop  = stopMatch  ? toNum(stopMatch[1])  : NaN;
  const riskPct = riskMatch ? Number(riskMatch[1]) : undefined;

  if (!isFinite(entry)) throw new Error('Could not find a valid entry price.');
  if (!isFinite(stop))  throw new Error('Could not find a valid stop price.');
  if (!(stop < entry))  throw new Error('Stop must be below entry for long trades.');
  if (riskPct != null && !(riskPct >= 0 && riskPct <= 100)) {
    throw new Error('Risk% must be between 0 and 100.');
  }

  return { entry, stop, riskPct };
}

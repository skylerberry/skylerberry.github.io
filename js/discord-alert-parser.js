// Discord Alert Parser Module
// Parses Discord-style trade alerts and returns { entry, stop, riskPct? } or throws Error.

export function parseDiscordAlert(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Please paste a Discord alert first');
  }

  const text = rawText.trim();
  console.log('🔍 Parsing alert text:', text);

  // Helper function to convert string to number, removing commas
  const toNumber = (str) => {
    const cleaned = String(str).replace(/[, ]+/g, '');
    return parseFloat(cleaned);
  };

  // Helper function to extract and normalize ticker
  const extractTicker = (text) => {
    // Look for $TICKER pattern
    const tickerMatch = text.match(/\$([A-Z0-9.-]+)/i);
    if (tickerMatch) {
      return tickerMatch[1].toUpperCase();
    }
    return null;
  };

  // More flexible regex patterns to match various Discord alert formats
  const patterns = [
    // Pattern 1: Standard format
    {
      entry: /(?:adding|add|starter).*?(?:\$[A-Z]+)?.*?@\s*\$?([0-9,]+\.?[0-9]*)/i,
      stop: /(?:stop\s*(?:loss)?|sl).*?@\s*\$?([0-9,]+\.?[0-9]*)/i,
      risk: /(?:risk(?:ing)?)[^\d]*?([0-9]+(?:\.[0-9]+)?)\s*%/i
    },
    // Pattern 2: Multi-line format
    {
      entry: /(?:adding|add|starter)[\s\S]*?@\s*\$?([0-9,]+\.?[0-9]*)/i,
      stop: /(?:stop[\s\S]*?loss|sl)[\s\S]*?@\s*\$?([0-9,]+\.?[0-9]*)/i,
      risk: /(?:risk(?:ing)?)[\s\S]*?([0-9]+(?:\.[0-9]+)?)\s*%/i
    }
  ];

  let entry, stop, riskPct, ticker;

  // Extract ticker first
  ticker = extractTicker(text);

  // Try each pattern until we find a match
  for (const pattern of patterns) {
    const entryMatch = text.match(pattern.entry);
    const stopMatch = text.match(pattern.stop);
    const riskMatch = text.match(pattern.risk);

    if (entryMatch) entry = toNumber(entryMatch[1]);
    if (stopMatch) stop = toNumber(stopMatch[1]);
    if (riskMatch) riskPct = parseFloat(riskMatch[1]);

    // If we found both required values, break
    if (!isNaN(entry) && !isNaN(stop)) {
      break;
    }
  }

  console.log('📊 Parsed values:', { entry, stop, riskPct, ticker });

  // Validation
  if (isNaN(entry) || entry <= 0) {
    throw new Error('Could not find a valid entry price. Please check the format.');
  }

  if (isNaN(stop) || stop <= 0) {
    throw new Error('Could not find a valid stop loss price. Please check the format.');
  }

  if (stop >= entry) {
    throw new Error('Stop loss must be below entry price (long positions only).');
  }

  if (riskPct !== undefined) {
    if (isNaN(riskPct) || riskPct <= 0 || riskPct > 100) {
      throw new Error('Risk percentage must be between 0 and 100.');
    }
    
    if (riskPct > 10) {
      throw new Error('Risk percentage seems high (>10%). Please verify.');
    }
  }

  return {
    entry: entry,
    stop: stop,
    riskPct: riskPct,
    ticker: ticker
  };
}

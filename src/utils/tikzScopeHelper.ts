import { extractBalancedBrackets } from "./tikzParser";

export function flattenTikzScopes(code: string): string {
  let result = "";
  let cursor = 0;
  const scopeStack: string[] = [];

  while (cursor < code.length) {
    const rest = code.substring(cursor);
    const beginScopeMatch = rest.match(/^\\begin\{scope\}/i);
    if (beginScopeMatch) {
      let optCursor = cursor + beginScopeMatch[0].length;
      while (optCursor < code.length && /\s/.test(code[optCursor])) optCursor++;
      let scopeOpts = "";
      if (optCursor < code.length && code[optCursor] === "[") {
        const bal = extractBalancedBrackets(code, optCursor);
        if (bal) {
          scopeOpts = bal.content.trim();
          cursor = bal.endIndex + 1;
        } else {
          cursor = optCursor;
        }
      } else {
        cursor = optCursor;
      }
      scopeStack.push(scopeOpts);
      continue;
    }

    const endScopeMatch = rest.match(/^\\end\{scope\}/i);
    if (endScopeMatch) {
      scopeStack.pop();
      cursor += endScopeMatch[0].length;
      continue;
    }

    const semiIdx = rest.indexOf(";");
    if (semiIdx !== -1) {
      let cmd = rest.substring(0, semiIdx + 1);
      if (scopeStack.length > 0) {
        const combinedScopeOpts = scopeStack.filter(Boolean).join(", ");
        if (combinedScopeOpts) {
          const cmdMatch = cmd.match(/^(\s*\\(?:draw|fill|filldraw|path|node|coordinate|pic|clip|addplot3?|shade))\b/i);
          if (cmdMatch) {
            const verb = cmdMatch[1];
            const afterVerb = cmd.substring(verb.length);
            let optCursor = 0;
            while (optCursor < afterVerb.length && /\s/.test(afterVerb[optCursor])) optCursor++;
            if (optCursor < afterVerb.length && afterVerb[optCursor] === "[") {
              const bal = extractBalancedBrackets(afterVerb, optCursor);
              if (bal) {
                const existingOpts = bal.content.trim();
                const mergedOpts = existingOpts ? `${combinedScopeOpts}, ${existingOpts}` : combinedScopeOpts;
                cmd = `${verb}[${mergedOpts}]` + afterVerb.substring(bal.endIndex + 1);
              }
            } else {
              cmd = `${verb}[${combinedScopeOpts}]` + afterVerb;
            }
          }
        }
      }
      result += cmd;
      cursor += semiIdx + 1;
    } else {
      result += rest;
      break;
    }
  }

  return result;
}

export function stripTikzEnvironments(code: string): string {
  let result = code;
  const envRegex = /\\begin\{([a-zA-Z*]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = envRegex.exec(result)) !== null) {
    const startIdx = match.index;
    let cursor = startIdx + match[0].length;
    while (cursor < result.length && /\s/.test(result[cursor])) cursor++;
    if (cursor < result.length && result[cursor] === "[") {
      const bal = extractBalancedBrackets(result, cursor);
      if (bal) {
        cursor = bal.endIndex + 1;
      }
    }
    result = result.substring(0, startIdx) + " " + result.substring(cursor);
    envRegex.lastIndex = startIdx + 1;
  }
  result = result.replace(/\\end\{[a-zA-Z*]+\}/g, " ");
  return result;
}

/**
 * Search and replace functionality for configuration text
 */
export function searchReplace(
  config: string, 
  search: string, 
  replace: string, 
  mode: 'next' | 'all'
): { result: string, count: number } {
  if (!search) {
    return { result: config, count: 0 };
  }

  let result = config;
  let count = 0;

  if (mode === 'all') {
    // Use global flag to replace all occurrences
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = result.match(regex) || [];
    count = matches.length;
    result = result.replace(regex, replace);
  } else if (mode === 'next') {
    // Replace only the first occurrence
    const index = result.indexOf(search);
    if (index !== -1) {
      result = result.substring(0, index) + replace + result.substring(index + search.length);
      count = 1;
    }
  }

  return { result, count };
}

/**
 * Find all matches of search term in config text
 */
export function findAllMatches(config: string, search: string): Array<{ start: number, end: number }> {
  if (!search) return [];

  const matches = [];
  const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  let match;

  while ((match = regex.exec(config)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return matches;
}

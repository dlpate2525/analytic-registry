export function connectionTechnologyDisplay(rawTechnology: string | undefined) {
  const technology = rawTechnology?.trim() || 'Undefined';
  const legacyExtract = technology.toLowerCase() === 'extract';
  return {
    technology: legacyExtract ? 'Undefined' : technology,
    processingNote: legacyExtract ? 'Extract processing recorded; source technology not supplied' : '',
  };
}

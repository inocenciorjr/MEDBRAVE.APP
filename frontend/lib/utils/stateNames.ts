/**
 * Mapeamento de siglas de estados brasileiros para nomes completos
 */
export const STATE_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

/**
 * Converte sigla de estado para nome completo
 * @param abbreviation Sigla do estado (ex: 'SP', 'RJ')
 * @returns Nome completo do estado ou a sigla original se não encontrado
 */
export function getStateName(abbreviation: string): string {
  const upperAbbr = abbreviation.toUpperCase().trim();
  return STATE_NAMES[upperAbbr] || abbreviation;
}

/**
 * Converte nome de estado para sigla
 * @param name Nome completo do estado
 * @returns Sigla do estado ou o nome original se não encontrado
 */
export function getStateAbbreviation(name: string): string {
  const normalizedName = name.trim();
  const entry = Object.entries(STATE_NAMES).find(
    ([_, stateName]) => stateName.toLowerCase() === normalizedName.toLowerCase()
  );
  return entry ? entry[0] : name;
}

import { translate as tr } from '../i18n';
export const brazilStates = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'],
  ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'],
  ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
  ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins']
].map(([value, label]) => ({ value, label }));

export const fetchCities = async (state) => {
  if (!state) return [];
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(state)}/municipios`);
  if (!response.ok) throw new Error(tr("Não foi possível carregar as cidades deste estado."));
  const cities = await response.json();
  return cities.sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'))
    .map((city) => ({ value: city.nome, label: city.nome }));
};

export const normalizeCep = (value) => String(value || '').replace(/\D/g, '').slice(0, 8);

export const formatCep = (value) => {
  const digits = normalizeCep(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

export const fetchCep = async (value) => {
  const cep = normalizeCep(value);
  if (cep.length !== 8) return null;
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) throw new Error(tr("Não foi possível consultar o CEP."));
  let result = await response.json();
  if (result.erro) {
    const fallbackResponse = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    if (!fallbackResponse.ok) throw new Error(tr("CEP não encontrado."));
    const fallback = await fallbackResponse.json();
    result = {
      cep: fallback.cep,
      logradouro: fallback.street || '',
      bairro: fallback.neighborhood || '',
      localidade: fallback.city || '',
      uf: fallback.state || ''
    };
  }
  return {
    cep: normalizeCep(result.cep || cep),
    street: result.logradouro || '',
    neighborhood: result.bairro || '',
    city: result.localidade || '',
    state: result.uf || ''
  };
};

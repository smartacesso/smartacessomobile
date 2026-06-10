/**
 * Validação manual das funções de filtro local.
 * Executar: node scripts/validate-filters.mjs
 */

function normalizarTexto(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isAcessoSaida(item) {
  return normalizarTexto(item.sentido || '') === 'saida';
}

function inicioDoDia(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDataEvento(dataIso) {
  const dataEvento = new Date(dataIso);
  if (Number.isNaN(dataEvento.getTime())) return null;
  return dataEvento;
}

function itemDentroDoPeriodo(dataIso, periodo, referencia = new Date()) {
  if (!dataIso) return false;

  const dataEvento = parseDataEvento(dataIso);
  if (!dataEvento) return false;

  const hoje = inicioDoDia(referencia);

  if (periodo === 'HOJE') {
    return inicioDoDia(dataEvento).getTime() === hoje.getTime();
  }

  if (periodo === 'ONTEM') {
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    return inicioDoDia(dataEvento).getTime() === ontem.getTime();
  }

  if (periodo === '6M') {
    const limite = new Date(hoje);
    limite.setMonth(limite.getMonth() - 6);
    return dataEvento >= limite;
  }

  const dias = Number(periodo);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() - dias);
  return dataEvento >= limite;
}

function filtrarAcessosPorPeriodo(lista, periodo) {
  return lista.filter((item) => itemDentroDoPeriodo(item.data, periodo));
}

function filtrarEncomendasPorPeriodo(lista, periodo) {
  return lista.filter((item) => itemDentroDoPeriodo(item.dataRecebimento, periodo));
}

function filtrarAcessosLocalmente(lista, busca, sentido) {
  const termo = normalizarTexto(busca.trim());
  return lista.filter((item) => {
    const saida = isAcessoSaida(item);
    if (sentido === 'ENTRADA' && saida) return false;
    if (sentido === 'SAIDA' && !saida) return false;
    if (!termo) return true;
    const nome = normalizarTexto(item.pedestre?.nome || '');
    const local = normalizarTexto(item.local || '');
    const sentidoTexto = normalizarTexto(item.sentido || '');
    return (
      nome.includes(termo) ||
      local.includes(termo) ||
      sentidoTexto.includes(termo) ||
      (termo.includes('entrada') && !saida) ||
      (termo.includes('saida') && saida)
    );
  });
}

function isEncomendaRetirada(item) {
  return item.confirmaRetirada === 'S' || item.confirmaRetirada === true;
}

function filtrarEncomendasLocalmente(lista, busca, status) {
  const termo = normalizarTexto(busca.trim());
  return lista.filter((item) => {
    const retirado = isEncomendaRetirada(item);
    if (status === 'DISPONIVEL' && retirado) return false;
    if (status === 'ENTREGUE' && !retirado) return false;
    if (!termo) return true;
    const codigo = normalizarTexto(item.codigoRastreio || '');
    return codigo.includes(termo);
  });
}

const hoje = new Date();
const ontem = new Date(hoje);
ontem.setDate(hoje.getDate() - 1);
const antigo = new Date(hoje);
antigo.setMonth(antigo.getMonth() - 7);

const acessos = [
  { sentido: 'ENTRADA', data: hoje.toISOString(), local: 'Portaria', pedestre: { nome: 'João Silva' } },
  { sentido: 'SAIDA', data: ontem.toISOString(), local: 'Garagem', pedestre: { nome: 'Maria Souza' } },
  { sentido: 'SAÍDA', data: antigo.toISOString(), local: 'Portaria', pedestre: { nome: 'Pedro' } },
];

const encomendas = [
  { id: 1, codigoRastreio: 'ABC123', confirmaRetirada: 'N', dataRecebimento: hoje.toISOString() },
  { id: 2, codigoRastreio: 'XYZ999', confirmaRetirada: 'S', dataRecebimento: ontem.toISOString() },
  { id: 3, codigoRastreio: 'OLD001', confirmaRetirada: 'N', dataRecebimento: antigo.toISOString() },
];

const asserts = [];

function assert(name, condition) {
  asserts.push({ name, ok: Boolean(condition) });
}

assert('periodo HOJE', filtrarAcessosPorPeriodo(acessos, 'HOJE').length === 1);
assert('periodo ONTEM', filtrarAcessosPorPeriodo(acessos, 'ONTEM').length === 1);
assert('periodo 30 exclui 7 meses', filtrarAcessosPorPeriodo(acessos, '30').length === 2);
assert('periodo 6 meses inclui ontem', filtrarAcessosPorPeriodo(acessos, '6M').length === 2);
assert('periodo 6 meses exclui 7 meses', filtrarAcessosPorPeriodo(acessos, '6M').length < 3);
assert('filtro SAIDA aceita acento', filtrarAcessosLocalmente(acessos, '', 'SAIDA').length === 2);
assert('filtro ENTRADA', filtrarAcessosLocalmente(acessos, '', 'ENTRADA').length === 1);
assert('busca por nome', filtrarAcessosLocalmente(acessos, 'maria', 'TODOS').length === 1);
assert('busca por local', filtrarAcessosLocalmente(acessos, 'garagem', 'TODOS').length === 1);
assert('busca entrada textual', filtrarAcessosLocalmente(acessos, 'entrada', 'TODOS').length === 1);
assert('encomenda periodo HOJE', filtrarEncomendasPorPeriodo(encomendas, 'HOJE').length === 1);
assert('encomenda periodo 30', filtrarEncomendasPorPeriodo(encomendas, '30').length === 2);
assert('encomenda disponivel', filtrarEncomendasLocalmente(encomendas, '', 'DISPONIVEL').length === 2);
assert('encomenda entregue', filtrarEncomendasLocalmente(encomendas, '', 'ENTREGUE').length === 1);
assert('busca codigo', filtrarEncomendasLocalmente(encomendas, 'abc', 'TODAS').length === 1);

const failed = asserts.filter((item) => !item.ok);
if (failed.length > 0) {
  console.error('Falhas na validação dos filtros:');
  failed.forEach((item) => console.error(` - ${item.name}`));
  process.exit(1);
}

console.log(`OK: ${asserts.length} validações de filtro passaram.`);

import { joinServerPath } from './serverUrlUtils';
import { loadAcessosCache, loadEncomendasCache, saveAcessosCache, saveEncomendasCache } from './cacheService';

const APP_USER_AGENT = 'SmartAcessoApp/1.0.0';
const API_PREFIX = '/sistema/restful-services/app';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Tamanho de página usado nas listas com scroll infinito. */
export const LIST_PAGE_SIZE = 20;

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly responsePreview?: string;

  constructor(message: string, status?: number, responsePreview?: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.responsePreview = responsePreview;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export interface AcessoEvento {
  sentido?: string;
  data?: string;
  local?: string;
  pedestre?: {
    nome?: string;
    foto?: string;
  };
}

export interface DestinatarioEncomenda {
  id: number;
  nome?: string;
}

export interface Encomenda {
  id: number;
  codigoRastreio: string;
  tipo: string;
  dataRecebimento: string;
  dataRetirada: string | null;
  confirmaRetirada: string | boolean;
  nomeQuemRetirou: string | null;
  documentoQuemRetirou: string | null;
  destinatario?: DestinatarioEncomenda | null;
  podeConfirmarRetirada?: boolean;
}

export type AppPerfil = 'COMUM' | 'RESPONSAVEL' | 'GERENCIAL';

export interface AppUsuario {
  id: number;
  nome: string;
  cliente: string;
  perfil: AppPerfil;
}

export interface Aviso {
  id: number;
  titulo: string;
  descricao: string;
  dataPublicacao: string;
  temImagem: boolean;
}

export interface ResumoDashboard {
  acessosHoje: number;
  encomendasPendentes: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  total: number;
  pagina: number;
  tamanho: number;
  hasMore: boolean;
}

interface ApiErrorBody {
  message?: string;
  code?: string;
}

function parseErrorMessage(responseText: string, fallback: string): { message: string; code?: string } {
  try {
    const body = JSON.parse(responseText) as ApiErrorBody;
    if (body.message) {
      return { message: body.message, code: body.code };
    }
  } catch {
    // texto puro legado
  }
  const trimmed = responseText.trim();
  if (trimmed.length > 0 && trimmed.length < 200) {
    return { message: trimmed };
  }
  return { message: fallback };
}

async function requestJson<T>(
  servidor: string,
  path: string,
  options: {
    method: 'POST' | 'GET' | 'DELETE';
    token?: string;
    body?: object;
  }
): Promise<T> {
  const url = joinServerPath(servidor, path);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': APP_USER_AGENT,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    console.error('Falha de rede ao chamar API:', url, error);
    throw new ApiError('Não foi possível conectar ao servidor. Verifique a URL e a conexão de internet.');
  }

  const responseText = await response.text();

  if (!response.ok) {
    console.error('Resposta HTTP de erro:', response.status, url, responseText.slice(0, 300));
    const { message, code } = parseErrorMessage(
      responseText,
      `Erro do servidor (HTTP ${response.status}).`
    );

    if (response.status === 401 || response.status === 403) {
      throw new ApiError(message || 'Sessão expirada. Faça login novamente.', response.status, responseText.slice(0, 300), code);
    }
    if (response.status === 404) {
      throw new ApiError(message || 'Endpoint não encontrado. Verifique a URL do servidor.', response.status, responseText.slice(0, 300), code);
    }

    throw new ApiError(message, response.status, responseText.slice(0, 300), code);
  }

  if (!responseText.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    console.error('Resposta não é JSON válido:', url, responseText.slice(0, 300));
    throw new ApiError(
      'O servidor respondeu de forma inesperada. Verifique a URL do servidor.',
      response.status,
      responseText.slice(0, 300)
    );
  }
}

function postJson<T>(servidor: string, path: string, token: string, body: object): Promise<T> {
  return requestJson<T>(servidor, path, { method: 'POST', token, body });
}

function deleteJson<T>(servidor: string, path: string, token: string): Promise<T> {
  return requestJson<T>(servidor, path, { method: 'DELETE', token });
}

function extractList<T>(data: PaginatedResponse<T> | { content?: T[] } | T[]): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  return [];
}

function normalizePaginated<T>(
  data: PaginatedResponse<T> | T[],
  normalize: (item: T) => T
): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    const content = data.map(normalize);
    return {
      content,
      total: content.length,
      pagina: 0,
      tamanho: content.length,
      hasMore: false,
    };
  }

  const content = (data.content ?? []).map(normalize);
  const pagina = data.pagina ?? 0;
  const tamanho = data.tamanho ?? content.length;
  const total = data.total ?? content.length;

  return {
    content,
    total,
    pagina,
    tamanho,
    hasMore: data.hasMore ?? (pagina + 1) * tamanho < total,
  };
}

function normalizeDateField(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') return value;
  return undefined;
}

function normalizeAcesso(item: AcessoEvento): AcessoEvento {
  return {
    ...item,
    data: normalizeDateField(item.data),
  };
}

function normalizeEncomenda(item: Encomenda): Encomenda {
  return {
    ...item,
    dataRecebimento: normalizeDateField(item.dataRecebimento) ?? '',
    dataRetirada: item.dataRetirada != null ? normalizeDateField(item.dataRetirada) ?? null : null,
    destinatario: item.destinatario ?? null,
    podeConfirmarRetirada: item.podeConfirmarRetirada,
  };
}

function normalizeAviso(item: Aviso): Aviso {
  return {
    ...item,
    dataPublicacao: normalizeDateField(item.dataPublicacao) ?? '',
  };
}

export function formatDateApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDateRange(days: number): { dataInicio: string; dataFim: string } {
  const dataFim = new Date();
  const dataInicio = new Date();
  dataInicio.setDate(dataFim.getDate() - days);

  return {
    dataInicio: formatDateApi(dataInicio),
    dataFim: formatDateApi(dataFim),
  };
}

export const MAX_PERIODO_MESES = 6;

export function getDateRangeMonths(months: number): { dataInicio: string; dataFim: string } {
  const dataFim = new Date();
  const dataInicio = new Date();
  dataInicio.setMonth(dataInicio.getMonth() - months);

  return {
    dataInicio: formatDateApi(dataInicio),
    dataFim: formatDateApi(dataFim),
  };
}

export type PeriodoFiltroData = 'HOJE' | 'ONTEM' | '7' | '15' | '30' | '6M';

export const PERIODO_DATA_OPCOES: { value: PeriodoFiltroData; label: string }[] = [
  { value: 'HOJE', label: 'Hoje' },
  { value: 'ONTEM', label: 'Ontem' },
  { value: '7', label: '7 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
  { value: '6M', label: '6 meses' },
];

function inicioDoDia(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDataEvento(dataIso: string): Date | null {
  const dataEvento = new Date(dataIso);
  if (Number.isNaN(dataEvento.getTime())) return null;
  return dataEvento;
}

export function periodoToDateRange(periodo: PeriodoFiltroData): { dataInicio: string; dataFim: string } {
  const hoje = inicioDoDia(new Date());

  if (periodo === 'HOJE') {
    const d = formatDateApi(hoje);
    return { dataInicio: d, dataFim: d };
  }

  if (periodo === 'ONTEM') {
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const d = formatDateApi(ontem);
    return { dataInicio: d, dataFim: d };
  }

  if (periodo === '6M') {
    return getDateRangeMonths(MAX_PERIODO_MESES);
  }

  return getDateRange(Number(periodo));
}

export function sentidoToApi(sentido: 'TODOS' | 'ENTRADA' | 'SAIDA'): string | undefined {
  if (sentido === 'ENTRADA') return 'ENTRADA';
  if (sentido === 'SAIDA') return 'SAIDA';
  return undefined;
}

export function itemDentroDoPeriodo(
  dataIso: string | null | undefined,
  periodo: PeriodoFiltroData,
  referencia: Date = new Date()
): boolean {
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
    limite.setMonth(limite.getMonth() - MAX_PERIODO_MESES);
    return dataEvento >= limite;
  }

  const dias = Number(periodo);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() - dias);
  return dataEvento >= limite;
}

export interface AcessosQuery {
  periodo?: PeriodoFiltroData;
  sentido?: 'TODOS' | 'ENTRADA' | 'SAIDA';
  busca?: string;
  pagina?: number;
  tamanho?: number;
}

export interface EncomendasQuery {
  periodo?: PeriodoFiltroData;
  status?: 'TODAS' | 'DISPONIVEL' | 'ENTREGUE';
  busca?: string;
  pagina?: number;
  tamanho?: number;
}

export interface AvisosQuery {
  busca?: string;
  pagina?: number;
  tamanho?: number;
}

function buildAcessosBody(query: AcessosQuery) {
  const periodo = query.periodo ?? '6M';
  const { dataInicio, dataFim } = periodoToDateRange(periodo);
  const sentido = query.sentido ? sentidoToApi(query.sentido) : undefined;
  const busca = query.busca?.trim();

  return {
    dataInicio,
    dataFim,
    pagina: query.pagina ?? 0,
    tamanho: Math.min(query.tamanho ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    ...(sentido ? { sentido } : {}),
    ...(busca ? { busca } : {}),
  };
}

function buildEncomendasBody(query: EncomendasQuery) {
  const periodo = query.periodo ?? '6M';
  const { dataInicio, dataFim } = periodoToDateRange(periodo);
  const busca = query.busca?.trim();
  const status = query.status ?? 'TODAS';

  return {
    dataInicio,
    dataFim,
    pagina: query.pagina ?? 0,
    tamanho: Math.min(query.tamanho ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    status,
    ...(busca ? { busca } : {}),
  };
}

export async function fetchAcessosPaginated(
  servidor: string,
  token: string,
  query: AcessosQuery = { periodo: '6M' }
): Promise<PaginatedResponse<AcessoEvento>> {
  const data = await postJson<PaginatedResponse<AcessoEvento> | AcessoEvento[]>(
    servidor,
    `${API_PREFIX}/acessos`,
    token,
    buildAcessosBody(query)
  );
  return normalizePaginated(data, normalizeAcesso);
}

export async function fetchEncomendasPaginated(
  servidor: string,
  token: string,
  query: EncomendasQuery = { periodo: '6M', status: 'TODAS' }
): Promise<PaginatedResponse<Encomenda>> {
  const data = await postJson<PaginatedResponse<Encomenda> | Encomenda[]>(
    servidor,
    `${API_PREFIX}/encomendas`,
    token,
    buildEncomendasBody(query)
  );
  return normalizePaginated(data, normalizeEncomenda);
}

export async function fetchAvisosPaginated(
  servidor: string,
  token: string,
  query: AvisosQuery = {}
): Promise<PaginatedResponse<Aviso>> {
  const busca = query.busca?.trim();
  const data = await postJson<PaginatedResponse<Aviso> | Aviso[]>(
    servidor,
    `${API_PREFIX}/avisos`,
    token,
    {
      pagina: query.pagina ?? 0,
      tamanho: Math.min(query.tamanho ?? LIST_PAGE_SIZE, MAX_PAGE_SIZE),
      ...(busca ? { busca } : {}),
    }
  );
  return normalizePaginated(data, normalizeAviso);
}

export async function fetchAcessos(
  servidor: string,
  token: string,
  query: AcessosQuery = { periodo: '6M' }
): Promise<AcessoEvento[]> {
  const page = await fetchAcessosPaginated(servidor, token, query);
  return page.content;
}

export async function fetchEncomendas(
  servidor: string,
  token: string,
  query: EncomendasQuery = { periodo: '6M', status: 'TODAS' }
): Promise<Encomenda[]> {
  const page = await fetchEncomendasPaginated(servidor, token, query);
  return page.content;
}

export async function fetchAvisos(
  servidor: string,
  token: string,
  query: AvisosQuery = {}
): Promise<Aviso[]> {
  const page = await fetchAvisosPaginated(servidor, token, query);
  return page.content;
}

export function getAvisoImagemUrl(servidor: string, avisoId: number): string {
  return joinServerPath(servidor, `${API_PREFIX}/avisos/${avisoId}/imagem`);
}

export interface ConfirmarRetiradaRequest {
  id: number;
  nomeQuemRetirou: string;
  documentoQuemRetirou: string;
}

/** Confirma retirada de encomenda. Requer endpoint no backend (404 = ainda não disponível). */
export async function confirmarRetiradaEncomenda(
  servidor: string,
  token: string,
  body: ConfirmarRetiradaRequest
): Promise<void> {
  await postJson<unknown>(servidor, `${API_PREFIX}/encomendas/confirmar-retirada`, token, body);
}

export async function fetchResumo(servidor: string, token: string): Promise<ResumoDashboard> {
  const data = await postJson<{ acessosHoje?: number; encomendasPendentes?: number }>(
    servidor,
    `${API_PREFIX}/resumo`,
    token,
    {}
  );
  return {
    acessosHoje: Number(data.acessosHoje ?? 0),
    encomendasPendentes: Number(data.encomendasPendentes ?? 0),
  };
}

export interface FetchResult<T> {
  data: T;
  fromCache: boolean;
  savedAt: number | null;
}

async function withCacheFallback<T>(
  fetchFn: () => Promise<T>,
  loadCache: () => Promise<{ data: T; savedAt: number } | null>,
  saveCacheFn: (data: T) => Promise<void>
): Promise<FetchResult<T>> {
  try {
    const data = await fetchFn();
    await saveCacheFn(data);
    return { data, fromCache: false, savedAt: Date.now() };
  } catch (error) {
    const cached = await loadCache();
    if (cached) {
      return { data: cached.data, fromCache: true, savedAt: cached.savedAt };
    }
    throw error;
  }
}

export function fetchAcessosWithCache(
  servidor: string,
  token: string,
  query: AcessosQuery = { periodo: '6M' }
): Promise<FetchResult<AcessoEvento[]>> {
  return withCacheFallback(
    () => fetchAcessos(servidor, token, query),
    loadAcessosCache,
    saveAcessosCache
  );
}

export function fetchEncomendasWithCache(
  servidor: string,
  token: string,
  query: EncomendasQuery = { periodo: '6M', status: 'TODAS' }
): Promise<FetchResult<Encomenda[]>> {
  return withCacheFallback(
    () => fetchEncomendas(servidor, token, query),
    loadEncomendasCache,
    saveEncomendasCache
  );
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isAcessoSaida(item: AcessoEvento): boolean {
  return normalizarTexto(item.sentido || '') === 'saida';
}

/** Filtro local (cache offline ou dados legados sem filtro na API). */
export function filtrarAcessosPorPeriodo(
  lista: AcessoEvento[],
  periodo: PeriodoFiltroData
): AcessoEvento[] {
  return lista.filter((item) => itemDentroDoPeriodo(item.data, periodo));
}

export function filtrarAcessosLocalmente(
  lista: AcessoEvento[],
  busca: string,
  sentido: 'TODOS' | 'ENTRADA' | 'SAIDA'
): AcessoEvento[] {
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

export function isEncomendaRetirada(item: Encomenda): boolean {
  return item.confirmaRetirada === 'S' || item.confirmaRetirada === true;
}

export function podeConfirmarEncomenda(item: Encomenda): boolean {
  if (isEncomendaRetirada(item)) return false;
  if (item.podeConfirmarRetirada != null) return item.podeConfirmarRetirada;
  return true;
}

export async function fetchMe(servidor: string, token: string): Promise<AppUsuario> {
  const data = await requestJson<AppUsuario>(servidor, `${API_PREFIX}/me`, {
    method: 'GET',
    token,
  });
  return {
    id: Number(data.id),
    nome: data.nome ?? '',
    cliente: data.cliente ?? '',
    perfil: (data.perfil as AppPerfil) ?? 'COMUM',
  };
}

export interface EmpresaResumo {
  id: number;
  nome: string;
}

export interface LinkConviteResponse {
  link: string;
  token?: number;
  idEmpresa?: number;
}

export interface AvisoSalvarPayload {
  id?: number;
  titulo: string;
  descricao?: string;
  dataPublicacao?: string;
  imagemBase64?: string;
}

export interface HealthStatus {
  status?: string;
  jwtConfigured?: boolean;
  firebaseReady?: boolean;
}

export async function fetchEmpresas(servidor: string, token: string): Promise<EmpresaResumo[]> {
  const data = await requestJson<EmpresaResumo[]>(servidor, `${API_PREFIX}/empresas`, {
    method: 'GET',
    token,
  });
  return Array.isArray(data) ? data : [];
}

export async function gerarLinkConviteVisitante(
  servidor: string,
  token: string,
  idEmpresa: number
): Promise<LinkConviteResponse> {
  return postJson<LinkConviteResponse>(servidor, `${API_PREFIX}/visitante/link-convite`, token, {
    idEmpresa,
  });
}

export async function salvarAviso(
  servidor: string,
  token: string,
  payload: AvisoSalvarPayload
): Promise<Aviso> {
  const data = await postJson<Aviso>(servidor, `${API_PREFIX}/avisos/salvar`, token, payload);
  return normalizeAviso(data);
}

export async function excluirAviso(servidor: string, token: string, id: number): Promise<void> {
  await deleteJson<unknown>(servidor, `${API_PREFIX}/avisos/${id}`, token);
}

export async function fetchHealthStatus(servidor: string): Promise<HealthStatus> {
  return requestJson<HealthStatus>(servidor, `${API_PREFIX}/health`, { method: 'GET' });
}

export interface PushStatusTokenResumo {
  platform?: string;
  tokenMascarado?: string;
  appVersion?: string;
  pareceExpoToken?: boolean;
}

export interface PushStatus {
  pedestreId?: number;
  tokensAtivos?: number;
  tokens?: PushStatusTokenResumo[];
}

export async function fetchPushStatus(servidor: string, token: string): Promise<PushStatus> {
  return requestJson<PushStatus>(servidor, `${API_PREFIX}/push/status`, {
    method: 'GET',
    token,
  });
}

export function filtrarEncomendasPorPeriodo(
  lista: Encomenda[],
  periodo: PeriodoFiltroData
): Encomenda[] {
  return lista.filter((item) => itemDentroDoPeriodo(item.dataRecebimento, periodo));
}

export function filtrarEncomendasLocalmente(
  lista: Encomenda[],
  busca: string,
  status: 'TODAS' | 'DISPONIVEL' | 'ENTREGUE'
): Encomenda[] {
  const termo = normalizarTexto(busca.trim());

  return lista.filter((item) => {
    const retirado = isEncomendaRetirada(item);

    if (status === 'DISPONIVEL' && retirado) return false;
    if (status === 'ENTREGUE' && !retirado) return false;

    if (!termo) return true;

    const codigo = normalizarTexto(item.codigoRastreio || '');
    const tipo = normalizarTexto(item.tipo || '');
    const nome = normalizarTexto(item.nomeQuemRetirou || '');
    const documento = normalizarTexto(item.documentoQuemRetirou || '');

    return (
      codigo.includes(termo) ||
      tipo.includes(termo) ||
      nome.includes(termo) ||
      documento.includes(termo) ||
      (termo.includes('dispon') && !retirado) ||
      (termo.includes('entreg') && retirado)
    );
  });
}

/** Aplica filtros locais quando os dados vêm do cache offline. */
export function aplicarFiltrosAcessosCache(
  lista: AcessoEvento[],
  periodo: PeriodoFiltroData,
  busca: string,
  sentido: 'TODOS' | 'ENTRADA' | 'SAIDA'
): AcessoEvento[] {
  return filtrarAcessosLocalmente(filtrarAcessosPorPeriodo(lista, periodo), busca, sentido);
}

export function aplicarFiltrosEncomendasCache(
  lista: Encomenda[],
  periodo: PeriodoFiltroData,
  busca: string,
  status: 'TODAS' | 'DISPONIVEL' | 'ENTREGUE'
): Encomenda[] {
  return filtrarEncomendasLocalmente(filtrarEncomendasPorPeriodo(lista, periodo), busca, status);
}

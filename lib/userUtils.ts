import type { AppPerfil, AppUsuario } from './apiService';

export function isPerfilGerencial(user: AppUsuario | null | undefined): boolean {
  return user?.perfil === 'GERENCIAL';
}

export function labelPerfil(perfil: AppPerfil | undefined): string {
  switch (perfil) {
    case 'GERENCIAL':
      return 'Gerencial';
    case 'RESPONSAVEL':
      return 'Responsável';
    case 'COMUM':
      return 'Morador';
    default:
      return '—';
  }
}

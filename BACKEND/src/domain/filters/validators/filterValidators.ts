import { Request, Response, NextFunction } from 'express';
import { FilterCategory, FilterStatus, FilterType } from '../types';

// Verifica se a categoria é válida
export function validateFilterCategory(category: any): category is FilterCategory {
  return Object.values(FilterCategory).includes(category);
}

// Verifica se o status é válido
export function validateFilterStatus(status: any): status is FilterStatus {
  return Object.values(FilterStatus).includes(status);
}

// Verifica se o tipo é válido
export function validateFilterType(type: any): type is FilterType {
  return Object.values(FilterType).includes(type);
}

// Middleware para validar criação de filtro
export function validateCreateFilter(req: Request, res: Response, next: NextFunction): void {
  const { name, category } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'Nome do filtro é obrigatório e deve ser uma string válida' });
    return;
  }
  
  if (!category) {
    res.status(400).json({ error: 'Categoria do filtro é obrigatória' });
    return;
  }
  
  if (!validateFilterCategory(category)) {
    res.status(400).json({ 
      error: `Categoria inválida. Valores permitidos: ${Object.values(FilterCategory).join(', ')}` 
    });
    return;
  }
  
  if (req.body.status && !validateFilterStatus(req.body.status)) {
    res.status(400).json({ 
      error: `Status inválido. Valores permitidos: ${Object.values(FilterStatus).join(', ')}` 
    });
    return;
  }
  
  if (req.body.filterType && !validateFilterType(req.body.filterType)) {
    res.status(400).json({ 
      error: `Tipo de filtro inválido. Valores permitidos: ${Object.values(FilterType).join(', ')}` 
    });
    return;
  }
  
  next();
}

// Middleware para validar atualização de filtro
export function validateUpdateFilter(req: Request, res: Response, next: NextFunction): void {
  const { name, status, filterType } = req.body;
  
  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    res.status(400).json({ error: 'Nome do filtro deve ser uma string válida' });
    return;
  }
  
  if (status !== undefined && !validateFilterStatus(status)) {
    res.status(400).json({ 
      error: `Status inválido. Valores permitidos: ${Object.values(FilterStatus).join(', ')}` 
    });
    return;
  }
  
  if (filterType !== undefined && !validateFilterType(filterType)) {
    res.status(400).json({ 
      error: `Tipo de filtro inválido. Valores permitidos: ${Object.values(FilterType).join(', ')}` 
    });
    return;
  }
  
  next();
}

// Middleware para validar criação de subfiltro
export function validateCreateSubFilter(req: Request, res: Response, next: NextFunction): void {
  const { name } = req.body;
  const { filterId } = req.params;
  
  if (!filterId) {
    res.status(400).json({ error: 'ID do filtro pai é obrigatório' });
    return;
  }
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'Nome do subfiltro é obrigatório e deve ser uma string válida' });
    return;
  }
  
  if (req.body.status && !validateFilterStatus(req.body.status)) {
    res.status(400).json({ 
      error: `Status inválido. Valores permitidos: ${Object.values(FilterStatus).join(', ')}` 
    });
    return;
  }
  
  if (req.body.order !== undefined && isNaN(parseInt(req.body.order))) {
    res.status(400).json({ error: 'Ordem deve ser um número válido' });
    return;
  }
  
  next();
}

// Middleware para validar atualização de subfiltro
export function validateUpdateSubFilter(req: Request, res: Response, next: NextFunction): void {
  const { name, status } = req.body;
  
  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    res.status(400).json({ error: 'Nome do subfiltro deve ser uma string válida' });
    return;
  }
  
  if (status !== undefined && !validateFilterStatus(status)) {
    res.status(400).json({ 
      error: `Status inválido. Valores permitidos: ${Object.values(FilterStatus).join(', ')}` 
    });
    return;
  }
  
  if (req.body.order !== undefined && isNaN(parseInt(req.body.order))) {
    res.status(400).json({ error: 'Ordem deve ser um número válido' });
    return;
  }
  
  next();
} 
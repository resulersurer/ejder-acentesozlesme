import { CONTRACT_TEMPLATE } from './contract-template';

const STORAGE_KEY = 'ejder-contract-template';

export const getContractTemplate = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || CONTRACT_TEMPLATE;
  } catch {
    return CONTRACT_TEMPLATE;
  }
};

export const saveContractTemplate = (template: string): void => {
  localStorage.setItem(STORAGE_KEY, template);
};

export const resetContractTemplate = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

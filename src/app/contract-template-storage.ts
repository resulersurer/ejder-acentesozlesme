import { CONTRACT_TEMPLATE, CONTRACT_VARIABLES, ContractVariableKey } from './contract-template';

const TEMPLATE_STORAGE_KEY = 'ejder-contract-template';
const SETTINGS_STORAGE_KEY = 'ejder-contract-variable-settings';

export type VariableSetting = {
  key: ContractVariableKey;
  required: boolean;
  fillable: boolean;
  defaultValue: string;
};

export type VariableSettingsMap = Record<string, VariableSetting>;

const defaultValueFor = (key: ContractVariableKey): string => {
  if (key === 'tourCodeName') {
    return 'Japonya Kore Turu THY NRT 12Gün - 2026 - 216008000002781860';
  }

  if (key === 'ejderAuthorizedName') {
    return 'Ejder Turizm ve Havacılık Ltd. Şti.';
  }

  if (key === 'currency') {
    return 'TL';
  }

  if (key === 'pageCount') {
    return '7 (yedi)';
  }

  return '';
};

const getDefaultVariableSettings = (): VariableSettingsMap =>
  Object.fromEntries(
    CONTRACT_VARIABLES.map((variable) => [
      variable.key,
      {
        key: variable.key,
        required: variable.required,
        fillable: variable.key !== 'contractNo',
        defaultValue: defaultValueFor(variable.key),
      },
    ])
  );

const readSettings = (): Partial<VariableSettingsMap> => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}') as Partial<VariableSettingsMap>;
  } catch {
    return {};
  }
};

export const getContractTemplate = (): string => {
  try {
    return localStorage.getItem(TEMPLATE_STORAGE_KEY) || CONTRACT_TEMPLATE;
  } catch {
    return CONTRACT_TEMPLATE;
  }
};

export const saveContractTemplate = (template: string): void => {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, template);
};

export const resetContractTemplate = (): void => {
  localStorage.removeItem(TEMPLATE_STORAGE_KEY);
};

export const getVariableSettings = (): VariableSettingsMap => {
  const defaults = getDefaultVariableSettings();
  const stored = readSettings();

  return Object.fromEntries(
    CONTRACT_VARIABLES.map((variable) => [
      variable.key,
      {
        ...defaults[variable.key],
        ...(stored[variable.key] ?? {}),
        key: variable.key,
      },
    ])
  );
};

export const saveVariableSettings = (settings: VariableSettingsMap): void => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

export const resetVariableSettings = (): void => {
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
};

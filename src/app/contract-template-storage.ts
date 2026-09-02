import { CONTRACT_VARIABLES, ContractVariableKey } from './contract-template';
import { DEFAULT_CONTRACT_KIND, ContractKind, getContractKindConfig } from './contract-types';

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

const getTemplateStorageKey = (kind: ContractKind): string =>
  kind === DEFAULT_CONTRACT_KIND ? TEMPLATE_STORAGE_KEY : `${TEMPLATE_STORAGE_KEY}-${kind}`;

const getSettingsStorageKey = (kind: ContractKind): string =>
  kind === DEFAULT_CONTRACT_KIND ? SETTINGS_STORAGE_KEY : `${SETTINGS_STORAGE_KEY}-${kind}`;

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

const readSettings = (kind: ContractKind): Partial<VariableSettingsMap> => {
  try {
    return JSON.parse(localStorage.getItem(getSettingsStorageKey(kind)) || '{}') as Partial<VariableSettingsMap>;
  } catch {
    return {};
  }
};

export const getContractTemplate = (kind: ContractKind = DEFAULT_CONTRACT_KIND): string => {
  try {
    return localStorage.getItem(getTemplateStorageKey(kind)) || getContractKindConfig(kind).template;
  } catch {
    return getContractKindConfig(kind).template;
  }
};

export const saveContractTemplate = (template: string, kind: ContractKind = DEFAULT_CONTRACT_KIND): void => {
  localStorage.setItem(getTemplateStorageKey(kind), template);
};

export const resetContractTemplate = (kind: ContractKind = DEFAULT_CONTRACT_KIND): void => {
  localStorage.removeItem(getTemplateStorageKey(kind));
};

export const getVariableSettings = (kind: ContractKind = DEFAULT_CONTRACT_KIND): VariableSettingsMap => {
  const defaults = getDefaultVariableSettings();
  const stored = readSettings(kind);

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

export const saveVariableSettings = (settings: VariableSettingsMap, kind: ContractKind = DEFAULT_CONTRACT_KIND): void => {
  localStorage.setItem(getSettingsStorageKey(kind), JSON.stringify(settings));
};

export const resetVariableSettings = (kind: ContractKind = DEFAULT_CONTRACT_KIND): void => {
  localStorage.removeItem(getSettingsStorageKey(kind));
};

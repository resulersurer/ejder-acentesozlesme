import { CONTRACT_TEMPLATE, INDIVIDUAL_PARTICIPATION_GROUP_CONTRACT_TEMPLATE } from './contract-template';

export type ContractKind = 'group-package' | 'individual-participation-group';

export type ContractKindConfig = {
  kind: ContractKind;
  label: string;
  listLabel: string;
  formPath: string;
  listPath: string;
  eyebrow: string;
  contractNoPrefix: string;
  template: string;
};

export const CONTRACT_KIND_CONFIGS: Record<ContractKind, ContractKindConfig> = {
  'group-package': {
    kind: 'group-package',
    label: 'Grup Paket',
    listLabel: 'Grup Paket Listesi',
    formPath: '/',
    listPath: '/grup-paket-listesi',
    eyebrow: 'Kapalı grup sözleşmesi',
    contractNoPrefix: 'KG',
    template: CONTRACT_TEMPLATE,
  },
  'individual-participation-group': {
    kind: 'individual-participation-group',
    label: 'Bireysel Katılımlı Özel Grup',
    listLabel: 'Bireysel Katılımlı Özel Grup Listesi',
    formPath: '/bireysel-katilimli-ozel-grup',
    listPath: '/bireysel-katilimli-ozel-grup-listesi',
    eyebrow: 'Bireysel katılımlı özel grup sözleşmesi',
    contractNoPrefix: 'BK',
    template: INDIVIDUAL_PARTICIPATION_GROUP_CONTRACT_TEMPLATE,
  },
};

export const DEFAULT_CONTRACT_KIND: ContractKind = 'group-package';

export const getContractKindConfig = (kind?: string): ContractKindConfig => {
  return CONTRACT_KIND_CONFIGS[(kind as ContractKind) || DEFAULT_CONTRACT_KIND] ?? CONTRACT_KIND_CONFIGS[DEFAULT_CONTRACT_KIND];
};

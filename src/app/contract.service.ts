import { Injectable } from '@angular/core';

export const DEFAULT_SENDER_SIGNATURE_IMAGE = 'assets/ejder-signature.png';

export type ContractData = {
  contractKind?: 'group-package' | 'individual-participation-group';
  senderName: string;
  agencyName: string;
  agencyContact: string;
  effectiveDate: string;
  email: string;
  phone: string;
  notes: string;
  contractText?: string;
  contractTemplate?: string;
  variables?: Record<string, string>;
  variableSettings?: Record<string, { required: boolean; fillable: boolean; defaultValue: string }>;
  contractNo?: string;
  contractDate?: string;
  tourCodeName?: string;
  customerTitle?: string;
  senderSignatureImage?: string;
};

export type SignatureData = {
  signerName: string;
  signerTitle: string;
  signDate: string;
  signatureImage: string;
  customerVariables?: Record<string, string>;
  contractText?: string;
  variables?: Record<string, string>;
};

export type ContractRecord = ContractData & {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status?: 'draft' | 'signed';
  signedAt?: string;
  signerName?: string;
  signerTitle?: string;
  signDate?: string;
  signatureImage?: string;
  customerVariables?: Record<string, string>;
  senderSignatureImage?: string;
};

@Injectable({
  providedIn: 'root',
})
export class ContractService {
  async createContract(data: ContractData): Promise<{ id: string }> {
    const response = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json() as Promise<{ id: string }>;
  }

  async getContract(id: string, adminPin?: string): Promise<ContractRecord> {
    const query = new URLSearchParams({ id });
    const headers = adminPin ? { 'X-Admin-Dashboard-Pin': adminPin } : undefined;

    if (adminPin) {
      query.set('admin', '1');
    }

    const response = await fetch(`/api/contracts?${query.toString()}`, { headers });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json() as Promise<ContractRecord>;
  }

  async listContracts(adminPin: string): Promise<ContractRecord[]> {
    const response = await fetch('/api/contracts', {
      headers: { 'X-Admin-Dashboard-Pin': adminPin },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json() as Promise<ContractRecord[]>;
  }

  async signContract(id: string, data: SignatureData): Promise<ContractRecord> {
    const response = await fetch(`/api/contracts?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        status: 'signed',
        signedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json() as Promise<ContractRecord>;
  }

  async deleteContract(id: string, pin: string): Promise<void> {
    const response = await fetch(`/api/contracts?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Delete-Pin': pin },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }
}

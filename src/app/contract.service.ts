import { Injectable } from '@angular/core';

export type ContractData = {
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
  contractNo?: string;
  contractDate?: string;
  tourCodeName?: string;
  customerTitle?: string;
};

export type SignatureData = {
  signerName: string;
  signerTitle: string;
  signDate: string;
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

  async getContract(id: string): Promise<ContractRecord> {
    const response = await fetch(`/api/contracts?id=${encodeURIComponent(id)}`);

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json() as Promise<ContractRecord>;
  }

  async listContracts(): Promise<ContractRecord[]> {
    const response = await fetch('/api/contracts');

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
}

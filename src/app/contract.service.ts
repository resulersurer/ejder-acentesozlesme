import { Injectable } from '@angular/core';

export type ContractData = {
  senderName: string;
  agencyName: string;
  agencyContact: string;
  effectiveDate: string;
  email: string;
  phone: string;
  notes: string;
};

export type ContractRecord = ContractData & {
  id: string;
  createdAt: string;
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
}

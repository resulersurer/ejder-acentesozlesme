import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContractData, ContractService } from '../../contract.service';
import { CONTRACT_TEMPLATE, CONTRACT_VARIABLES, ContractVariableKey } from '../../contract-template';

type VariableGroup = {
  name: string;
  fields: readonly (typeof CONTRACT_VARIABLES)[number][];
};

@Component({
  selector: 'app-sender-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sender-form.component.html',
  styleUrl: './sender-form.component.css',
})
export class SenderFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contractService = inject(ContractService);
  private readonly router = inject(Router);

  protected saving = false;
  protected errorMessage = '';
  protected readonly variables = CONTRACT_VARIABLES;
  protected readonly variableGroups: VariableGroup[] = Array.from(
    new Set(CONTRACT_VARIABLES.map((field) => field.group))
  ).map((group) => ({
    name: group,
    fields: CONTRACT_VARIABLES.filter((field) => field.group === group),
  }));

  protected readonly form = this.fb.nonNullable.group({
    contractTemplate: [CONTRACT_TEMPLATE],
    ...Object.fromEntries(CONTRACT_VARIABLES.map((field) => [field.key, ['']])),
  });

  protected get renderedContractText(): string {
    const values = this.form.getRawValue() as Record<string, string>;

    return values['contractTemplate'].replace(/\{\{(\w+)\}\}/g, (_match, key: ContractVariableKey) => {
      const value = values[key]?.trim();
      return value || `[${this.getVariableLabel(key)}]`;
    });
  }

  protected async submitForm(): Promise<void> {
    this.saving = true;
    this.errorMessage = '';

    try {
      const values = this.form.getRawValue() as Record<string, string>;
      const data: ContractData = {
        senderName: 'Ejder Turizm',
        agencyName: values['customerTitle'],
        agencyContact: values['customerRepresentative'],
        effectiveDate: values['contractDate'],
        email: values['customerContactInfo'],
        phone: values['customerContactInfo'],
        notes: values['tourCodeName'],
        contractText: this.renderedContractText,
        contractTemplate: values['contractTemplate'],
        variables: this.extractVariables(values),
        contractNo: values['contractNo'],
        contractDate: values['contractDate'],
        tourCodeName: values['tourCodeName'],
        customerTitle: values['customerTitle'],
      };

      const result = await this.contractService.createContract(data);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Hata oluştu';
    } finally {
      this.saving = false;
    }
  }

  protected resetTemplate(): void {
    this.form.patchValue({ contractTemplate: CONTRACT_TEMPLATE });
  }

  private extractVariables(values: Record<string, string>): Record<string, string> {
    return Object.fromEntries(CONTRACT_VARIABLES.map((field) => [field.key, values[field.key] ?? '']));
  }

  private getVariableLabel(key: ContractVariableKey): string {
    return CONTRACT_VARIABLES.find((field) => field.key === key)?.label ?? key;
  }
}

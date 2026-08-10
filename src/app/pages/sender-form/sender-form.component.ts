import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContractData, ContractService } from '../../contract.service';
import { CONTRACT_VARIABLES, ContractVariableKey } from '../../contract-template';
import { getContractTemplate, getVariableSettings } from '../../contract-template-storage';

type TemplatePart =
  | { type: 'text'; value: string }
  | { type: 'field'; key: ContractVariableKey };

type TemplateLine = {
  className: string;
  parts: TemplatePart[];
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
  protected readonly templateText = getContractTemplate();
  protected readonly variableSettings = getVariableSettings();
  protected readonly variables = CONTRACT_VARIABLES;
  protected readonly templateLines: TemplateLine[] = this.templateText.split('\n').map((line) => ({
    className: this.getLineClass(line),
    parts: this.parseLine(line),
  }));

  protected readonly form = this.fb.nonNullable.group({
    ...Object.fromEntries(
      CONTRACT_VARIABLES.map((field) => [field.key, [this.getInitialValue(field.key)]])
    ),
  });

  protected get renderedContractText(): string {
    const values = this.form.getRawValue() as Record<string, string>;

    return this.templateText.replace(/\{\{(\w+)\}\}/g, (_match, key: ContractVariableKey) => {
      const value = values[key]?.trim();
      return value || `[${this.getVariableLabel(key)}]`;
    });
  }

  protected get missingRequiredCount(): number {
    const values = this.form.getRawValue() as Record<string, string>;
    return CONTRACT_VARIABLES.filter((field) => this.isRequired(field.key) && !values[field.key]?.trim()).length;
  }

  protected async submitForm(): Promise<void> {
    this.saving = true;
    this.errorMessage = '';

    try {
      if (this.missingRequiredCount > 0) {
        this.errorMessage = `${this.missingRequiredCount} zorunlu alan eksik.`;
        return;
      }

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
        contractTemplate: this.templateText,
        variables: this.extractVariables(values),
        variableSettings: this.variableSettings,
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

  protected getVariableLabel(key: ContractVariableKey): string {
    return CONTRACT_VARIABLES.find((field) => field.key === key)?.label ?? key;
  }

  protected getVariablePlaceholder(key: ContractVariableKey): string {
    return CONTRACT_VARIABLES.find((field) => field.key === key)?.placeholder ?? '';
  }

  protected isRequired(key: ContractVariableKey): boolean {
    return Boolean(this.variableSettings[key]?.required);
  }

  protected isFillable(key: ContractVariableKey): boolean {
    return Boolean(this.variableSettings[key]?.fillable);
  }

  protected isMissing(key: ContractVariableKey): boolean {
    const value = (this.form.getRawValue() as Record<string, string>)[key];
    return this.isFillable(key) && this.isRequired(key) && !value?.trim();
  }

  protected getVariableDisplayValue(key: ContractVariableKey): string {
    const value = (this.form.getRawValue() as Record<string, string>)[key]?.trim();
    return value || this.getVariablePlaceholder(key);
  }

  private extractVariables(values: Record<string, string>): Record<string, string> {
    return Object.fromEntries(CONTRACT_VARIABLES.map((field) => [field.key, values[field.key] ?? '']));
  }

  private getInitialValue(key: ContractVariableKey): string {
    if (key === 'contractNo') {
      return this.generateContractNo();
    }

    return this.variableSettings[key]?.defaultValue ?? '';
  }

  private generateContractNo(): string {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const time = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    return `KG-${date}-${time}`;
  }

  private parseLine(line: string): TemplatePart[] {
    const parts: TemplatePart[] = [];
    const tokenPattern = /\{\{(\w+)\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: line.slice(lastIndex, match.index) });
      }

      const key = match[1] as ContractVariableKey;
      if (CONTRACT_VARIABLES.some((field) => field.key === key)) {
        parts.push({ type: 'field', key });
      } else {
        parts.push({ type: 'text', value: match[0] });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push({ type: 'text', value: line.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', value: '' }];
  }

  private getLineClass(line: string): string {
    if (!line.trim()) {
      return 'blank-line';
    }

    if (line.startsWith('EJDER TURİZM SEYAHAT ACENTASI')) {
      return 'document-title';
    }

    if (line.startsWith('ÖZEL') || line.startsWith('KISALTILMIŞ')) {
      return 'document-subtitle';
    }

    if (line.startsWith('MADDE')) {
      return 'article-heading';
    }

    if (
      line === 'SÖZLEŞME ÖZETİ' ||
      line === 'EJDER TURİZM' ||
      line === 'KURUMSAL MÜŞTERİ / GRUP ORGANİZATÖRÜ' ||
      line === 'KİŞİ SAYISI VE FİYAT BİLGİLERİ' ||
      line === 'FİYAT VE ÖDEME PLANI' ||
      line === 'EKLER' ||
      line === 'İMZA SAYFASI'
    ) {
      return 'block-heading';
    }

    if (line.includes(':') && line.length < 150) {
      return 'info-line';
    }

    return 'paragraph-line';
  }
}

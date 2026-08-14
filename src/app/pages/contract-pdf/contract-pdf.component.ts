import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContractRecord, ContractService, DEFAULT_SENDER_SIGNATURE_IMAGE } from '../../contract.service';
import { CONTRACT_TEMPLATE, CONTRACT_VARIABLES, ContractVariableKey } from '../../contract-template';

type TemplatePart =
  | { type: 'text'; value: string }
  | { type: 'field'; key: ContractVariableKey };

type TemplateLine = {
  value: string;
  className: string;
  parts: TemplatePart[];
};

@Component({
  selector: 'app-contract-pdf',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './contract-pdf.component.html',
  styleUrl: './contract-pdf.component.css',
})
export class ContractPdfComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly contractService = inject(ContractService);

  protected contract: ContractRecord | null = null;
  protected loading = true;
  protected errorMessage = '';
  protected templateLines: TemplateLine[] = [];

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'Sözleşme bağlantısı geçersiz.';
      this.loading = false;
      return;
    }

    try {
      this.contract = await this.contractService.getContract(id);
      this.setupDocument();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Sözleşme yüklenemedi.';
    } finally {
      this.loading = false;
    }
  }

  protected printPdf(): void {
    window.print();
  }

  protected getVariableValue(key: ContractVariableKey): string {
    const variables = this.contract?.variables ?? {};
    const customerVariables = this.contract?.customerVariables ?? {};
    const directValue = this.contract?.[key as keyof ContractRecord];

    const value = customerVariables[key] ?? variables[key] ?? (typeof directValue === 'string' ? directValue : '');
    return value || (key === 'pageCount' ? '7 (yedi)' : '');
  }

  protected getSignatureImage(line: TemplateLine, lineIndex: number): string {
    if (lineIndex === 0 || !line.value.includes('Paraf / İmza')) {
      return '';
    }

    const previousLine = this.templateLines[lineIndex - 1]?.value ?? '';

    if (previousLine.includes('{{ejderAuthorizedName}}')) {
      return this.contract?.senderSignatureImage || DEFAULT_SENDER_SIGNATURE_IMAGE;
    }

    if (previousLine.includes('{{customerAuthorizedName}}')) {
      return this.contract?.signatureImage ?? '';
    }

    return '';
  }

  protected getStatusLabel(): string {
    return this.contract?.status === 'signed' ? 'Onaylandı' : 'Onay bekliyor';
  }

  protected formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private setupDocument(): void {
    if (!this.contract) {
      return;
    }

    const template = this.contract.contractTemplate || CONTRACT_TEMPLATE;
    this.templateLines = template.split('\n').map((line) => ({
      value: line,
      className: this.getLineClass(line),
      parts: this.parseLine(line),
    }));
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

    if (line.startsWith('EJDER')) {
      return 'document-title';
    }

    if (line.startsWith('ÖZEL') || line.startsWith('KISALTILMIŞ')) {
      return 'document-subtitle';
    }

    if (line.startsWith('MADDE')) {
      return 'article-heading';
    }

    if (line.length < 70 && !line.endsWith('.') && line === line.toLocaleUpperCase('tr-TR')) {
      return 'block-heading';
    }

    if (line.includes(':') && line.length < 150) {
      return 'info-line';
    }

    return 'paragraph-line';
  }
}

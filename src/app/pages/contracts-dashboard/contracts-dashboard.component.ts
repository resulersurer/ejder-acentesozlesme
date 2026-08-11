import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContractRecord, ContractService } from '../../contract.service';

@Component({
  selector: 'app-contracts-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contracts-dashboard.component.html',
  styleUrl: './contracts-dashboard.component.css',
})
export class ContractsDashboardComponent implements OnInit {
  private readonly contractService = inject(ContractService);

  protected readonly contracts = signal<ContractRecord[]>([]);
  protected readonly query = signal('');
  protected readonly loading = signal(true);
  protected readonly authorized = signal(false);
  protected readonly authLoading = signal(false);
  protected readonly dashboardPin = signal('');
  protected readonly errorMessage = signal('');
  protected readonly copiedId = signal('');
  protected readonly copiedPdfId = signal('');
  protected readonly deletingId = signal('');

  protected readonly signedCount = computed(
    () => this.contracts().filter((contract) => contract.status === 'signed').length
  );

  protected readonly pendingCount = computed(() => this.contracts().length - this.signedCount());

  protected readonly filteredContracts = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('tr-TR');

    if (!query) {
      return this.contracts();
    }

    return this.contracts().filter((contract) => {
      const searchable = [
        contract.contractNo,
        contract.customerTitle,
        contract.tourCodeName,
        contract.senderName,
        contract.agencyName,
        contract.agencyContact,
        contract.email,
        contract.phone,
        contract.signerName,
        contract.contractText,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return searchable.includes(query);
    });
  });

  async ngOnInit(): Promise<void> {
    const savedPin = sessionStorage.getItem('ejder-dashboard-pin');

    if (!savedPin) {
      this.loading.set(false);
      return;
    }

    this.dashboardPin.set(savedPin);
    await this.loadContracts(savedPin);
  }

  protected async loadContracts(pin = this.dashboardPin()): Promise<void> {
    if (!pin) {
      this.authorized.set(false);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      this.contracts.set(await this.contractService.listContracts(pin));
      sessionStorage.setItem('ejder-dashboard-pin', pin);
      this.dashboardPin.set(pin);
      this.authorized.set(true);
    } catch (error) {
      sessionStorage.removeItem('ejder-dashboard-pin');
      this.authorized.set(false);
      this.contracts.set([]);
      this.errorMessage.set(error instanceof Error ? error.message : 'Sözleşmeler yüklenemedi');
    } finally {
      this.loading.set(false);
    }
  }

  protected updateDashboardPin(event: Event): void {
    this.dashboardPin.set((event.target as HTMLInputElement).value);
  }

  protected async unlockDashboard(): Promise<void> {
    const pin = this.dashboardPin().trim();

    if (!pin) {
      this.errorMessage.set('Dashboard PIN girin.');
      return;
    }

    this.authLoading.set(true);
    await this.loadContracts(pin);
    this.authLoading.set(false);
  }

  protected lockDashboard(): void {
    sessionStorage.removeItem('ejder-dashboard-pin');
    this.dashboardPin.set('');
    this.authorized.set(false);
    this.contracts.set([]);
    this.query.set('');
  }

  protected updateQuery(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.query.set(input.value);
  }

  protected getStatusLabel(contract: ContractRecord): string {
    return contract.status === 'signed' ? 'Onaylandı' : 'Onay bekliyor';
  }

  protected getShareLink(contract: ContractRecord): string {
    return `${window.location.origin}/sign/${contract.id}`;
  }

  protected getPdfLink(contract: ContractRecord): string {
    return `${window.location.origin}/pdf/${contract.id}`;
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

  protected async copyShareLink(contract: ContractRecord): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getShareLink(contract));
      this.copiedId.set(contract.id);
      setTimeout(() => {
        if (this.copiedId() === contract.id) {
          this.copiedId.set('');
        }
      }, 1800);
    } catch {
      this.errorMessage.set('Link kopyalanamadı');
    }
  }

  protected async copyPdfLink(contract: ContractRecord): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getPdfLink(contract));
      this.copiedPdfId.set(contract.id);
      setTimeout(() => {
        if (this.copiedPdfId() === contract.id) {
          this.copiedPdfId.set('');
        }
      }, 1800);
    } catch {
      this.errorMessage.set('PDF linki kopyalanamadı');
    }
  }

  protected async deleteContract(contract: ContractRecord): Promise<void> {
    const label = contract.contractNo || contract.customerTitle || contract.id;
    const confirmed = window.confirm(`${label} sözleşmesini kalıcı olarak silmek istiyor musunuz?`);

    if (!confirmed) {
      return;
    }

    const pin = window.prompt('Silme işlemi için admin PIN girin.');

    if (!pin) {
      return;
    }

    this.deletingId.set(contract.id);
    this.errorMessage.set('');

    try {
      await this.contractService.deleteContract(contract.id, pin);
      this.contracts.update((contracts) => contracts.filter((item) => item.id !== contract.id));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Sözleşme silinemedi');
    } finally {
      this.deletingId.set('');
    }
  }

  protected downloadPdf(contract: ContractRecord): void {
    window.open(this.getPdfLink(contract), '_blank', 'noopener,noreferrer');
  }

  /*
  protected legacyDownloadPdf(contract: ContractRecord): void {
    const win = window.open('', '_blank');

    if (!win) {
      this.errorMessage.set('PDF penceresi açılamadı');
      return;
    }

    const title = this.escapeHtml(contract.contractNo || contract.id);
    const senderSignature = contract.senderSignatureImage
      ? `<div class="signature-block"><strong>Ejder Turizm paraf / imza</strong><img class="signature" src="${this.escapeHtml(contract.senderSignatureImage)}" alt="Ejder Turizm imzası"></div>`
      : '';
    const customerSignature = contract.signatureImage
      ? `<div class="signature-block"><strong>Müşteri elektronik imzası</strong><img class="signature" src="${this.escapeHtml(contract.signatureImage)}" alt="Müşteri imzası"></div>`
      : '';
    const documentText = this.getContractText(contract);

    win.document.open();
    win.document.write(`
      <!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body { margin: 32px; color: #16120f; font-family: Georgia, 'Times New Roman', serif; }
            h1 { margin: 0 0 18px; text-align: center; font-size: 22px; }
            .meta { margin-bottom: 18px; font-family: Arial, sans-serif; font-size: 12px; }
            .meta div { margin: 5px 0; }
            .document { white-space: pre-wrap; line-height: 1.65; font-size: 12px; }
            .signature-wrap { margin-top: 28px; border-top: 1px solid #ddd; padding-top: 18px; }
            .signature-block { display: inline-grid; gap: 8px; min-width: 240px; margin: 0 28px 20px 0; vertical-align: top; font-family: Arial, sans-serif; font-size: 12px; }
            .signature { max-width: 320px; max-height: 120px; object-fit: contain; }
            @media print { body { margin: 18mm; } }
          </style>
        </head>
        <body>
          <h1>Özel Grup Paket Tur Sözleşmesi</h1>
          <section class="meta">
            <div><strong>Sözleşme No:</strong> ${title}</div>
            <div><strong>Müşteri:</strong> ${this.escapeHtml(contract.customerTitle || contract.agencyName || '-')}</div>
            <div><strong>Tur:</strong> ${this.escapeHtml(contract.tourCodeName || contract.notes || '-')}</div>
            <div><strong>Durum:</strong> ${this.getStatusLabel(contract)}</div>
            <div><strong>İmzalayan:</strong> ${this.escapeHtml(contract.signerName || '-')}</div>
            <div><strong>İmza tarihi:</strong> ${this.escapeHtml(contract.signDate || '-')}</div>
          </section>
          <article class="document">${this.escapeHtml(documentText)}</article>
          <section class="signature-wrap">${senderSignature}${customerSignature}</section>
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  }

  private getContractText(contract: ContractRecord): string {
    if (contract.contractText?.trim()) {
      return contract.contractText;
    }

    const template = contract.contractTemplate || contract.notes || '';
    const variables = contract.variables || {};

    return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      return variables[key]?.trim() || match;
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  */
}

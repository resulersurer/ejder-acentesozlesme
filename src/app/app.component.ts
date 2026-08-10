import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

type ContractDraft = {
  documentTitle: string;
  referenceNo: string;
  senderName: string;
  agencyName: string;
  agencyContact: string;
  effectiveDate: string;
  email: string;
  phone: string;
  contractText: string;
  signerName: string;
  notes: string;
};

const storageKey = 'ejder-acentasozlesme-draft';

const defaultDraft: ContractDraft = {
  documentTitle: 'Kapalı Grup Sözleşmesi',
  referenceNo: '',
  senderName: '',
  agencyName: '',
  agencyContact: '',
  effectiveDate: '',
  email: '',
  phone: '',
  contractText:
    'İşbu kapalı grup sözleşmesi, {{senderName}} ile {{agencyName}} arasında düzenlenmiştir.\n\nTaraflar, aşağıdaki koşulları kabul eder:\n\n1. Sözleşme referansı: {{referenceNo}}\n2. Yürürlük tarihi: {{effectiveDate}}\n3. İletişim kişisi: {{agencyContact}}\n\n{{notes}}\n\nBu metin, tarafların dolduracağı alanlara göre düzenlenebilir.',
  signerName: '',
  notes: '',
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  protected saving = false;
  protected statusMessage = 'Taslağını doldurduğunda bağlantı oluşturabilirsin.';
  protected shareLink = '';

  protected readonly form = this.fb.nonNullable.group({
    documentTitle: [defaultDraft.documentTitle],
    referenceNo: [defaultDraft.referenceNo],
    senderName: [defaultDraft.senderName],
    agencyName: [defaultDraft.agencyName],
    agencyContact: [defaultDraft.agencyContact],
    effectiveDate: [defaultDraft.effectiveDate],
    email: [defaultDraft.email],
    phone: [defaultDraft.phone],
    contractText: [defaultDraft.contractText],
    signerName: [defaultDraft.signerName],
    notes: [defaultDraft.notes],
  });

  ngOnInit(): void {
    this.loadInitialDraft();
    this.form.valueChanges.subscribe(() => {
      this.persistDraft();
    });
  }

  protected get draft(): ContractDraft {
    return this.form.getRawValue();
  }

  protected get previewTitle(): string {
    return this.draft.documentTitle?.trim() || 'Sözleşme Önizlemesi';
  }

  protected get previewReference(): string {
    return this.draft.referenceNo?.trim() ? `Ref: ${this.draft.referenceNo.trim()}` : 'Ref: -';
  }

  protected get previewSender(): string {
    return this.draft.senderName?.trim() || '-';
  }

  protected get previewAgency(): string {
    return this.draft.agencyName?.trim() || '-';
  }

  protected get previewDate(): string {
    return this.draft.effectiveDate?.trim() || '-';
  }

  protected get previewContact(): string {
    return [this.draft.agencyContact, this.draft.email, this.draft.phone].filter(Boolean).join(' • ') || '-';
  }

  protected get previewBody(): string {
    return this.replaceTokens(this.draft.contractText || defaultDraft.contractText, this.draft).trim();
  }

  protected get previewSigner(): string {
    return this.draft.signerName?.trim() || '-';
  }

  protected get previewNotes(): string {
    return this.draft.notes?.trim() || '-';
  }

  protected get shareHint(): string {
    return this.draft.agencyName?.trim()
      ? `Bu taslağı ${this.draft.agencyName.trim()} ile paylaşacak bir bağlantı oluşturabilirsin.`
      : 'Taslağını doldurduğunda tek tıkla bağlantı oluşturabilirsin.';
  }

  protected async createShareLink(): Promise<void> {
    this.saving = true;

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.draft),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = (await response.json()) as { id: string };
      this.shareLink = `${window.location.origin}?draft=${encodeURIComponent(result.id)}`;

      try {
        await navigator.clipboard.writeText(this.shareLink);
        this.statusMessage = 'Link oluşturuldu ve panoya kopyalandı.';
      } catch {
        this.statusMessage = 'Link oluşturuldu. İstersen elle kopyalayabilirsin.';
      }
    } catch {
      this.statusMessage = 'Link oluşturulamadı. DATABASE_URL ve API bağlantısını kontrol et.';
    } finally {
      this.saving = false;
    }
  }

  protected printDocument(): void {
    window.print();
  }

  protected resetForm(): void {
    this.form.reset(defaultDraft);
    this.shareLink = '';
    this.statusMessage = 'Taslağın sıfırlandı.';
    localStorage.removeItem(storageKey);
  }

  private async loadInitialDraft(): Promise<void> {
    const queryDraftId = new URL(window.location.href).searchParams.get('draft');

    if (queryDraftId) {
      await this.loadDraftFromServer(queryDraftId);
      return;
    }

    const storedDraft = localStorage.getItem(storageKey);
    if (!storedDraft) {
      return;
    }

    try {
      this.form.patchValue(JSON.parse(storedDraft) as Partial<ContractDraft>);
      this.statusMessage = 'Yerel taslak geri yüklendi.';
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  private async loadDraftFromServer(draftId: string): Promise<void> {
    try {
      const response = await fetch(`/api/contracts?id=${encodeURIComponent(draftId)}`);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = (await response.json()) as ContractDraft;
      this.form.patchValue(result);
      this.shareLink = `${window.location.origin}?draft=${encodeURIComponent(draftId)}`;
      this.statusMessage = 'Paylaşılan taslak yüklendi.';
    } catch {
      this.statusMessage = 'Paylaşılan taslak yüklenemedi.';
    }
  }

  private persistDraft(): void {
    localStorage.setItem(storageKey, JSON.stringify(this.draft));
  }

  private replaceTokens(template: string, data: ContractDraft): string {
    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, token: keyof ContractDraft) => {
      return String(data[token] ?? '');
    });
  }
}
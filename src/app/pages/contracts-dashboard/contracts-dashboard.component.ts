import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContractRecord, ContractService } from '../../contract.service';

@Component({
  selector: 'app-contracts-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './contracts-dashboard.component.html',
  styleUrl: './contracts-dashboard.component.css',
})
export class ContractsDashboardComponent implements OnInit {
  private readonly contractService = inject(ContractService);

  protected readonly contracts = signal<ContractRecord[]>([]);
  protected readonly query = signal('');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly copiedId = signal('');

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
        contract.senderName,
        contract.agencyName,
        contract.agencyContact,
        contract.email,
        contract.phone,
        contract.signerName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return searchable.includes(query);
    });
  });

  async ngOnInit(): Promise<void> {
    await this.loadContracts();
  }

  protected async loadContracts(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      this.contracts.set(await this.contractService.listContracts());
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Sözleşmeler yüklenemedi');
    } finally {
      this.loading.set(false);
    }
  }

  protected updateQuery(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.query.set(input.value);
  }

  protected getStatusLabel(contract: ContractRecord): string {
    return contract.status === 'signed' ? 'İmzalandı' : 'İmza bekliyor';
  }

  protected getShareLink(contract: ContractRecord): string {
    return `${window.location.origin}/sign/${contract.id}`;
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
}

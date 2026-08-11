import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContractService, ContractRecord } from '../../contract.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contractService = inject(ContractService);

  protected contract: ContractRecord | null = null;
  protected contractId = '';
  protected loading = true;
  protected shareLink = '';
  protected linkCopied = false;

  ngOnInit(): void {
    this.route.params.subscribe(async (params) => {
      this.contractId = params['id'];

      if (!this.contractId) {
        await this.router.navigate(['/']);
        return;
      }

      try {
        const adminPin = sessionStorage.getItem('ejder-dashboard-pin');

        if (!adminPin) {
          await this.router.navigate(['/dashboard']);
          return;
        }

        this.contract = await this.contractService.getContract(this.contractId, adminPin);
        this.shareLink = `${window.location.origin}/sign/${this.contractId}`;
      } catch {
        await this.router.navigate(['/']);
      } finally {
        this.loading = false;
      }
    });
  }

  protected async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareLink);
      this.linkCopied = true;
      setTimeout(() => {
        this.linkCopied = false;
      }, 2000);
    } catch {
      console.error('Failed to copy');
    }
  }

  protected async sendEmail(): Promise<void> {
    const subject = 'Sözleşme imzalanması gerekli';
    const body = encodeURIComponent(
      `Merhaba,\n\nAşağıdaki linki açarak sözleşmeyi imzalamanız gerekli:\n\n${this.shareLink}\n\nTeşekkürler.`
    );
    window.open(`mailto:${this.contract?.email}?subject=${encodeURIComponent(subject)}&body=${body}`);
  }

  protected async goBack(): Promise<void> {
    await this.router.navigate(['/']);
  }
}

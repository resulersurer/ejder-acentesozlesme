import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ContractService, ContractRecord, SignatureData } from '../../contract.service';

@Component({
  selector: 'app-agency-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agency-form.component.html',
  styleUrl: './agency-form.component.css',
})
export class AgencyFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contractService = inject(ContractService);
  private readonly fb = inject(FormBuilder);

  protected contract: ContractRecord | null = null;
  protected contractId = '';
  protected loading = true;
  protected saving = false;
  protected saved = false;
  protected errorMessage = '';

  protected readonly form = this.fb.nonNullable.group({
    signerName: [''],
    signerTitle: [''],
    signDate: [''],
  });

  ngOnInit(): void {
    this.route.params.subscribe(async (params) => {
      this.contractId = params['id'];

      if (!this.contractId) {
        await this.router.navigate(['/']);
        return;
      }

      try {
        this.contract = await this.contractService.getContract(this.contractId);
        this.saved = this.contract.status === 'signed';
      } catch {
        await this.router.navigate(['/']);
      } finally {
        this.loading = false;
      }
    });
  }

  protected async submitSignature(): Promise<void> {
    this.saving = true;
    this.errorMessage = '';

    try {
      const signature = this.form.getRawValue() as SignatureData;
      this.contract = await this.contractService.signContract(this.contractId, signature);
      this.saved = true;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Hata oluştu';
    } finally {
      this.saving = false;
    }
  }

  protected printContract(): void {
    window.print();
  }
}

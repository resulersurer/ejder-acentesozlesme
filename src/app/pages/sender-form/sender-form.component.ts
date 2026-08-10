import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContractService, ContractData } from '../../contract.service';

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

  protected readonly form = this.fb.nonNullable.group({
    senderName: [''],
    agencyName: [''],
    agencyContact: [''],
    effectiveDate: [''],
    email: [''],
    phone: [''],
    notes: [''],
  });

  protected async submitForm(): Promise<void> {
    this.saving = true;
    this.errorMessage = '';

    try {
      const data = this.form.getRawValue() as ContractData;
      const result = await this.contractService.createContract(data);
      await this.router.navigate(['/admin', result.id]);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Hata oluştu';
    } finally {
      this.saving = false;
    }
  }
}

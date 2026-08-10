import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
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
export class AgencyFormComponent implements OnInit, AfterViewInit {
  @ViewChild('signatureCanvas') private signatureCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contractService = inject(ContractService);
  private readonly fb = inject(FormBuilder);
  private drawing = false;
  private hasSignature = false;

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
        setTimeout(() => this.prepareCanvas());
      }
    });
  }

  ngAfterViewInit(): void {
    this.prepareCanvas();
  }

  protected async submitSignature(): Promise<void> {
    this.saving = true;
    this.errorMessage = '';

    try {
      if (!this.hasSignature) {
        this.errorMessage = 'Lütfen imza alanına imzanızı atın.';
        return;
      }

      const signature = {
        ...(this.form.getRawValue() as Omit<SignatureData, 'signatureImage'>),
        signatureImage: this.getSignatureImage(),
      };
      this.contract = await this.contractService.signContract(this.contractId, signature);
      this.saved = true;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Hata oluştu';
    } finally {
      this.saving = false;
    }
  }

  protected beginSignature(event: PointerEvent): void {
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    this.drawing = true;
    this.hasSignature = true;
    const point = this.getCanvasPoint(event, canvas);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  protected drawSignature(event: PointerEvent): void {
    if (!this.drawing) {
      return;
    }

    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    const point = this.getCanvasPoint(event, canvas);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  protected endSignature(event: PointerEvent): void {
    const canvas = this.signatureCanvas?.nativeElement;

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    this.drawing = false;
  }

  protected clearSignature(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    this.hasSignature = false;
  }

  protected printContract(): void {
    window.print();
  }

  private prepareCanvas(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    context.scale(scale, scale);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2.4;
    context.strokeStyle = '#17120f';
  }

  private getCanvasPoint(event: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private getSignatureImage(): string {
    const canvas = this.signatureCanvas?.nativeElement;
    return canvas?.toDataURL('image/png') ?? '';
  }
}

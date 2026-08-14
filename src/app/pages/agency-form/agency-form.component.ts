import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ContractService, ContractRecord, DEFAULT_SENDER_SIGNATURE_IMAGE, SignatureData } from '../../contract.service';
import {
  CONTRACT_TEMPLATE,
  CONTRACT_VARIABLES,
  CONTRACT_VARIABLE_OWNERS,
  ContractVariableKey,
} from '../../contract-template';
import { syncFormControlGroups } from '../../form-field-sync';

type TemplatePart =
  | { type: 'text'; value: string }
  | { type: 'field'; key: ContractVariableKey };

type TemplateLine = {
  value: string;
  className: string;
  parts: TemplatePart[];
};

@Component({
  selector: 'app-agency-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agency-form.component.html',
  styleUrl: './agency-form.component.css',
})
export class AgencyFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('signatureCanvas') private signatureCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contractService = inject(ContractService);
  private readonly fb = inject(FormBuilder);
  private drawing = false;
  private hasSignature = false;
  private syncedFields = new Subscription();

  protected contract: ContractRecord | null = null;
  protected contractId = '';
  protected loading = true;
  protected saving = false;
  protected saved = false;
  protected errorMessage = '';
  protected customerFieldKeys: ContractVariableKey[] = [];
  protected templateLines: TemplateLine[] = [];
  protected hasFullContract = false;
  protected readonly senderSignatureImage = DEFAULT_SENDER_SIGNATURE_IMAGE;

  protected readonly form = this.fb.nonNullable.group({
    signerName: [''],
    signerTitle: [''],
    signDate: [this.getTodayInputValue()],
  });

  protected readonly customerForm = this.fb.nonNullable.group<Record<string, any>>({});

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
        this.setupDocument();
      } catch {
        this.errorMessage = 'Sözleşme bulunamadı veya bağlantı geçersiz.';
      } finally {
        this.loading = false;
        setTimeout(() => this.prepareCanvas());
      }
    });
  }

  ngAfterViewInit(): void {
    this.prepareCanvas();
  }

  ngOnDestroy(): void {
    this.syncedFields.unsubscribe();
  }

  protected async submitSignature(): Promise<void> {
    this.saving = true;
    this.errorMessage = '';

    try {
      if (this.missingRequiredCount > 0) {
        this.errorMessage = `${this.missingRequiredCount} zorunlu alan eksik.`;
        return;
      }

      const signer = this.form.getRawValue();
      if (!signer.signerName.trim() || !signer.signerTitle.trim()) {
        this.errorMessage = 'Lütfen ad soyad ve ünvan alanlarını doldurun.';
        return;
      }

      if (!this.hasSignature) {
        this.errorMessage = 'Lütfen imza alanına imzanızı atın.';
        return;
      }

      const customerVariables = this.customerForm.getRawValue() as Record<string, string>;
      const variables = {
        ...(this.contract?.variables ?? {}),
        ...customerVariables,
      };
      const signature: SignatureData = {
        ...(signer as Omit<SignatureData, 'signatureImage'>),
        signatureImage: this.getSignatureImage(),
        customerVariables,
        variables,
        contractText: this.renderContractText(variables),
      };

      this.contract = await this.contractService.signContract(this.contractId, signature);
      this.saved = true;
      this.setupDocument();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Hata oluştu';
    } finally {
      this.saving = false;
    }
  }

  protected get missingRequiredCount(): number {
    return this.customerFieldKeys.filter((key) => {
      const value = String(this.customerForm.controls[key]?.value ?? '').trim();
      return this.isRequired(key) && !value;
    }).length;
  }

  protected isCustomerField(key: ContractVariableKey): boolean {
    return this.customerFieldKeys.includes(key) && !this.saved;
  }

  protected isRequired(key: ContractVariableKey): boolean {
    const setting = this.contract?.variableSettings?.[key];
    const fallback = CONTRACT_VARIABLES.find((field) => field.key === key)?.required ?? false;
    return this.isCustomerOwned(key) && (setting?.required ?? fallback);
  }

  protected isCustomerOwned(key: ContractVariableKey): boolean {
    return CONTRACT_VARIABLE_OWNERS[key] === 'customer';
  }

  protected isMissing(key: ContractVariableKey): boolean {
    const value = String(this.customerForm.controls[key]?.value ?? '').trim();
    return this.isCustomerField(key) && this.isRequired(key) && !value;
  }

  protected getVariableLabel(key: ContractVariableKey): string {
    return CONTRACT_VARIABLES.find((field) => field.key === key)?.label ?? key;
  }

  protected isSenderSignatureLine(line: TemplateLine, lineIndex: number): boolean {
    return (
      line.value.includes('Paraf / İmza') &&
      lineIndex > 0 &&
      this.templateLines[lineIndex - 1].value.includes('{{ejderAuthorizedName}}')
    );
  }

  protected getVariablePlaceholder(key: ContractVariableKey): string {
    return CONTRACT_VARIABLES.find((field) => field.key === key)?.placeholder ?? '';
  }

  protected getVariableValue(key: ContractVariableKey): string {
    if (this.isCustomerField(key)) {
      return String(this.customerForm.controls[key]?.value ?? '');
    }

    const value = this.getStoredVariableValue(key);
    return value || (key === 'pageCount' ? '7 (yedi)' : '');
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

  protected downloadPdf(): void {
    window.print();
  }

  private setupDocument(): void {
    if (!this.contract) {
      return;
    }

    this.hasFullContract = Boolean(
      this.contract.contractTemplate || this.contract.contractText || Object.keys(this.contract.variables ?? {}).length > 0
    );

    if (!this.hasFullContract) {
      this.templateLines = [];
      this.customerFieldKeys = [];
      return;
    }

    const template = this.contract.contractTemplate || CONTRACT_TEMPLATE;
    this.templateLines = template.split('\n').map((line) => ({
      value: line,
      className: this.getLineClass(line),
      parts: this.parseLine(line),
    }));

    this.customerFieldKeys = this.getCustomerFieldKeys(template);
    for (const key of this.customerFieldKeys) {
      if (!this.customerForm.contains(key)) {
        this.customerForm.addControl(key, this.fb.nonNullable.control(''));
      }
    }

    this.syncedFields.unsubscribe();
    this.syncedFields = syncFormControlGroups(this.customerForm, [
      ['customerRepresentative', 'customerAuthorizedName'],
    ]);
  }

  private getCustomerFieldKeys(template: string): ContractVariableKey[] {
    if (!this.contract || this.saved) {
      return [];
    }

    const keys = new Set<ContractVariableKey>();
    for (const match of template.matchAll(/\{\{(\w+)\}\}/g)) {
      const key = match[1] as ContractVariableKey;
      const known = CONTRACT_VARIABLES.some((field) => field.key === key);
      const value = this.getStoredVariableValue(key).trim();
      const fillable = this.contract.variableSettings?.[key]?.fillable ?? true;

      if (known && this.isCustomerOwned(key) && fillable && !value) {
        keys.add(key);
      }
    }

    return [...keys];
  }

  private getStoredVariableValue(key: ContractVariableKey): string {
    const variables = this.contract?.variables ?? {};
    const customerVariables = this.contract?.customerVariables ?? {};
    const directValue = this.contract?.[key as keyof ContractRecord];
    return customerVariables[key] ?? variables[key] ?? (typeof directValue === 'string' ? directValue : '');
  }

  private renderContractText(variables: Record<string, string>): string {
    const template = this.contract?.contractTemplate || CONTRACT_TEMPLATE;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key: ContractVariableKey) => {
      const value = variables[key]?.trim() || this.getStoredVariableValue(key).trim();
      return value || match;
    });
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

    if (line.startsWith('ÖZEL') || line.startsWith('KISALTILMI')) {
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

  private getTodayInputValue(): string {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }
}

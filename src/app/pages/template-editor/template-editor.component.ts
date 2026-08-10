import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CONTRACT_TEMPLATE, CONTRACT_VARIABLES, ContractVariableKey } from '../../contract-template';
import { getContractTemplate, resetContractTemplate, saveContractTemplate } from '../../contract-template-storage';

@Component({
  selector: 'app-template-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './template-editor.component.html',
  styleUrl: './template-editor.component.css',
})
export class TemplateEditorComponent {
  private readonly fb = inject(FormBuilder);

  protected readonly variables = CONTRACT_VARIABLES;
  protected savedMessage = '';

  protected readonly form = this.fb.nonNullable.group({
    templateText: [getContractTemplate()],
  });

  protected get previewText(): string {
    return this.form.controls.templateText.value.replace(/\{\{(\w+)\}\}/g, (_match, key: ContractVariableKey) => {
      const variable = CONTRACT_VARIABLES.find((field) => field.key === key);
      return variable ? `[${variable.label}]` : `{{${key}}}`;
    });
  }

  protected saveTemplate(): void {
    saveContractTemplate(this.form.controls.templateText.value);
    this.showMessage('Sözleşme metni kaydedildi.');
  }

  protected resetTemplate(): void {
    resetContractTemplate();
    this.form.controls.templateText.setValue(CONTRACT_TEMPLATE);
    this.showMessage('Varsayılan sözleşme metnine dönüldü.');
  }

  protected copyVariable(key: string): void {
    navigator.clipboard.writeText(`{{${key}}}`).then(() => {
      this.showMessage(`{{${key}}} kopyalandı.`);
    });
  }

  private showMessage(message: string): void {
    this.savedMessage = message;
    setTimeout(() => {
      if (this.savedMessage === message) {
        this.savedMessage = '';
      }
    }, 2200);
  }
}

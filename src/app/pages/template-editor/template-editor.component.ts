import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CONTRACT_TEMPLATE, CONTRACT_VARIABLES, ContractVariableKey } from '../../contract-template';
import {
  VariableSettingsMap,
  getContractTemplate,
  getVariableSettings,
  resetContractTemplate,
  resetVariableSettings,
  saveContractTemplate,
  saveVariableSettings,
} from '../../contract-template-storage';

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
  protected settings: VariableSettingsMap = getVariableSettings();
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
    saveVariableSettings(this.settings);
    this.showMessage('Sözleşme metni kaydedildi.');
  }

  protected resetTemplate(): void {
    resetContractTemplate();
    resetVariableSettings();
    this.settings = getVariableSettings();
    this.form.controls.templateText.setValue(CONTRACT_TEMPLATE);
    this.showMessage('Varsayılan sözleşme metni ve alan ayarlarına dönüldü.');
  }

  protected copyVariable(key: string): void {
    navigator.clipboard.writeText(`{{${key}}}`).then(() => {
      this.showMessage(`{{${key}}} kopyalandı.`);
    });
  }

  protected updateFillable(key: ContractVariableKey, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.settings = {
      ...this.settings,
      [key]: {
        ...this.settings[key],
        fillable: input.checked,
      },
    };
  }

  protected updateRequired(key: ContractVariableKey, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.settings = {
      ...this.settings,
      [key]: {
        ...this.settings[key],
        required: input.checked,
      },
    };
  }

  protected updateDefaultValue(key: ContractVariableKey, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.settings = {
      ...this.settings,
      [key]: {
        ...this.settings[key],
        defaultValue: input.value,
      },
    };
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

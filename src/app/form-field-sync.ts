import { AbstractControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

export const syncFormControlGroups = (
  form: FormGroup,
  groups: readonly (readonly string[])[]
): Subscription => {
  const subscription = new Subscription();

  for (const group of groups) {
    const controls = group
      .map((key) => form.get(key))
      .filter((control): control is AbstractControl => control !== null);

    const seedValue = controls.find((control) => String(control.value ?? '').trim())?.value;
    if (seedValue !== undefined) {
      for (const control of controls) {
        if (!String(control.value ?? '').trim()) {
          control.setValue(seedValue, { emitEvent: false });
        }
      }
    }

    for (const control of controls) {
      subscription.add(
        control.valueChanges.subscribe((value) => {
          for (const otherControl of controls) {
            if (otherControl !== control && otherControl.value !== value) {
              otherControl.setValue(value, { emitEvent: false });
            }
          }
        })
      );
    }
  }

  return subscription;
};

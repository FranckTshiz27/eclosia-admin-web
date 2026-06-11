import { Component, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './mfa.component.html',
  styleUrl: './mfa.component.css'
})
export class MfaComponent {
  @ViewChildren('digitInput') inputs!: QueryList<ElementRef>;
  mfaCode: string[] = ['', '', '', '', '', ''];
  isLoading = false;

  constructor(private router: Router) {}

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  onDigitInput(value: string, index: number) {
    // Remove any non-numeric characters from the new value
    const cleanedValue = value ? value.replace(/[^0-9]/g, '') : '';

    if (cleanedValue.length > 0) {
      // Take only the last character entered
      const lastChar = cleanedValue.charAt(cleanedValue.length - 1);
      this.mfaCode[index] = lastChar;

      // Allow Angular view to update, then focus next
      setTimeout(() => {
        if (index < 5) {
          const nextInput = this.inputs.toArray()[index + 1].nativeElement;
          nextInput.focus();
          nextInput.select();
        } else {
          // If we reach the last box, automatically verify
          const targetInput = this.inputs.toArray()[index].nativeElement;
          targetInput.blur();
          this.checkAndVerify();
        }
      }, 10);
    } else {
      this.mfaCode[index] = '';
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      // If current input is empty, move focus to previous input and clear it
      if (!this.mfaCode[index] && index > 0) {
        event.preventDefault(); // Prevent default backspace behavior
        const prevInput = this.inputs.toArray()[index - 1].nativeElement;
        this.mfaCode[index - 1] = '';
        prevInput.focus();
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
       this.inputs.toArray()[index - 1].nativeElement.focus();
       setTimeout(() => this.inputs.toArray()[index - 1].nativeElement.select(), 10);
    } else if (event.key === 'ArrowRight' && index < 5) {
       this.inputs.toArray()[index + 1].nativeElement.focus();
       setTimeout(() => this.inputs.toArray()[index + 1].nativeElement.select(), 10);
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text');
    
    if (pasteData) {
      // Clean paste data to only keep numbers
      const numericData = pasteData.replace(/[^0-9]/g, '');
      const digits = numericData.split('').slice(0, 6);
      
      if (digits.length > 0) {
        // Reset code array first
        this.mfaCode = ['', '', '', '', '', ''];
        
        // Fill array with pasted digits
        digits.forEach((digit, i) => {
          this.mfaCode[i] = digit;
        });
        
        // Focus the input after the last pasted digit, or the last input
        setTimeout(() => {
          const nextIndex = Math.min(digits.length, 5);
          if (digits.length === 6) {
             this.inputs.toArray()[5].nativeElement.blur();
             this.checkAndVerify();
          } else {
             const targetInput = this.inputs.toArray()[nextIndex].nativeElement;
             targetInput.focus();
          }
        }, 10);
      }
    }
  }

  checkAndVerify() {
    // Check if exactly 6 digits are filled
    const fullCode = this.mfaCode.join('');
    if (fullCode.length === 6 && /^[0-9]{6}$/.test(fullCode)) {
      this.verifyCode();
    }
  }

  verifyCode() {
    this.isLoading = true;
    const code = this.mfaCode.join('');
    console.log('Verifying MFA code:', code);
    
    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/agents']);
    }, 1500);
  }

  resendCode() {
    console.log('Resending MFA code...');
    // Add logic to resend code
  }
}

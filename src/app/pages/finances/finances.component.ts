import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EcoleCurrenciesComponent } from './ecole-currencies/ecole-currencies.component';
import { EcoleExchangeRatesComponent } from './ecole-exchange-rates/ecole-exchange-rates.component';
import { EcoleFeeCategoriesComponent } from './ecole-fee-categories/ecole-fee-categories.component';
import { EcolePaymentInstallmentsComponent } from './ecole-payment-installments/ecole-payment-installments.component';
import { EcoleSchoolFeesComponent } from './ecole-school-fees/ecole-school-fees.component';
import { EcolePaymentsComponent } from './ecole-payments/ecole-payments.component';
import { EcoleFinancialStatementsComponent } from './ecole-financial-statements/ecole-financial-statements.component';

type FinancesTab =
  | 'devises'
  | 'taux'
  | 'categories-frais'
  | 'tranches-paiement'
  | 'frais-scolaires'
  | 'montants-classe'
  | 'paiements'
  | 'etats-financiers'
  | 'remises-bourses'
  | 'penalites'
  | 'recus'
  | 'rapports-financiers';

@Component({
  selector: 'app-finances',
  standalone: true,
  imports: [
    CommonModule,
    EcoleCurrenciesComponent,
    EcoleExchangeRatesComponent,
    EcoleFeeCategoriesComponent,
    EcolePaymentInstallmentsComponent,
    EcoleSchoolFeesComponent,
    EcolePaymentsComponent,
    EcoleFinancialStatementsComponent
  ],
  templateUrl: './finances.component.html',
  styleUrl: './finances.component.css'
})
export class FinancesComponent implements OnInit {
  activeTab: FinancesTab = 'categories-frais';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab') as FinancesTab | null;
      if (this.isValidTab(tab)) {
        this.activeTab = tab;
      } else if (!tab) {
        this.activeTab = 'categories-frais';
      }
    });
  }

  private isValidTab(tab: string | null): tab is FinancesTab {
    return (
      tab === 'devises' ||
      tab === 'taux' ||
      tab === 'categories-frais' ||
      tab === 'tranches-paiement' ||
      tab === 'frais-scolaires' ||
      tab === 'montants-classe' ||
      tab === 'paiements' ||
      tab === 'etats-financiers' ||
      tab === 'remises-bourses' ||
      tab === 'penalites' ||
      tab === 'recus' ||
      tab === 'rapports-financiers'
    );
  }
}

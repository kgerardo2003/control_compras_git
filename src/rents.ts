export type PropertyLocation = 'CA' | 'OKC' | 'GT';

export type UnitOccupancyStatus = 'Occupied' | 'Vacant';

export type PaymentStatus = 'Paid' | 'Partial' | 'Delinquent' | 'Vacant';

export type PaymentMethod = 'ACH' | 'CreditCard' | 'Check' | 'Cash' | 'WireTransfer';

export interface PaymentTransaction {
  id: string;
  date: string;
  amount: number;
  amortizedDebt: number;
  amortizedRent: number;
  amortizedLateFee: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
}

export interface RentalUnit {
  id: string; // e.g. "CA-001"
  unitNumber: string;
  address: string;
  city: string;
  location: PropertyLocation;
  unitStatus: UnitOccupancyStatus;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  leaseStart?: string;
  leaseEnd?: string;
  vacantMonths: number;
  
  // Financial parameters
  scheduledRent: number;
  previousDebt: number;
  actualCollected: number;
  lateFeesScheduled: number;
  lateFeesPaid: number;
  utilitiesScheduled: number;
  utilitiesPaid: number;
  
  // Computed / dynamically resolved
  paymentStatus: PaymentStatus;
  totalDue: number;
  carryoverBalance: number;
  
  // Operational metrics
  maintenanceDaysAvg?: number;
  billingAccuracyRate?: number;
  tenantRetentionRate?: number;
  
  // Payment history
  paymentHistory: PaymentTransaction[];
}

export interface ExecutiveKPIs {
  effectiveCollectionRate: number; // Percentage
  delinquencyRate: number;         // Percentage
  delinquencyAmount: number;       // USD Total
  occupancyRate: number;           // Percentage
  maintenanceTime: number;         // Average Days / Hours
  billingAccuracy: number;         // Percentage
  reportingCompliance: number;     // Percentage
  tenantRetention: number;         // Percentage
  totalVacancyMonths: number;      // Total Count
  totalRevenueMTD: number;         // USD Collected
  
  // Contextual Totals
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalScheduledRent: number;
  totalPreviousDebt: number;
  totalDueSum: number;
}

export type AlertSeverity = 'critical' | 'warning' | 'optimal';

export interface DecisionAlert {
  id: string;
  severity: AlertSeverity;
  titleKey: string;
  location: PropertyLocation | 'Global';
  metricValue: string;
  descriptionKey: string;
  actionKey: string;
  actionPayload?: any;
}

export type AppLanguage = 'en' | 'es';

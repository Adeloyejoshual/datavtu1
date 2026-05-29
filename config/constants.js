// ======================================================
// Transaction Types
// ======================================================

export const TRANSACTION_TYPES = {
  WALLET_FUNDING: "wallet_funding",

  DATA_PURCHASE: "data_purchase",

  AIRTIME_PURCHASE: "airtime_purchase",

  ELECTRICITY_PURCHASE: "electricity_purchase",

  CABLE_PURCHASE: "cable_purchase",

  BETTING_PURCHASE: "betting_purchase",

  TRANSFER: "transfer",

  REFERRAL_BONUS: "referral_bonus",

  COMMISSION: "commission",

  REVERSAL: "reversal",
};

// ======================================================
// Transaction Status
// ======================================================

export const TRANSACTION_STATUS = {
  PENDING: "pending",

  PROCESSING: "processing",

  SUCCESS: "success",

  FAILED: "failed",

  REVERSED: "reversed",
};

// ======================================================
// User Roles
// ======================================================

export const USER_ROLES = {
  USER: "user",

  ADMIN: "admin",

  AGENT: "agent",
};

// ======================================================
// Networks
// ======================================================

export const NETWORKS = {
  MTN: "mtn",

  GLO: "glo",

  AIRTEL: "airtel",

  ETISALAT: "etisalat",
};

// ======================================================
// VTpass Service IDs
// ======================================================

export const VTPASS_SERVICE_IDS = {
  // Data
  MTN_DATA: "mtn-data",

  GLO_DATA: "glo-data",

  AIRTEL_DATA: "airtel-data",

  ETISALAT_DATA: "etisalat-data",

  // Airtime
  MTN_AIRTIME: "mtn",

  GLO_AIRTIME: "glo",

  AIRTEL_AIRTIME: "airtel",

  ETISALAT_AIRTIME: "etisalat",

  // Cable
  DSTV: "dstv",

  GOTV: "gotv",

  STARTIMES: "startimes",

  // Electricity
  IKEDC: "ikeja-electric",

  EKEDC: "eko-electric",

  AEDC: "abuja-electric",

  KEDCO: "kano-electric",

  IBEDC: "ibadan-electric",

  PHED: "portharcourt-electric",

  // Betting
  BET9JA: "bet9ja",

  SPORTYBET: "sportybet",

  NAIRABET: "nairabet",

  MERRYBET: "merrybet",
};

// ======================================================
// Airtime Limits
// ======================================================

export const AIRTIME_LIMITS = {
  mtn: {
    min: 50,
    max: 50000,
  },

  glo: {
    min: 50,
    max: 50000,
  },

  airtel: {
    min: 50,
    max: 50000,
  },

  etisalat: {
    min: 50,
    max: 50000,
  },
};

// ======================================================
// Airtime Discount Rates
// ======================================================

export const AIRTIME_DISCOUNT_RATES = {
  mtn: 0.03,

  glo: 0.04,

  airtel: 0.03,

  etisalat: 0.03,
};

// ======================================================
// Commission Rates
// ======================================================

export const COMMISSION_RATES = {
  data: 0.03,

  airtime: 0.02,

  electricity: 0.015,

  cable: 0.02,

  betting: 0.01,
};

// ======================================================
// Cable Providers
// ======================================================

export const CABLE_PROVIDERS = {
  DSTV: "dstv",

  GOTV: "gotv",

  STARTIMES: "startimes",
};

// ======================================================
// Electricity Providers
// ======================================================

export const ELECTRICITY_PROVIDERS = {
  IKEDC: "ikeja-electric",

  EKEDC: "eko-electric",

  AEDC: "abuja-electric",

  KEDCO: "kano-electric",

  IBEDC: "ibadan-electric",

  PHED: "portharcourt-electric",
};

// ======================================================
// Betting Providers
// ======================================================

export const BETTING_PROVIDERS = {
  BET9JA: "bet9ja",

  SPORTYBET: "sportybet",

  NAIRABET: "nairabet",

  MERRYBET: "merrybet",
};

// ======================================================
// Referral Settings
// ======================================================

export const REFERRAL_BONUS_AMOUNT = 100;

export const REFERRAL_SETTINGS = {
  signupBonus: 100,

  referralBonus: 100,

  minimumWithdrawal: 500,

  maxReferralsPerDay: 20,
};

// ======================================================
// Wallet Limits
// ======================================================

export const MIN_WALLET_FUND = 100;

export const MAX_WALLET_FUND = 1000000;

// ======================================================
// API Settings
// ======================================================

export const API_TIMEOUT = 30000;

// ======================================================
// Pagination
// ======================================================

export const DEFAULT_PAGE_SIZE = 20;

export const MAX_PAGE_SIZE = 100;

// ======================================================
// Supported Currencies
// ======================================================

export const CURRENCIES = {
  NGN: "NGN",
};

// ======================================================
// Environment
// ======================================================

export const IS_PRODUCTION =
  process.env.NODE_ENV === "production";
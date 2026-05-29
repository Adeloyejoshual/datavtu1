export const TRANSACTION_TYPES = {
  WALLET_FUNDING: "wallet_funding",
  DATA_PURCHASE: "data_purchase",
  AIRTIME_PURCHASE: "airtime_purchase",
  ELECTRICITY_PURCHASE: "electricity_purchase",
  CABLE_PURCHASE: "cable_purchase",
  TRANSFER: "transfer",
  REFERRAL_BONUS: "referral_bonus",
  REVERSAL: "reversal",
};

export const TRANSACTION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
  REVERSED: "reversed",
};

export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
  AGENT: "agent",
};

export const NETWORKS = {
  MTN: "mtn",
  GLO: "glo",
  AIRTEL: "airtel",
  ETISALAT: "etisalat",
};

export const VTPASS_SERVICE_IDS = {
  MTN_DATA: "mtn-data",
  GLO_DATA: "glo-data",
  AIRTEL_DATA: "airtel-data",
  ETISALAT_DATA: "etisalat-data",
  MTN_AIRTIME: "mtn",
  GLO_AIRTIME: "glo",
  AIRTEL_AIRTIME: "airtel",
  ETISALAT_AIRTIME: "etisalat",
};

export const REFERRAL_BONUS_AMOUNT = 100; // Naira
export const MIN_WALLET_FUND = 100;
export const MAX_WALLET_FUND = 1000000;
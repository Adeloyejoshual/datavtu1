import { errorResponse } from "../utils/response.js";
import { NETWORKS, AIRTIME_LIMITS } from "../config/constants.js";

export function validateBuyAirtime(req, res, next) {
  const { network, phone, amount } = req.body;
  const errors = [];

  // Validate network
  const validNetworks = Object.values(NETWORKS);

  if (!network || !validNetworks.includes(network.toLowerCase())) {
    errors.push(`Network must be one of: ${validNetworks.join(", ")}`);
  }

  // Validate phone number
  if (!phone || !/^(\+234|0)[789]\d{9}$/.test(phone)) {
    errors.push("Valid Nigerian phone number is required.");
  }

  // Validate amount against network limits
  const networkKey = network?.toLowerCase();
  const limits = AIRTIME_LIMITS[networkKey];

  if (!amount || isNaN(amount)) {
    errors.push("Valid amount is required.");
  } else if (limits) {
    const parsedAmount = parseFloat(amount);

    if (parsedAmount < limits.min) {
      errors.push(
        `Minimum airtime amount for ${networkKey?.toUpperCase()} is ₦${limits.min}.`
      );
    }

    if (parsedAmount > limits.max) {
      errors.push(
        `Maximum airtime amount for ${networkKey?.toUpperCase()} is ₦${limits.max.toLocaleString()}.`
      );
    }
  }

  // Validate phone matches network prefix (optional but good UX)
  if (phone && network) {
    const networkPrefixMap = {
      mtn: ["0803", "0806", "0810", "0813", "0814", "0816", "0903", "0906", "0913", "0916", "07025", "07026"],
      glo: ["0805", "0807", "0811", "0815", "0905", "0915"],
      airtel: ["0802", "0808", "0812", "0901", "0902", "0907", "07028"],
      etisalat: ["0809", "0817", "0818", "0908", "0909"],
    };

    const normalizedPhone = phone.replace("+234", "0");
    const networkPrefixes = networkPrefixMap[networkKey] || [];

    const matchesNetwork = networkPrefixes.some((prefix) =>
      normalizedPhone.startsWith(prefix)
    );

    if (networkPrefixes.length > 0 && !matchesNetwork) {
      // Warn but don't block (user may be topping up another network)
      req.body.network_mismatch_warning = true;
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  // Sanitize
  req.body.network = network.toLowerCase();
  req.body.phone = phone.trim();
  req.body.amount = parseFloat(amount);

  next();
}

export function validateAirtimeToData(req, res, next) {
  const { network, phone, amount } = req.body;
  const errors = [];

  const validNetworks = ["mtn"]; // Only MTN supports airtime-to-data currently

  if (!network || !validNetworks.includes(network.toLowerCase())) {
    errors.push(`Airtime-to-data is only available for: ${validNetworks.join(", ")}`);
  }

  if (!phone || !/^(\+234|0)[789]\d{9}$/.test(phone)) {
    errors.push("Valid Nigerian phone number is required.");
  }

  if (!amount || isNaN(amount) || parseFloat(amount) < 100) {
    errors.push("Minimum airtime-to-data amount is ₦100.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.network = network.toLowerCase();
  req.body.phone = phone.trim();
  req.body.amount = parseFloat(amount);

  next();
}
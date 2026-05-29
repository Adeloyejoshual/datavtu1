import { errorResponse } from "../utils/response.js";
import { VTPASS_SERVICE_IDS } from "../config/constants.js";

export function validateElectricity(req, res, next) {
  const { service_id, meter_number, meter_type, amount } = req.body;
  const errors = [];

  if (!service_id || !Object.values(VTPASS_SERVICE_IDS).includes(service_id)) {
    errors.push("Invalid electricity service provider.");
  }

  if (!meter_number || meter_number.length < 6) {
    errors.push("Valid meter number is required.");
  }

  if (!meter_type || !["prepaid", "postpaid"].includes(meter_type)) {
    errors.push("Meter type must be prepaid or postpaid.");
  }

  if (!amount || isNaN(amount) || parseFloat(amount) < 1000) {
    errors.push("Minimum electricity purchase is ₦1000.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.amount = parseFloat(amount);
  req.body.service_id = service_id;
  req.body.meter_type = meter_type.toLowerCase();

  next();
}
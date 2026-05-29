import { buyElectricityService, validateMeter } from "../services/electricity.service.js";
import { successResponse, errorResponse } from "../utils/response.js";


// ✅ Validate meter endpoint
export async function verifyMeter(req, res) {
  try {
    const { service_id, meter_number, meter_type } = req.body;

    const result = await validateMeter(service_id, meter_number, meter_type);

    return successResponse(res, "Meter validated.", result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}


// ✅ Purchase electricity
export async function buyElectricity(req, res) {
  try {
    const result = await buyElectricityService(req.user.id, req.body);

    return successResponse(res, result.message, result.data);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
}
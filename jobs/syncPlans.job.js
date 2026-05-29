import { getDataPlans } from "../services/vtpass.service.js";
import { query } from "../database/db.js";
import { VTPASS_SERVICE_IDS } from "../config/constants.js";
import logger from "../utils/logger.js";

export async function syncDataPlans() {
  try {
    const networks = [
      { name: "mtn", serviceID: VTPASS_SERVICE_IDS.MTN_DATA },
      { name: "glo", serviceID: VTPASS_SERVICE_IDS.GLO_DATA },
      { name: "airtel", serviceID: VTPASS_SERVICE_IDS.AIRTEL_DATA },
      { name: "etisalat", serviceID: VTPASS_SERVICE_IDS.ETISALAT_DATA },
    ];

    for (const network of networks) {
      try {
        const plans = await getDataPlans(network.serviceID);

        for (const plan of plans) {
          await query(
            `INSERT INTO data_plans (network, plan_code, plan_name, amount, selling_price, validity, provider)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (plan_code) DO UPDATE SET
               plan_name = EXCLUDED.plan_name,
               amount = EXCLUDED.amount,
               selling_price = EXCLUDED.selling_price,
               updated_at = NOW()`,
            [
              network.name,
              plan.code,
              plan.name,
              plan.amount,
              plan.amount, // Can add markup here
              plan.validity,
              "vtpass",
            ]
          );
        }

        logger.info(`Synced ${plans.length} plans for ${network.name}`);

        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (err) {
        logger.error(`Failed to sync plans for ${network.name}`, {
          error: err.message,
        });
      }
    }
  } catch (error) {
    logger.error("Sync plans job failed", { error: error.message });
  }
}

export function startPlanSyncJob(intervalMs = 3600000) {
  // Run once on startup
  syncDataPlans();

  // Then every hour
  setInterval(syncDataPlans, intervalMs);

  logger.info("Plan sync job started");
}
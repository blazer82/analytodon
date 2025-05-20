import type { BoostsKpiDto, FavoritesKpiDto, FollowersKpiDto, RepliesKpiDto } from '@analytodon/rest-client';

type KpiDto = FollowersKpiDto | BoostsKpiDto | FavoritesKpiDto | RepliesKpiDto;

/**
 * Calculates the trend between the current and previous period for a KPI.
 * @param kpi The KPI data object.
 * @returns The trend as a decimal (e.g., 0.1 for 10% increase), or undefined if not calculable.
 */
export function getKPITrend(kpi: KpiDto): number | undefined {
  if (kpi.currentPeriod == null || kpi.previousPeriod == null) {
    return undefined;
  }

  // If previous period was 0
  if (kpi.previousPeriod === 0) {
    // If current period is also 0, trend is 0 (no change)
    if (kpi.currentPeriod === 0) {
      return 0;
    }
    // If current period is positive, trend is positive infinity (or a large number to signify huge growth)
    // For simplicity, let's return 1 (100% increase) if it's positive, or -1 if negative.
    // A more sophisticated approach might be needed depending on how "infinite" trend is displayed.
    return kpi.currentPeriod > 0 ? 1 : -1;
  }

  // Standard trend calculation
  const trend = (kpi.currentPeriod - kpi.previousPeriod) / Math.abs(kpi.previousPeriod);

  // Handle cases where trend might be Infinity or -Infinity if previousPeriod was non-zero but very small.
  // This check is mostly for safety, as previousPeriod === 0 is handled above.
  if (!isFinite(trend)) {
    return trend > 0 ? 1 : -1; // Or some other representation for extreme change
  }

  return trend;
}

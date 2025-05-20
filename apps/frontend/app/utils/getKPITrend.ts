import type { BoostsKpiDto, FavoritesKpiDto, FollowersKpiDto, RepliesKpiDto } from '@analytodon/rest-client';

type KpiDto = FollowersKpiDto | BoostsKpiDto | FavoritesKpiDto | RepliesKpiDto;

export const getKPITrend = ({ previousPeriod, currentPeriodProgress, currentPeriod }: KpiDto) => {
  if (!previousPeriod || !currentPeriod || !currentPeriodProgress) {
    return;
  }

  return (currentPeriod / currentPeriodProgress - previousPeriod) / previousPeriod;
};

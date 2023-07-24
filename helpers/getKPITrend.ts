import {KPI} from '@/types/KPI';

export const getKPITrend = ({previousPerdiod, currentPeriodProgress, currentPeriod}: KPI) => {
    if (!previousPerdiod || !currentPeriod || !currentPeriodProgress) {
        return;
    }

    return (currentPeriod / currentPeriodProgress - previousPerdiod) / previousPerdiod;
};

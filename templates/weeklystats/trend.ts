import {KPI} from '@/types/KPI';
import {getKPITrend} from '@/helpers/getKPITrend';
import {formatNumber} from '@/helpers/localization';

export default (kpi: KPI) => {
    const amount = formatNumber(kpi.currentPeriod ?? 0);
    const trend = getKPITrend(kpi);

    if (trend) {
        return `${amount} <span style="font-size: 24px; color: ${trend >= 0 ? 'green' : 'red'} "> (${trend >= 0 ? '+' : ''}${(trend * 100).toFixed(
            0,
        )}%)</span>`;
    }

    return `${amount}`;
};

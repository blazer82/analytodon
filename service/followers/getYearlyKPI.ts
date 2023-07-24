import {getDaysToYearBeginning} from '@/helpers/getDaysToYearBeginning';
import {getPeriodKPI} from '@/helpers/getPeriodKPI';
import {KPI} from '@/types/KPI';

export const getYearlyKPI = async (accountID: string, timezone: string): Promise<KPI> =>
    getPeriodKPI(accountID, timezone, getDaysToYearBeginning, 'followersCount');

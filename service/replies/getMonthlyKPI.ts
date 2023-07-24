import {getDaysToMonthBeginning} from '@/helpers/getDaysToMonthBeginning';
import {getPeriodKPI} from '@/helpers/getPeriodKPI';
import {KPI} from '@/types/KPI';

export const getMonthlyKPI = async (accountID: string, timezone: string): Promise<KPI> =>
    getPeriodKPI(accountID, timezone, getDaysToMonthBeginning, 'repliesCount');

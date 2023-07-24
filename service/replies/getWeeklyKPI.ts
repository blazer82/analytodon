import {getDaysToWeekBeginning} from '@/helpers/getDaysToWeekBeginning';
import {getPeriodKPI} from '@/helpers/getPeriodKPI';
import {KPI} from '@/types/KPI';

export const getWeeklyKPI = async (accountID: string, timezone: string): Promise<KPI> =>
    getPeriodKPI(accountID, timezone, getDaysToWeekBeginning, 'repliesCount');

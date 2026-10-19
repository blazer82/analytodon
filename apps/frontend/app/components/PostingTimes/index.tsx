import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { PostingTimesResponseDto } from '@analytodon/rest-client';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import { EnhancedPaper } from '~/components/Layout/styles';
import Title from '~/components/Title';

import {
  buildGrid,
  cellIntensity,
  cellValue,
  computeInsights,
  DAY_PARTS,
  DAYS_PER_WEEK,
  formatHour,
  HOURS_PER_DAY,
  maxCellValue,
  MIN_POSTS_FOR_AVERAGE,
  toPercentages,
  type PostingTimesGrid,
  type PostingTimesMetric,
  type SlotRef,
} from './insights';

interface PostingTimesProps {
  data: PostingTimesResponseDto | null;
  loading?: boolean;
}

const DAYS = Array.from({ length: DAYS_PER_WEEK }, (_, day) => day);
const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);
// 2024-01-01 was a Monday; used to get localized weekday names starting on Monday.
const weekdayNames = (locale: string, weekday: 'short' | 'long') => {
  const format = new Intl.DateTimeFormat(locale, { weekday, timeZone: 'UTC' });
  return DAYS.map((day) => format.format(new Date(Date.UTC(2024, 0, 1 + day))));
};

// useLayoutEffect warns during SSR in React 18; the tooltip only matters on the client anyway.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

const hatchPattern = (theme: Theme) =>
  `repeating-linear-gradient(45deg, transparent 0 3px, ${theme.palette.divider} 3px 4px)`;
const emptyCellColor = (theme: Theme) => theme.palette.action.hover;
const rampColor = (theme: Theme, intensity: number) => alpha(theme.palette.primary.main, intensity);

const PostingTimes: React.FunctionComponent<PostingTimesProps> = ({ data, loading }) => {
  const { t, i18n } = useTranslation('components.postingTimes');
  const theme = useTheme();
  const [metric, setMetric] = React.useState<PostingTimesMetric>('posts');
  const [active, setActive] = React.useState<SlotRef | null>(null);
  const [focusSlot, setFocusSlot] = React.useState<SlotRef>({ day: 0, hour: 0 });
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const cellRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const grid = React.useMemo<PostingTimesGrid>(() => buildGrid(data?.data ?? []), [data]);
  const insights = React.useMemo(() => computeInsights(grid), [grid]);
  const max = React.useMemo(() => maxCellValue(grid, metric), [grid, metric]);
  const shortDays = React.useMemo(() => weekdayNames(i18n.language, 'short'), [i18n.language]);
  const longDays = React.useMemo(() => weekdayNames(i18n.language, 'long'), [i18n.language]);
  const numberFormat = React.useMemo(
    () => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
    [i18n.language],
  );
  const formatAverage = (value: number) => numberFormat.format(value);

  const slotLabel = (day: number, hour: number) => `${longDays[day]} ${formatHour(hour)}–${formatHour(hour + 1)}`;
  const cellDescription = (day: number, hour: number) => {
    const posts = grid.posts[day][hour];
    const parts = [slotLabel(day, hour), t('tooltip.posts', { count: posts })];
    if (posts > 0) {
      parts.push(t('tooltip.average', { value: formatAverage(grid.engagement[day][hour] / posts) }));
    }
    return parts.join(' · ');
  };

  // Position the shared tooltip above the active cell (or below it if there's no room).
  useIsomorphicLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const wrapper = wrapperRef.current;
    const cell = active ? cellRefs.current[active.day * HOURS_PER_DAY + active.hour] : null;
    if (!tooltip || !wrapper || !cell) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const left = cellRect.left - wrapperRect.left + cellRect.width / 2 - tooltip.offsetWidth / 2;
    let top = cellRect.top - wrapperRect.top - tooltip.offsetHeight - 8;
    if (top < 0) top = cellRect.bottom - wrapperRect.top + 8;
    tooltip.style.left = `${Math.max(0, Math.min(left, wrapperRect.width - tooltip.offsetWidth))}px`;
    tooltip.style.top = `${top}px`;
  }, [active, metric]);

  const handleMetricChange = (_event: React.MouseEvent<HTMLElement>, value: PostingTimesMetric | null) => {
    if (value) setMetric(value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, day: number, hour: number) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    let next: SlotRef | null = null;
    if (moves[event.key]) {
      const [dx, dy] = moves[event.key];
      next = {
        day: Math.min(DAYS_PER_WEEK - 1, Math.max(0, day + dx)),
        hour: Math.min(HOURS_PER_DAY - 1, Math.max(0, hour + dy)),
      };
    } else if (event.key === 'Home') {
      next = { day: 0, hour };
    } else if (event.key === 'End') {
      next = { day: DAYS_PER_WEEK - 1, hour };
    } else if (event.key === 'Escape') {
      setActive(null);
      return;
    }
    if (next) {
      event.preventDefault();
      setFocusSlot(next);
      cellRefs.current[next.day * HOURS_PER_DAY + next.hour]?.focus();
    }
  };

  const hasData = insights.totalPosts > 0;
  const timezone = data?.timezone ?? '';
  const dayTotalsMax = Math.max(1, ...insights.dayTotals);
  const percentages = toPercentages(DAY_PARTS.map((part) => insights.dayPartShares[part]));
  const splitColors = [
    rampColor(theme, 0.2),
    theme.palette.secondary.light,
    theme.palette.primary.light,
    rampColor(theme, 1),
  ];

  const renderCell = (day: number, hour: number) => {
    const posts = grid.posts[day][hour];
    const value = cellValue(grid, metric, day, hour);
    const tooFew = metric === 'engagement' && value === null && posts > 0;
    const intensity = cellIntensity(value, max);
    const isActive = active?.day === day && active?.hour === hour;
    const isFocusTarget = focusSlot.day === day && focusSlot.hour === hour;

    return (
      <Box
        key={day}
        role="gridcell"
        ref={(element: HTMLDivElement | null) => {
          cellRefs.current[day * HOURS_PER_DAY + hour] = element;
        }}
        tabIndex={isFocusTarget ? 0 : -1}
        aria-label={cellDescription(day, hour)}
        onMouseEnter={() => setActive({ day, hour })}
        onClick={() => setActive({ day, hour })}
        onFocus={() => {
          setFocusSlot({ day, hour });
          setActive({ day, hour });
        }}
        onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => handleKeyDown(event, day, hour)}
        sx={{
          height: { xs: 13, sm: 15 },
          borderRadius: '3px',
          cursor: 'pointer',
          backgroundColor: intensity > 0 ? rampColor(theme, intensity) : emptyCellColor(theme),
          backgroundImage: tooFew ? hatchPattern(theme) : undefined,
          outline: isActive ? `2px solid ${theme.palette.text.primary}` : 'none',
          '&:focus-visible': { outline: `2px solid ${theme.palette.text.primary}` },
        }}
      />
    );
  };

  const renderTooltip = () => {
    if (!active) return null;
    const { day, hour } = active;
    const posts = grid.posts[day][hour];
    return (
      <Box
        ref={tooltipRef}
        aria-hidden
        sx={{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 2,
          whiteSpace: 'nowrap',
          backgroundColor: 'background.paper',
          color: 'text.primary',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          boxShadow: theme.shadows[4],
          px: 1.25,
          py: 0.75,
          fontSize: '0.8rem',
        }}
      >
        <Box component="span" sx={{ fontWeight: 600, display: 'block' }}>
          {slotLabel(day, hour)}
        </Box>
        {t('tooltip.posts', { count: posts })}
        {posts > 0 && ` · ${t('tooltip.average', { value: formatAverage(grid.engagement[day][hour] / posts) })}`}
        {metric === 'engagement' && posts > 0 && posts < MIN_POSTS_FOR_AVERAGE && (
          <Box component="span" sx={{ display: 'block', opacity: 0.7 }}>
            {t('tooltip.tooFew')}
          </Box>
        )}
      </Box>
    );
  };

  const renderInsightTile = (label: string, value: string, children?: React.ReactNode) => (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        px: 1.75,
        py: 1.5,
        flex: { xs: '1 1 180px', md: 'none' },
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: '1.6rem',
          fontWeight: 700,
          lineHeight: 1.3,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {value}
      </Typography>
      {children}
    </Box>
  );

  const subtitleKey = metric === 'posts' ? 'subtitle.posts' : 'subtitle.engagement';

  return (
    <EnhancedPaper sx={{ p: 2, opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}
      >
        <Title>{t('title')}</Title>
        {hasData && (
          <ToggleButtonGroup
            value={metric}
            exclusive
            size="small"
            onChange={handleMetricChange}
            aria-label={t('metric.ariaLabel')}
          >
            <ToggleButton value="posts" sx={{ px: 2, fontWeight: 500 }}>
              {t('metric.posts')}
            </ToggleButton>
            <ToggleButton value="engagement" sx={{ px: 2, fontWeight: 500 }}>
              {t('metric.engagement')}
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {!hasData ? (
        <Typography sx={{ textAlign: 'center', py: 4, opacity: 0.8 }}>{t('empty')}</Typography>
      ) : (
        <>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 2 }}>
            {t(subtitleKey, { timezone, count: insights.totalPosts })}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
              gap: 3,
            }}
          >
            <Box ref={wrapperRef} sx={{ position: 'relative' }} onMouseLeave={() => setActive(null)}>
              <Box
                role="grid"
                aria-label={t('gridLabel')}
                onBlur={(event: React.FocusEvent<HTMLDivElement>) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(null);
                }}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '34px repeat(7, minmax(0, 1fr))', sm: '44px repeat(7, minmax(0, 1fr))' },
                  gap: { xs: '2px', sm: '3px' },
                  '& [role="row"]': { display: 'contents' },
                }}
              >
                <Box role="row">
                  <Box role="presentation" />
                  {DAYS.map((day) => (
                    <Box
                      key={day}
                      role="columnheader"
                      aria-label={longDays[day]}
                      sx={{
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'text.secondary',
                        pb: '2px',
                        opacity: day >= 5 ? 0.75 : 1,
                        overflow: 'hidden',
                        textOverflow: 'clip',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shortDays[day]}
                    </Box>
                  ))}
                </Box>
                {HOURS.map((hour) => (
                  <Box role="row" key={hour}>
                    <Box
                      role="rowheader"
                      aria-label={formatHour(hour)}
                      sx={{
                        fontSize: '0.7rem',
                        color: 'text.secondary',
                        textAlign: 'right',
                        pr: '6px',
                        lineHeight: { xs: '13px', sm: '15px' },
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {hour % 3 === 0 ? formatHour(hour) : ''}
                    </Box>
                    {DAYS.map((day) => renderCell(day, hour))}
                  </Box>
                ))}
                <Box role="row">
                  <Box
                    role="rowheader"
                    aria-label={t('totals.label')}
                    sx={{
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      textAlign: 'right',
                      pr: '6px',
                      alignSelf: 'end',
                    }}
                  >
                    Σ
                  </Box>
                  {DAYS.map((day) => {
                    const label = t('totals.day', { day: longDays[day], count: insights.dayTotals[day] });
                    return (
                      <Box
                        key={day}
                        role="gridcell"
                        aria-label={label}
                        title={label}
                        sx={{ height: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                      >
                        <Box
                          sx={{
                            width: '60%',
                            height: `${Math.round(4 + (24 * insights.dayTotals[day]) / dayTotalsMax)}px`,
                            backgroundColor: 'secondary.light',
                            borderRadius: '2px 2px 0 0',
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mt: 1.5,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  flexWrap: 'wrap',
                }}
              >
                <span>{metric === 'posts' ? '0' : t('legend.low')}</span>
                <Box
                  sx={{
                    width: 120,
                    height: 10,
                    borderRadius: '3px',
                    background: `linear-gradient(90deg, ${rampColor(theme, 0.12)}, ${rampColor(theme, 1)})`,
                  }}
                />
                <span>
                  {metric === 'posts'
                    ? t('legend.maxPosts', { count: max })
                    : t('legend.high', { value: formatAverage(max) })}
                </span>
                {metric === 'engagement' && (
                  <>
                    <Box
                      sx={{
                        width: 14,
                        height: 10,
                        ml: 1.5,
                        borderRadius: '2px',
                        backgroundColor: emptyCellColor(theme),
                        backgroundImage: hatchPattern(theme),
                      }}
                    />
                    <span>{t('legend.tooFew', { count: MIN_POSTS_FOR_AVERAGE })}</span>
                  </>
                )}
              </Box>
              {renderTooltip()}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, flexWrap: 'wrap', gap: 2 }}>
              {renderInsightTile(
                t('insights.chronotype.label'),
                t(`insights.chronotype.${insights.chronotype}`),
                <>
                  <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden', mt: 1, mb: 0.5 }}>
                    {DAY_PARTS.map((part, index) => (
                      <Box key={part} sx={{ width: `${percentages[index]}%`, backgroundColor: splitColors[index] }} />
                    ))}
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      columnGap: 1,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                    }}
                  >
                    {DAY_PARTS.map((part, index) => (
                      <span key={part}>{t(`insights.chronotype.${part}`, { percent: percentages[index] })}</span>
                    ))}
                  </Box>
                </>,
              )}
              {renderInsightTile(
                t('insights.usualSlot.label'),
                insights.usualSlot
                  ? `${shortDays[insights.usualSlot.day]} ${formatHour(insights.usualSlot.hour)}`
                  : '–',
                insights.busiestDay && (
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {t('insights.usualSlot.busiestDay', {
                      day: longDays[insights.busiestDay.day],
                      count: insights.busiestDay.posts,
                    })}
                  </Typography>
                ),
              )}
              {renderInsightTile(
                t('insights.bestTime.label'),
                insights.bestSlot ? `${shortDays[insights.bestSlot.day]} ${formatHour(insights.bestSlot.hour)}` : '–',
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  {insights.bestSlot
                    ? t('insights.bestTime.average', { value: formatAverage(insights.bestSlot.average) })
                    : t('insights.bestTime.notEnoughData', { count: MIN_POSTS_FOR_AVERAGE })}
                </Typography>,
              )}
            </Box>
          </Box>
        </>
      )}
    </EnhancedPaper>
  );
};

export default PostingTimes;

export const PRICE_RULE_REDIS_KEYS = {
  DETAIL: (id: number) => `price_rules:detail:${id}`,
  LIST: (
    cineplexId: number | string = 'all',
    projectionType: string = 'all',
    dayType: string = 'all',
    page: number = 1,
    limit: number = 10,
  ) =>
    `price_rules:list:c=${cineplexId}:p=${projectionType}:d=${dayType}:p=${page}:l=${limit}`,
  PATTERN_ALL: 'price_rules:*',
};

export const PRICE_RULE_REDIS_TTL = {
  DETAIL_SECONDS: 43200, // 12 giờ = 43200 giây
  LIST_SECONDS: 43200, // 12 giờ = 43200 giây
};

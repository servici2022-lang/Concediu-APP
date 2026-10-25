/**
 * Paginare din query string, mereu în limite sigure: page >= 1, 1 <= limit <= maxLimit.
 * Fără ea, `page=0` dădea skip negativ (500), iar `limit=0` sau `limit=100000` întorcea tot.
 */
const parsePagination = (query, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

const paginationMeta = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

/** Textul căutat, tratat literal într-un $regex (altfel `(` dă 500, iar un model rău blochează serverul). */
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { parsePagination, paginationMeta, escapeRegex };

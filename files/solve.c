/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   solve.c                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: login <login@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/12 12:00:00 by login             #+#    #+#             */
/*   Updated: 2026/10/12 12:00:00 by login            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "bsq.h"

static size_t	min3(size_t a, size_t b, size_t c)
{
	if (b < a)
		a = b;
	if (c < a)
		a = c;
	return (a);
}

/*
** dp[i][j] = side of the biggest square whose BOTTOM-RIGHT corner is (i, j)
**   obstacle          -> 0
**   first row/column  -> 1
**   otherwise         -> 1 + min(top, left, top-left)
*/
static size_t	cell_val(t_map *m, size_t *dp, size_t i, size_t j)
{
	if (m->data[m->start + i * (m->w + 1) + j] == m->o)
		return (0);
	if (i == 0 || j == 0)
		return (1);
	return (min3(dp[(i - 1) * m->w + j], dp[i * m->w + j - 1],
			dp[(i - 1) * m->w + j - 1]) + 1);
}

static void	build(t_map *m, size_t *dp, t_best *b)
{
	size_t	i;
	size_t	j;

	i = 0;
	while (i < (size_t)m->n)
	{
		j = 0;
		while (j < m->w)
		{
			dp[i * m->w + j] = cell_val(m, dp, i, j);
			if (dp[i * m->w + j] > b->size)
			{
				b->size = dp[i * m->w + j];
				b->row = i;
				b->col = j;
			}
			j++;
		}
		i++;
	}
}

static void	fill(t_map *m, t_best *b)
{
	size_t	i;
	size_t	j;
	size_t	base;

	base = m->start + b->row * (m->w + 1) + b->col;
	i = 0;
	while (i < b->size)
	{
		j = 0;
		while (j < b->size)
		{
			m->data[base - i * (m->w + 1) - j] = m->f;
			j++;
		}
		i++;
	}
}

int	solve(t_map *m)
{
	size_t	*dp;
	t_best	best;

	if ((size_t)m->n > (size_t)-1 / sizeof(size_t) / m->w)
		return (0);
	dp = malloc(sizeof(size_t) * m->n * m->w);
	if (!dp)
		return (0);
	best.size = 0;
	best.row = 0;
	best.col = 0;
	build(m, dp, &best);
	free(dp);
	fill(m, &best);
	return (1);
}
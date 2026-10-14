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

static size_t	dfs(t_map *m, size_t *dp, size_t r, size_t c)
{
	size_t	down;
	size_t	right;
	size_t	diag;
	size_t	idx;

	if (r >= (size_t)m->n || c >= m->w)
		return (0);
	idx = r * m->w + c;
	if (dp[idx] != UNSET)
		return (dp[idx]);
	down = dfs(m, dp, r + 1, c);
	right = dfs(m, dp, r, c + 1);
	diag = dfs(m, dp, r + 1, c + 1);
	dp[idx] = 0;
	if (m->data[m->start + r * (m->w + 1) + c] != m->o)
		dp[idx] = 1 + min3(down, right, diag);
	return (dp[idx]);
}

static void	find_best(t_map *m, size_t *dp, t_best *b)
{
	size_t	r;
	size_t	c;

	r = 0;
	while (r < (size_t)m->n)
	{
		c = 0;
		while (c < m->w)
		{
			if (dp[r * m->w + c] > b->size)
			{
				b->size = dp[r * m->w + c];
				b->row = r;
				b->col = c;
			}
			c++;
		}
		r++;
	}
}

/* (row, col) is now the TOP-LEFT corner, so we fill down and right. */
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
			m->data[base + i * (m->w + 1) + j] = m->f;
			j++;
		}
		i++;
	}
}

int	solve(t_map *m)
{
	size_t	*dp;
	size_t	i;
	t_best	best;

	if ((size_t)m->n > (size_t)-1 / sizeof(size_t) / m->w)
		return (0);
	dp = malloc(sizeof(size_t) * m->n * m->w);
	if (!dp)
		return (0);
	i = 0;
	while (i < (size_t)m->n * m->w)
		dp[i++] = UNSET;
	dfs(m, dp, 0, 0);
	best.size = 0;
	best.row = 0;
	best.col = 0;
	find_best(m, dp, &best);
	free(dp);
	fill(m, &best);
	return (1);
}
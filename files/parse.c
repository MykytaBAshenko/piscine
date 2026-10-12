/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   parse.c                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: login <login@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/12 12:00:00 by login             #+#    #+#             */
/*   Updated: 2026/10/12 12:00:00 by login            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "bsq.h"

static int	is_print(char c)
{
	return (c >= 32 && c <= 126);
}

static int	parse_n(t_map *m, size_t h)
{
	size_t	i;

	m->n = 0;
	i = 0;
	while (i < h - 3)
	{
		if (m->data[i] < '0' || m->data[i] > '9')
			return (0);
		m->n = m->n * 10 + (m->data[i] - '0');
		if (m->n > INT_MAX_V)
			return (0);
		i++;
	}
	return (m->n > 0);
}

int	parse_header(t_map *m)
{
	size_t	h;

	h = 0;
	while (h < m->len && m->data[h] != '\n')
		h++;
	if (h >= m->len || h < 4)
		return (0);
	m->e = m->data[h - 3];
	m->o = m->data[h - 2];
	m->f = m->data[h - 1];
	if (m->e == m->o || m->e == m->f || m->o == m->f)
		return (0);
	if (!is_print(m->e) || !is_print(m->o) || !is_print(m->f))
		return (0);
	m->start = h + 1;
	return (parse_n(m, h));
}

static int	check_line(t_map *m, size_t pos)
{
	size_t	i;

	if (pos + m->w >= m->len || m->data[pos + m->w] != '\n')
		return (0);
	i = 0;
	while (i < m->w)
	{
		if (m->data[pos + i] != m->e && m->data[pos + i] != m->o)
			return (0);
		i++;
	}
	return (1);
}

int	parse_body(t_map *m)
{
	size_t	pos;
	long	row;

	pos = m->start;
	m->w = 0;
	while (pos + m->w < m->len && m->data[pos + m->w] != '\n')
		m->w++;
	if (m->w == 0)
		return (0);
	row = 0;
	while (row < m->n)
	{
		if (!check_line(m, pos))
			return (0);
		pos += m->w + 1;
		row++;
	}
	return (pos == m->len);
}

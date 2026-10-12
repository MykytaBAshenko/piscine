/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   io.c                                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: login <login@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/12 12:00:00 by login             #+#    #+#             */
/*   Updated: 2026/10/12 12:00:00 by login            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "bsq.h"

void	put_str(const char *s, size_t n)
{
	ssize_t	r;

	while (n > 0)
	{
		r = write(1, s, n);
		if (r <= 0)
			return ;
		s += r;
		n -= r;
	}
}

static char	*grow(char *buf, size_t len, size_t cap)
{
	char	*tmp;
	size_t	i;

	tmp = malloc(cap * 2 + 1);
	if (!tmp)
	{
		free(buf);
		return (NULL);
	}
	i = 0;
	while (i < len)
	{
		tmp[i] = buf[i];
		i++;
	}
	free(buf);
	return (tmp);
}

char	*read_all(int fd, size_t *len)
{
	size_t	cap;
	char	*buf;
	ssize_t	r;

	cap = BUF_SIZE;
	*len = 0;
	buf = malloc(cap + 1);
	r = 1;
	while (buf && r > 0)
	{
		r = read(fd, buf + *len, cap - *len);
		if (r > 0)
			*len += r;
		if (r > 0 && *len == cap)
		{
			buf = grow(buf, *len, cap);
			cap *= 2;
		}
	}
	if (!buf || r < 0)
		return (free(buf), NULL);
	buf[*len] = '\0';
	return (buf);
}

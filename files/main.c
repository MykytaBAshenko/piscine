/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.c                                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: login <login@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/12 12:00:00 by login             #+#    #+#             */
/*   Updated: 2026/10/12 12:00:00 by login            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "bsq.h"

static void	process(int fd)
{
	t_map	m;

	m.data = NULL;
	if (fd >= 0)
		m.data = read_all(fd, &m.len);
	if (m.data && parse_header(&m) && parse_body(&m) && solve(&m))
		put_str(m.data + m.start, m.len - m.start);
	else
		put_str("map error\n", 10);
	free(m.data);
}

int	main(int argc, char **argv)
{
	int	i;
	int	fd;

	if (argc == 1)
	{
		process(0);
		return (0);
	}
	i = 1;
	while (i < argc)
	{
		if (i > 1)
			put_str("\n", 1);
		fd = open(argv[i], O_RDONLY);
		process(fd);
		if (fd >= 0)
			close(fd);
		i++;
	}
	return (0);
}

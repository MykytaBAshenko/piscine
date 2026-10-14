/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   bsq.h                                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: login <login@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/12 12:00:00 by login             #+#    #+#             */
/*   Updated: 2026/10/12 12:00:00 by login            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#ifndef BSQ_H
# define BSQ_H
 
# include <fcntl.h>
# include <stdlib.h>
# include <unistd.h>
 
# define BUF_SIZE 4096
# define INT_MAX_V 2147483647L
# define UNSET ((size_t)-1)
 
typedef struct s_map
{
	char	*data;
	size_t	len;
	long	n;
	char	e;
	char	o;
	char	f;
	size_t	start;
	size_t	w;
}	t_map;
 
typedef struct s_best
{
	size_t	size;
	size_t	row;
	size_t	col;
}	t_best;
 
void	put_str(const char *s, size_t n);
char	*read_all(int fd, size_t *len);
int		parse_header(t_map *m);
int		parse_body(t_map *m);
int		solve(t_map *m);
 
#endif
 
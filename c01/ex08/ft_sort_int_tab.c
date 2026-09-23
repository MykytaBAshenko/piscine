/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ft_sort_int_tab.c                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mbashenk                                   +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/09/24 00:56:56 by mbashenk          #+#    #+#             */
/*   Updated: 2026/09/24 01:17:26 by mbashenk         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include <stdio.h>

void	ft_sort_int_tab(int *tab, int size)
{
	int y = 0;
	int x = 1;
	while (y < size - 1)
	{
		if (tab[y] > tab[x])
		{
			int temp = tab[y];
			tab[y] = tab[x];
			tab[x] = temp;
			y = 0;
			x = 1;
		}
		else
		{
			if (x < size - 1)
			{
				x++;
			} else
			{
				y++;
				x = y + 1;
			}
		}
	}
}
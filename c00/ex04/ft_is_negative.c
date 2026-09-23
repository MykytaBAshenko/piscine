/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ft_is_negative.c                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mbashenk                                   +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/09/23 16:04:29 by mbashenk          #+#    #+#             */
/*   Updated: 2026/09/24 00:57:25 by mbashenk         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include <unistd.h>

int	ft_putchar(char letter)
{
	write( 1, &letter, 1 );

	return 0;
}

void	ft_is_negative(int n)
{
	if (n>=0)
	{
		ft_putchar('P');
	}
	else
	{
		ft_putchar('N');
	}
}
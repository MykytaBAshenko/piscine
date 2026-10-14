#include <unistd.h>

void	ft_putchar(char c)
{
	write(1, &c, 1);
}

int	main(int argc, char **argv)
{
	int	i;
	int	j;

	// The counter starts in 1 to skip the program name
	i = 1;

	// while the counter is less than the amount of parameters
	while (i < argc)
	{
		j = 0;
		// This loop will print all parameters followed by a new line
		while (argv[i][j])
		{
			ft_putchar(argv[i][j]);
			j++;
		}
		ft_putchar('\n');
		i++;
	}
}
#include "rush.h"

static int	valid_number(char *s)
{
	int	i;

	if (!s[0])
		return (0);
	i = 0;
	while (s[i])
	{
		if (s[i] < '0' || s[i] > '9')
			return (0);
		i++;
	}
	return (1);
}

static int	print_error(char *msg)
{
	ft_putstr(msg);
	return (1);
}

int	main(int argc, char **argv)
{
	t_dict	d;
	char	*nb;
	char	*path;
	int		ret;

	if (argc != 2 && argc != 3)
		return (print_error("Error\n"));
	nb = argv[argc - 1];
	path = "numbers.dict";
	if (argc == 3)
		path = argv[1];
	if (!valid_number(nb))
		return (print_error("Error\n"));
	while (nb[0] == '0' && nb[1])
		nb++;
	if (parse_dict(path, &d) < 0)
		return (print_error("Dict Error\n"));
	ret = convert(&d, nb);
	free_dict(&d);
	if (ret < 0)
		return (print_error("Dict Error\n"));
	return (0);
}
